"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowUpDown } from "lucide-react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";

type DatasetRow = {
  admin_pcode: string;
  admin_name: string | null;
  raw_value: number | null;
  score_db: number | null;
};

type NormParams = {
  thresholds?: number[];
  winsor_lo?: number;
  winsor_hi?: number;
  bands?: any[];
};

type DatasetMeta = {
  metric: string;
  pillar: string;
  norm_method: string;
  norm_params?: NormParams | null;
  higher_is_better?: boolean;
  source_note: string;
  admin_level?: string | null;
};

type Props = {
  open: boolean;
  dataset: DatasetMeta | null;
  instanceId: string;
  onClose: () => void;
};

type FilterMode = "both" | "raw" | "score";
type SortKey = "admin_pcode" | "admin_name" | "raw_value" | "score_value";
type SortDir = "asc" | "desc" | null;

// ---------- Helpers ----------
function fmt(n: number | null | undefined, d = 2) {
  if (n === null || n === undefined || Number.isNaN(n)) return "NaN";
  return Number(n).toLocaleString(undefined, { maximumFractionDigits: d });
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

function percentile(sortedVals: number[], p: number) {
  if (sortedVals.length === 0) return NaN;
  const idx = Math.floor(p * (sortedVals.length - 1));
  return sortedVals[idx];
}

function linearScaleTo1to5(x: number, a: number, b: number, higherIsWorse: boolean) {
  if (!Number.isFinite(x) || !Number.isFinite(a) || !Number.isFinite(b) || a === b) return NaN;
  const t = clamp((x - a) / (b - a), 0, 1);
  return higherIsWorse ? 1 + 4 * t : 5 - 4 * t;
}

function bandIndex(x: number, thresholds: number[]) {
  let i = 0;
  while (i < thresholds.length && x > thresholds[i]) i++;
  return i + 1;
}

function bandToScore(band: number, bands: number, higherIsWorse: boolean) {
  return higherIsWorse ? band : (bands + 1) - band;
}

function computeScores(rows: DatasetRow[], meta: DatasetMeta): number[] {
  const method = (meta.norm_method || "").toLowerCase();
  const higherIsWorse = !!meta.higher_is_better;
  const vals = rows.map(r => r.raw_value).filter((v): v is number => v !== null && Number.isFinite(v));
  if (vals.length === 0) return rows.map(() => NaN);
  const sorted = [...vals].sort((a, b) => a - b);
  const winsorLo = meta.norm_params?.winsor_lo ?? 0.05;
  const winsorHi = meta.norm_params?.winsor_hi ?? 0.95;

  if (method.includes("winsor")) {
    const a = percentile(sorted, winsorLo);
    const b = percentile(sorted, winsorHi);
    return rows.map(r => {
      const x = r.raw_value;
      if (x === null || !Number.isFinite(x)) return NaN;
      const w = clamp(x, a, b);
      return linearScaleTo1to5(w, a, b, higherIsWorse);
    });
  }

  if (method.includes("threshold")) {
    const thresholds = [...(meta.norm_params?.thresholds || [])].sort((a, b) => a - b);
    const bandsCount = thresholds.length + 1;
    return rows.map(r => {
      const x = r.raw_value;
      if (x === null || !Number.isFinite(x)) return NaN;
      const b = bandIndex(x, thresholds);
      return bandToScore(b, bandsCount, higherIsWorse);
    });
  }

  if (method.includes("linear_1to4_to_1to5")) {
    return rows.map(r => {
      const x = r.raw_value;
      if (x === null || !Number.isFinite(x)) return NaN;
      const clamped = clamp(x, 1, 4);
      const y = higherIsWorse
        ? 1 + (clamped - 1) * (4 / 3)
        : 5 - (clamped - 1) * (4 / 3);
      return y;
    });
  }

  return rows.map(() => NaN);
}

export default function DataPreviewModal({ open, dataset, instanceId, onClose }: Props) {
  const [rows, setRows] = useState<DatasetRow[]>([]);
  const [filter, setFilter] = useState<FilterMode>("both");
  const [loading, setLoading] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("admin_pcode");
  const [sortDir, setSortDir] = useState<SortDir>(null);

  useEffect(() => {
    if (!open || !dataset) return;
    (async () => {
      setLoading(true);
      try {
        const { data } = await supabase
          .rpc("get_dataset_preview", {
            p_metric: dataset.metric,
            p_source_note: dataset.source_note,
            p_instance_id: instanceId,
          })
          .select("*");

        const normalized: DatasetRow[] = (data || []).map((r: any) => ({
          admin_pcode: r.admin_pcode ?? r.pcode ?? "",
          admin_name: r.admin_name ?? r.name ?? null,
          raw_value: r.raw_value ?? r.value ?? null,
          score_db: r.score ?? r.score_1to5 ?? null,
        }));
        setRows(normalized);
      } catch {
        setRows([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [open, dataset, instanceId]);

  const liveScores = useMemo(() => {
    if (!dataset || rows.length === 0) return [];
    return computeScores(rows, dataset);
  }, [rows, dataset]);

  const renderedRows = useMemo(() => {
    const merged = rows.map((r, i) => ({
      admin_pcode: r.admin_pcode,
      admin_name: r.admin_name ?? "",
      raw_value: r.raw_value,
      score_value: r.score_db ?? liveScores[i],
    }));

    const filtered = merged.filter(rec => {
      if (filter === "raw") return rec.raw_value !== null;
      if (filter === "score") return rec.score_value !== null;
      return true;
    });

    if (sortDir) {
      return [...filtered].sort((a, b) => {
        const av = a[sortKey] ?? "";
        const bv = b[sortKey] ?? "";
        if (typeof av === "number" && typeof bv === "number") {
          return sortDir === "asc" ? av - bv : bv - av;
        }
        return sortDir === "asc"
          ? String(av).localeCompare(String(bv))
          : String(bv).localeCompare(String(av));
      });
    }

    return filtered;
  }, [rows, liveScores, filter, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey !== key) {
      setSortKey(key);
      setSortDir("asc");
    } else {
      setSortDir(prev => (prev === "asc" ? "desc" : prev === "desc" ? null : "asc"));
    }
  };

  if (!open || !dataset) return null;
  const showing = renderedRows.length;

  return (
    <div className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-4 overflow-auto">
      <div className="w-full max-w-6xl bg-white rounded-lg shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-4 py-3 bg-[color:var(--gsc-green)] text-white flex items-center justify-between">
          <h3 className="font-semibold">
            Data Preview — {dataset.metric}
          </h3>
          <div className="text-sm opacity-90">
            Showing {showing} rows
          </div>
        </div>

        {/* Body */}
        <div className="p-4 flex-1 overflow-hidden flex flex-col">
          <div className="flex items-center gap-3 mb-3">
            <label className="text-sm text-gray-600">Filter:</label>
            <select
              value={filter}
              onChange={(e) => setFilter(e.currentTarget.value as FilterMode)}
              className="border rounded px-2 py-1 text-sm"
            >
              <option value="both">Both</option>
              <option value="raw">Raw only</option>
              <option value="score">Score only</option>
            </select>
            <div className="ml-auto text-xs text-gray-500 truncate">
              Method: <span className="font-medium">{dataset.norm_method}</span>{" "}
              · Direction:{" "}
              <span className="font-medium">
                {dataset.higher_is_better ? "↑ higher = worse" : "↓ lower = worse"}
              </span>{" "}
              · Params:{" "}
              <span className="font-mono">
                {JSON.stringify(dataset.norm_params || {})}
              </span>
            </div>
          </div>

          <div className="overflow-auto border rounded flex-1 max-h-[70vh]">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  {[
                    { key: "admin_pcode", label: "Admin PCode" },
                    { key: "admin_name", label: "Admin Name" },
                    ...(filter !== "score" ? [{ key: "raw_value", label: "Raw Value" }] : []),
                    ...(filter !== "raw" ? [{ key: "score_value", label: "Score (1–5)" }] : []),
                  ].map((col) => (
                    <th
                      key={col.key}
                      onClick={() => toggleSort(col.key as SortKey)}
                      className="px-3 py-2 text-left whitespace-nowrap cursor-pointer select-none hover:bg-gray-100"
                    >
                      <div className="flex items-center gap-1">
                        {col.label}
                        {sortKey === col.key && sortDir && (
                          <ArrowUpDown
                            className={`h-3 w-3 transition-transform ${
                              sortDir === "desc" ? "rotate-180" : ""
                            }`}
                          />
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-gray-400">
                      Loading…
                    </td>
                  </tr>
                ) : renderedRows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-gray-400">
                      No rows found.
                    </td>
                  </tr>
                ) : (
                  renderedRows.map((r) => (
                    <tr key={r.admin_pcode} className="border-t hover:bg-gray-50">
                      <td className="px-3 py-2">{r.admin_pcode}</td>
                      <td className="px-3 py-2">{r.admin_name}</td>
                      {filter !== "score" && (
                        <td className="px-3 py-2 text-right tabular-nums">
                          {fmt(r.raw_value, 2)}
                        </td>
                      )}
                      {filter !== "raw" && (
                        <td className="px-3 py-2 text-right tabular-nums">
                          {fmt(r.score_value, 3)}
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t bg-gray-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-sm rounded border bg-white hover:bg-gray-100"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

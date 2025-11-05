"use client";

import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";

// ---------- Types ----------
type DatasetRow = {
  admin_pcode: string;
  admin_name: string | null;
  raw_value: number | null;
  // score from DB (when already applied/persisted)
  score_db: number | null;
};

type NormParams = {
  thresholds?: number[];        // for threshold_* methods
  winsor_lo?: number;           // optional override (0..1)
  winsor_hi?: number;           // optional override (0..1)
};

type DatasetMeta = {
  metric: string;
  pillar: string;
  norm_method: string;          // e.g. winsor_5_95 | threshold_categorical | linear_1to4_to_1to5
  norm_params?: NormParams | null;
  higher_is_better?: boolean;   // true => higher means worse vulnerability (maps to higher score)
  source_note: string;
  admin_level?: string | null;
};

type Props = {
  open: boolean;
  dataset: DatasetMeta | null;
  instanceId: string;
  onClose: () => void;
};

// ---------- Helpers ----------
function fmt(n: number | null | undefined, d = 2) {
  if (n === null || n === undefined || Number.isNaN(n)) return "NaN";
  // drop decimals for big integers
  if (Math.abs(n) >= 1000 && Number.isInteger(n)) return n.toLocaleString();
  return Number(n).toLocaleString(undefined, { maximumFractionDigits: d });
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

// Compute percentiles (simple nearest-rank over sorted numeric array)
function percentile(sortedVals: number[], p: number) {
  if (sortedVals.length === 0) return NaN;
  if (p <= 0) return sortedVals[0];
  if (p >= 1) return sortedVals[sortedVals.length - 1];
  const idx = Math.floor(p * (sortedVals.length - 1));
  return sortedVals[idx];
}

// Map [a..b] to [1..5] or [5..1] depending on direction
function linearScaleTo1to5(x: number, a: number, b: number, higherIsWorse: boolean) {
  if (!Number.isFinite(x) || !Number.isFinite(a) || !Number.isFinite(b) || a === b) return NaN;
  const t = clamp((x - a) / (b - a), 0, 1); // 0..1
  const y = higherIsWorse ? 1 + 4 * t : 5 - 4 * t; // higher worse => up to 5
  return y;
}

// Given thresholds [t1, t2, ...] produce band index 1..(k+1) where band k+1 is highest range
function bandIndex(x: number, thresholds: number[]) {
  let i = 0;
  while (i < thresholds.length && x > thresholds[i]) i++;
  return i + 1; // 1-based
}

// Convert band index to score (1..5 or compressed to #bands)
function bandToScore(band: number, bands: number, higherIsWorse: boolean) {
  // Map bands to 1..bands. If bands<5 we keep native scale (e.g., 3-class => 1..3).
  // If you ever need to stretch to 1..5 visually, do it here.
  if (higherIsWorse) return band;               // higher band => higher score (worse)
  return (bands + 1) - band;                    // invert
}

// Apply client-side score simulation for a dataset row set
function computeScores(
  rows: DatasetRow[],
  meta: DatasetMeta
): number[] {
  const method = (meta.norm_method || "").toLowerCase();
  const higherIsWorse = !!meta.higher_is_better; // naming kept from earlier UI text

  const vals = rows
    .map(r => r.raw_value)
    .filter((v): v is number => v !== null && Number.isFinite(v));

  if (vals.length === 0) return rows.map(() => NaN);

  // Pre-sort once for percentile ops
  const sorted = [...vals].sort((a, b) => a - b);

  // Winsor default bounds (5th .. 95th)
  const winsorLo = meta.norm_params?.winsor_lo ?? 0.05;
  const winsorHi = meta.norm_params?.winsor_hi ?? 0.95;

  if (method === "winsor_5_95" || method === "winsor" || method === "winsorized") {
    const a = percentile(sorted, winsorLo);
    const b = percentile(sorted, winsorHi);
    return rows.map(r => {
      const x = r.raw_value;
      if (x === null || !Number.isFinite(x)) return NaN;
      // winsorize to a..b before scaling
      const w = clamp(x, a, b);
      return linearScaleTo1to5(w, a, b, higherIsWorse);
    });
  }

  if (method === "threshold_categorical" || method === "threshold_bands" || method === "thresholds") {
    const thresholds = [...(meta.norm_params?.thresholds || [])].sort((a, b) => a - b);
    const bandsCount = thresholds.length + 1;
    return rows.map(r => {
      const x = r.raw_value;
      if (x === null || !Number.isFinite(x)) return NaN;
      const b = bandIndex(x, thresholds);
      return bandToScore(b, bandsCount, higherIsWorse);
    });
  }

  if (method === "linear_1to4_to_1to5") {
    // already 1..4; project to 1..5 linearly with direction
    // assume raw_value in [1..4]; if not, clamp
    return rows.map(r => {
      const x = r.raw_value;
      if (x === null || !Number.isFinite(x)) return NaN;
      const clamped = clamp(x, 1, 4);
      const y = higherIsWorse
        ? 1 + (clamped - 1) * (4 / 3) // 1..4 -> 1..5
        : 5 - (clamped - 1) * (4 / 3); // inverted
      return y;
    });
  }

  // Fallback: no-op
  return rows.map(() => NaN);
}

// Filter mode
type FilterMode = "both" | "raw" | "score";

export default function DataPreviewModal({ open, dataset, instanceId, onClose }: Props) {
  const [rows, setRows] = useState<DatasetRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<FilterMode>("both");

  // Load preview from SQL (raw + any existing persisted score if present)
  useEffect(() => {
    if (!open || !dataset) return;

    (async () => {
      setLoading(true);
      try {
        // Prefer the existing SQL function that already powers your current preview workflow.
        // It should return: admin_pcode, admin_name, raw_value, score (if already applied)
        // We alias score -> score_db to keep it separate from our client-side live calc.
        const { data, error } = await supabase
          .rpc("get_dataset_preview", {
            p_metric: dataset.metric,
            p_source_note: dataset.source_note,
            p_filter: "both",      // server will ignore if not supported; we compute client-side anyway
            p_instance_id: instanceId, // optional; function may ignore this for raw datasets
          })
          .select("*");

        if (error) throw error;

        // Normalize shape – support both snake_case and possible column aliases
        const normalized: DatasetRow[] = (data || []).map((r: any) => ({
          admin_pcode: r.admin_pcode ?? r.pcode ?? r.adminCode ?? "",
          admin_name: r.admin_name ?? r.name ?? null,
          raw_value: r.raw_value ?? r.value ?? null,
          score_db: r.score ?? r.score_1to5 ?? null,
        }));

        setRows(normalized);
      } catch (e) {
        // As a fallback, try to read from the instance results (if any),
        // so at least something renders even if the function name changes.
        try {
          const { data: instData } = await supabase
            .from("unified_category_results")
            .select("admin_pcode, raw_value, score")
            .eq("category", dataset.pillar)
            .eq("metric", dataset.metric)
            .eq("instance_id", instanceId)
            .limit(1000);

          const fallback: DatasetRow[] = (instData || []).map((r: any) => ({
            admin_pcode: r.admin_pcode,
            admin_name: null,
            raw_value: r.raw_value,
            score_db: r.score,
          }));

          setRows(fallback);
        } catch {
          setRows([]);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [open, dataset, instanceId]);

  // Enrich with names if missing (lightweight pass — optional)
  const [nameMap, setNameMap] = useState<Record<string, string>>({});
  useEffect(() => {
    (async () => {
      if (!open || rows.length === 0) return;
      // Collect missing pcodes
      const missing = rows.filter(r => !r.admin_name).map(r => r.admin_pcode);
      if (missing.length === 0) return;

      // Pull from admin_units (fast batch in)
      const { data } = await supabase
        .from("admin_units")
        .select("pcode, name")
        .in("pcode", Array.from(new Set(missing)).slice(0, 1000));

      const map: Record<string, string> = {};
      (data || []).forEach((r: any) => (map[r.pcode] = r.name));
      setNameMap(map);
    })();
  }, [open, rows]);

  // Live score simulation (client-side) — only when we have raw values
  const liveScores: number[] = useMemo(() => {
    if (!dataset || rows.length === 0) return [];
    return computeScores(rows, dataset);
  }, [rows, dataset]);

  // Decide what to show per row
  const renderedRows = useMemo(() => {
    return rows
      .map((r, i) => {
        const scoreLive = liveScores[i];
        // Prefer DB score when present (means already applied/persisted) — but we still show live as preview if DB blank
        const scoreShow =
          filter === "raw" ? null :
          (Number.isFinite(r.score_db as number) ? (r.score_db as number) :
           Number.isFinite(scoreLive) ? scoreLive : null);

        const rawShow = filter === "score" ? null : r.raw_value;
        return {
          admin_pcode: r.admin_pcode,
          admin_name: r.admin_name ?? nameMap[r.admin_pcode] ?? "",
          raw_value: rawShow,
          score_value: scoreShow,
        };
      })
      .filter(rec => {
        if (filter === "raw") return rec.raw_value !== null;
        if (filter === "score") return rec.score_value !== null;
        return true;
      });
  }, [rows, liveScores, nameMap, filter]);

  if (!open || !dataset) return null;

  const title = `Data Preview — ${dataset.metric}`;
  const showing = renderedRows.length;

  return (
    <div className="fixed inset-0 z-[60] bg-black/40 flex items-start justify-center p-4">
      <div className="w-full max-w-5xl bg-white rounded-lg shadow-xl overflow-hidden">
        <div className="px-4 py-3 bg-[color:var(--gsc-green)] text-white flex items-center justify-between">
          <h3 className="font-semibold">{title}</h3>
          <div className="text-sm opacity-90">
            Showing {showing} {showing === 1 ? "row" : "rows"}
          </div>
        </div>

        <div className="p-4">
          {/* Controls */}
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
            <div className="ml-auto text-xs text-gray-500">
              Method: <span className="font-medium">{dataset.norm_method}</span>{" "}
              · Direction:{" "}
              <span className="font-medium">
                {dataset.higher_is_better ? "↑ higher = worse" : "↓ lower = worse"}
              </span>{" "}
              · Params: <span className="font-mono">{JSON.stringify(dataset.norm_params || {})}</span>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-auto border rounded">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left whitespace-nowrap">Admin PCode</th>
                  <th className="px-3 py-2 text-left whitespace-nowrap">Admin Name</th>
                  {filter !== "score" && (
                    <th className="px-3 py-2 text-right whitespace-nowrap">Raw Value</th>
                  )}
                  {filter !== "raw" && (
                    <th className="px-3 py-2 text-right whitespace-nowrap">Score (1–5)</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-8 text-center text-gray-400">
                      Loading…
                    </td>
                  </tr>
                ) : renderedRows.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-8 text-center text-gray-400">
                      No rows found.
                    </td>
                  </tr>
                ) : (
                  renderedRows.slice(0, 1000).map((r) => (
                    <tr key={r.admin_pcode} className="border-t">
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

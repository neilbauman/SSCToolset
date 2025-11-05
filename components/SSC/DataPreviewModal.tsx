"use client";

import { useEffect, useState, useMemo } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { X, ChevronDown } from "lucide-react";

type Props = {
  open: boolean;
  dataset: any;
  instanceId: string;
  onClose: () => void;
};

type DatasetRow = {
  admin_pcode: string;
  admin_name: string;
  raw_value: number | null;
  score: number | null;
};

export default function DataPreviewModal({
  open,
  dataset,
  instanceId,
  onClose,
}: Props) {
  const [rows, setRows] = useState<DatasetRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("both");
  const [limit, setLimit] = useState(100);
  const [sortKey, setSortKey] = useState<keyof DatasetRow>("admin_pcode");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const adminLevel = useMemo(() => {
    if (dataset?.norm_params?.admin_level) return dataset.norm_params.admin_level;
    const src = dataset?.source_note?.toUpperCase?.() || "";
    if (src.includes("ADM4")) return "ADM4";
    if (src.includes("ADM3")) return "ADM3";
    if (src.includes("ADM2")) return "ADM2";
    return "ADM?";
  }, [dataset]);

  const loadData = async () => {
    if (!dataset?.metric) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .rpc("load_dataset_instance_preview", {
          p_instance_id: instanceId,
          p_metric: dataset.metric,
          p_source_note: dataset.source_note,
        });

      if (error) throw error;
      setRows(data || []);
    } catch (err) {
      console.error(err);
      alert("Failed to load dataset preview.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) loadData();
  }, [open, dataset]);

  const filtered = useMemo(() => {
    if (filter === "raw") return rows.filter((r) => r.raw_value !== null);
    if (filter === "score") return rows.filter((r) => r.score !== null);
    return rows;
  }, [rows, filter]);

  const sorted = useMemo(() => {
    const sortedRows = [...filtered].sort((a, b) => {
      const av = a[sortKey] ?? "";
      const bv = b[sortKey] ?? "";
      if (typeof av === "number" && typeof bv === "number") {
        return sortDir === "asc" ? av - bv : bv - av;
      }
      return sortDir === "asc"
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av));
    });
    return sortedRows.slice(0, limit);
  }, [filtered, sortKey, sortDir, limit]);

  const toggleSort = (key: keyof DatasetRow) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white w-full max-w-6xl rounded-lg shadow-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex justify-between items-center bg-[color:var(--gsc-green)] text-white px-4 py-3">
          <h2 className="font-semibold text-lg">
            Data Preview — {dataset.metric} ({adminLevel})
          </h2>
          <button
            onClick={onClose}
            className="rounded p-1 hover:bg-white/20"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between px-4 py-2 border-b text-sm bg-gray-50">
          <div className="flex items-center gap-3">
            <label className="text-gray-600">
              Filter:{" "}
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="border rounded px-2 py-1 text-sm"
              >
                <option value="both">Both</option>
                <option value="raw">Raw Only</option>
                <option value="score">Score Only</option>
              </select>
            </label>
            <label className="text-gray-600">
              Rows:{" "}
              <select
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value))}
                className="border rounded px-2 py-1 text-sm"
              >
                {[10, 25, 50, 100, 500, 1000].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="text-gray-600 text-xs">
            Showing {sorted.length} of {rows.length} rows
          </div>
        </div>

        {/* Summary Line */}
        {dataset.norm_method && (
          <div className="px-4 py-2 border-b text-xs text-gray-600 bg-gray-50">
            <span className="font-medium">Method:</span>{" "}
            {dataset.norm_method.replace(/_/g, " ")} ·{" "}
            <span className="font-medium">Direction:</span>{" "}
            {dataset.higher_is_better ? "↑ higher = worse" : "↓ lower = worse"} ·{" "}
            <span className="font-medium">Params:</span>{" "}
            {JSON.stringify(dataset.norm_params || {})}
          </div>
        )}

        {/* Table */}
        <div className="overflow-auto flex-1">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-gray-500 text-sm">
              Loading…
            </div>
          ) : sorted.length ? (
            <table className="min-w-full text-sm border-collapse">
              <thead className="bg-gray-100 sticky top-0">
                <tr>
                  <Th
                    label="Admin PCode"
                    sortKey="admin_pcode"
                    sortDir={sortDir}
                    active={sortKey === "admin_pcode"}
                    onClick={() => toggleSort("admin_pcode")}
                  />
                  <Th
                    label="Admin Name"
                    sortKey="admin_name"
                    sortDir={sortDir}
                    active={sortKey === "admin_name"}
                    onClick={() => toggleSort("admin_name")}
                  />
                  <Th
                    label="Raw Value"
                    sortKey="raw_value"
                    sortDir={sortDir}
                    active={sortKey === "raw_value"}
                    onClick={() => toggleSort("raw_value")}
                  />
                  <Th
                    label="Score (1–5)"
                    sortKey="score"
                    sortDir={sortDir}
                    active={sortKey === "score"}
                    onClick={() => toggleSort("score")}
                  />
                </tr>
              </thead>
              <tbody>
                {sorted.map((r, i) => (
                  <tr
                    key={i}
                    className={
                      i % 2 === 0
                        ? "border-t bg-white"
                        : "border-t bg-gray-50"
                    }
                  >
                    <td className="p-2">{r.admin_pcode}</td>
                    <td className="p-2">{r.admin_name || "—"}</td>
                    <td className="p-2 text-right">
                      {r.raw_value != null
                        ? Number(r.raw_value).toLocaleString()
                        : "—"}
                    </td>
                    <td className="p-2 text-right">
                      {r.score != null ? r.score.toFixed(2) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="flex items-center justify-center py-10 text-gray-500 text-sm">
              No data available.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end px-4 py-2 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded border text-sm hover:bg-gray-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function Th({
  label,
  sortKey,
  active,
  sortDir,
  onClick,
}: {
  label: string;
  sortKey: keyof DatasetRow;
  active: boolean;
  sortDir: "asc" | "desc";
  onClick: () => void;
}) {
  return (
    <th
      className="p-2 text-left cursor-pointer select-none text-gray-700 font-medium border-b"
      onClick={onClick}
    >
      <div className="flex items-center gap-1">
        {label}
        {active && (
          <ChevronDown
            className={`h-3 w-3 transition-transform ${
              sortDir === "asc" ? "rotate-180" : ""
            }`}
          />
        )}
      </div>
    </th>
  );
}

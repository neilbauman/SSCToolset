"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { X } from "lucide-react";

type DatasetRow = {
  admin_pcode: string;
  admin_name: string;
  raw_val: number;
  score: number | null;
};

type DataPreviewModalProps = {
  open: boolean;
  dataset: any;
  instanceId: string;
  onClose: () => void;
};

export default function DataPreviewModal({
  open,
  dataset,
  instanceId,
  onClose,
}: DataPreviewModalProps) {
  const [rows, setRows] = useState<DatasetRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rowLimit, setRowLimit] = useState<number>(100);
  const [sortConfig, setSortConfig] = useState<{ key: keyof DatasetRow; direction: "asc" | "desc" } | null>(null);

  const fetchPreview = async () => {
    if (!dataset?.metric || !instanceId) return;
    setLoading(true);
    setError(null);
    setRows([]);

    try {
      const { data, error } = await supabase
        .rpc("get_dataset_preview", {
          p_instance_id: instanceId,
          p_metric: dataset.metric,
          p_source_note: dataset.source_note,
        });

      if (error) throw error;

      if (!data || data.length === 0) {
        setRows([]);
        setError("No rows returned.");
        setLoading(false);
        return;
      }

      const limitedRows =
        rowLimit === -1 ? data : data.slice(0, rowLimit);
      setRows(limitedRows);
    } catch (err: any) {
      console.error("Error loading dataset preview:", err);
      setError("Failed to load dataset preview.");
    } finally {
      setLoading(false);
    }
  };

  const sortData = (key: keyof DatasetRow) => {
    let direction: "asc" | "desc" = "asc";
    if (sortConfig && sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
    const sorted = [...rows].sort((a, b) => {
      const valA = a[key] ?? "";
      const valB = b[key] ?? "";
      if (typeof valA === "number" && typeof valB === "number") {
        return direction === "asc" ? valA - valB : valB - valA;
      }
      return direction === "asc"
        ? String(valA).localeCompare(String(valB))
        : String(valB).localeCompare(String(valA));
    });
    setRows(sorted);
  };

  useEffect(() => {
    if (open) fetchPreview();
  }, [open, dataset, rowLimit]);

  if (!open) return null;

  const adminLevel =
    dataset?.source_note?.match(/adm\d/i)?.[0]?.toUpperCase() ?? "ADM?";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white w-[90%] max-w-6xl rounded-lg shadow-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-[color:var(--gsc-green)] text-white flex items-center justify-between px-4 py-3">
          <h2 className="text-lg font-semibold">
            Data Preview — {dataset.metric} ({adminLevel})
          </h2>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-4 p-3 text-sm border-b bg-gray-50">
          <label className="flex items-center gap-2">
            Filter:
            <select className="border rounded px-2 py-1">
              <option>Both</option>
              <option>Raw only</option>
              <option>Scored only</option>
            </select>
          </label>
          <label className="flex items-center gap-2">
            Rows:
            <select
              value={rowLimit}
              onChange={(e) => setRowLimit(Number(e.target.value))}
              className="border rounded px-2 py-1"
            >
              <option value={10}>10</option>
              <option value={100}>100</option>
              <option value={1000}>1000</option>
              <option value={-1}>All</option>
            </select>
          </label>
          <span className="text-gray-600 truncate">
            Method: {dataset.norm_method ?? "n/a"} · Direction:{" "}
            {dataset.higher_is_better
              ? "↑ higher = worse"
              : "↓ lower = worse"}{" "}
            · Params: {JSON.stringify(dataset.norm_params ?? {})}
          </span>
        </div>

        {/* Table */}
        <div className="overflow-auto flex-1">
          {loading ? (
            <div className="text-center text-gray-500 py-8">Loading…</div>
          ) : error ? (
            <div className="text-center text-gray-500 py-8">{error}</div>
          ) : (
            <table className="min-w-full text-sm">
              <thead className="bg-gray-100 sticky top-0">
                <tr>
                  {["admin_pcode", "admin_name", "raw_val", "score"].map(
                    (col) => (
                      <th
                        key={col}
                        className="p-2 text-left cursor-pointer hover:bg-gray-200 select-none"
                        onClick={() => sortData(col as keyof DatasetRow)}
                      >
                        {col
                          .replace("_", " ")
                          .replace(/\b\w/g, (c) => c.toUpperCase())}
                        {sortConfig?.key === col
                          ? sortConfig.direction === "asc"
                            ? " ↑"
                            : " ↓"
                          : ""}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr
                    key={r.admin_pcode + i}
                    className={i % 2 ? "bg-gray-50" : ""}
                  >
                    <td className="p-2">{r.admin_pcode}</td>
                    <td className="p-2">{r.admin_name}</td>
                    <td className="p-2 text-right">
                      {r.raw_val?.toLocaleString()}
                    </td>
                    <td className="p-2 text-right">
                      {r.score != null ? r.score.toFixed(2) : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="border-t p-3 text-right bg-gray-50">
          <button
            onClick={onClose}
            className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-1 rounded"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

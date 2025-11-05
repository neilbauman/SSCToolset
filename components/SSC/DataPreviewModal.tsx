"use client";

import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { X, ArrowUpDown } from "lucide-react";

type DatasetRow = {
  metric: string;
  source_note: string;
  pillar: string;
  data_type: string;
  norm_method: string | null;
  norm_params: any | null;
  higher_is_better: boolean | null;
  admin_level?: string | null;
};

type PreviewRow = {
  admin_pcode: string;
  admin_name: string | null;
  raw_val: number | null;
  score: number | null;
};

type Props = {
  open: boolean;
  dataset: DatasetRow;
  instanceId: string;
  onClose: () => void;
};

export default function DataPreviewModal({ open, dataset, instanceId, onClose }: Props) {
  const [rows, setRows] = useState<PreviewRow[]>([]);
  const [loading, setLoading] = useState(false);

  // UI controls
  const [sortKey, setSortKey] = useState<keyof PreviewRow>("admin_name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [limit, setLimit] = useState<number>(200); // user-controlled selector

  useEffect(() => {
    if (!open || !dataset) return;

    const load = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.rpc("get_dataset_preview", {
          p_instance_id: instanceId,
          p_metric: dataset.metric,
          p_source_note: dataset.source_note,
        });
        if (error) throw error;
        // data is an array of rows
        setRows((data || []) as PreviewRow[]);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [open, instanceId, dataset]);

  const sorted = useMemo(() => {
    const copy = [...rows];
    copy.sort((a, b) => {
      const va = a[sortKey];
      const vb = b[sortKey];
      if (va == null && vb == null) return 0;
      if (va == null) return sortDir === "asc" ? -1 : 1;
      if (vb == null) return sortDir === "asc" ? 1 : -1;
      if (typeof va === "number" && typeof vb === "number") {
        return sortDir === "asc" ? va - vb : vb - va;
      }
      // string compare
      return sortDir === "asc"
        ? String(va).localeCompare(String(vb))
        : String(vb).localeCompare(String(va));
    });
    return copy;
  }, [rows, sortKey, sortDir]);

  const shown = useMemo(() => sorted.slice(0, limit), [sorted, limit]);
  const titleLevel = dataset?.admin_level || "—";

  if (!open) return null;

  const toggleSort = (k: keyof PreviewRow) => {
    setSortKey(k);
    setSortDir((d) => (k === sortKey ? (d === "asc" ? "desc" : "asc") : "asc"));
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-40 flex items-center justify-center p-3">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[85vh] flex flex-col">
        <header className="px-4 py-2 border-b flex items-center justify-between">
          <h3 className="font-semibold text-sm">
            Preview: {dataset.metric} — <span className="text-gray-600">{dataset.source_note}</span>{" "}
            <span className="text-gray-500">({titleLevel})</span>
          </h3>
          <button
            onClick={onClose}
            className="text-gray-600 hover:text-black p-1 rounded"
            title="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="px-4 pt-3 pb-2 flex items-center gap-3 text-xs">
          <label className="text-gray-600">Rows to show:</label>
          <select
            value={limit}
            onChange={(e) => setLimit(parseInt(e.currentTarget.value, 10))}
            className="border rounded px-2 py-1"
          >
            {[50, 100, 200, 500, 1000, 5000].map((n) => (
              <option key={n} value={n}>
                {n.toLocaleString()}
              </option>
            ))}
          </select>
          <span className="text-gray-500 ml-auto">
            Total rows: {rows.length.toLocaleString()}
          </span>
        </div>

        <div className="px-4 pb-4 overflow-auto">
          <div className="border rounded">
            <table className="w-full text-[13px]">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <Th label="Admin (name)" onClick={() => toggleSort("admin_name")} active={sortKey === "admin_name"} dir={sortDir} />
                  <Th label="Admin Pcode" onClick={() => toggleSort("admin_pcode")} active={sortKey === "admin_pcode"} dir={sortDir} />
                  <Th label="Raw value" onClick={() => toggleSort("raw_val")} active={sortKey === "raw_val"} dir={sortDir} />
                  <Th label="Score" onClick={() => toggleSort("score")} active={sortKey === "score"} dir={sortDir} />
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={4} className="text-center text-gray-400 py-4">
                      Loading…
                    </td>
                  </tr>
                ) : shown.length ? (
                  shown.map((r) => (
                    <tr key={r.admin_pcode} className="border-t hover:bg-gray-50">
                      <td className="p-2">{r.admin_name || "—"}</td>
                      <td className="p-2 text-gray-600">{r.admin_pcode}</td>
                      <td className="p-2 tabular-nums">{r.raw_val ?? "—"}</td>
                      <td className="p-2 tabular-nums">{r.score ?? "—"}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="text-center text-gray-400 py-4">
                      No rows
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function Th({
  label,
  onClick,
  active,
  dir,
}: {
  label: string;
  onClick: () => void;
  active: boolean;
  dir: "asc" | "desc";
}) {
  return (
    <th
      className="p-2 text-left font-medium text-gray-600 cursor-pointer select-none"
      onClick={onClick}
      title="Sort"
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <ArrowUpDown
          className={`h-3 w-3 ${active ? "text-gray-800" : "text-gray-400"}`}
        />
        {active && (
          <span className="text-[10px] text-gray-500">{dir.toUpperCase()}</span>
        )}
      </span>
    </th>
  );
}

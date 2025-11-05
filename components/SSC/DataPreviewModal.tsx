"use client";

import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { X } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

type Props = {
  open: boolean;
  dataset: {
    metric: string;
    source_note: string;
  };
  instanceId: string;
  onClose: () => void;
};

type Row = {
  admin_pcode: string;
  admin_name: string | null;
  raw_value: number | null;
  score: number | null;
};

export default function DataPreviewModal({
  open,
  dataset,
  instanceId,
  onClose,
}: Props) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<"raw" | "scored" | "both">("both");

  useEffect(() => {
    if (!open) return;
    (async () => {
      setLoading(true);

      // Fetch via RPC that joins admin_units for admin_name
      const { data, error } = await supabase.rpc("get_dataset_preview", {
        p_instance_id: instanceId,
        p_metric: dataset.metric,
        p_source_note: dataset.source_note,
      });

      if (!error && Array.isArray(data)) {
        setRows(data as Row[]);
      } else {
        // graceful fallback (no drift): empty
        setRows([]);
      }
      setLoading(false);
    })();
  }, [open, instanceId, dataset.metric, dataset.source_note]);

  const filteredRows = useMemo(() => {
    if (filter === "raw") return rows.filter((r) => r.score == null);
    if (filter === "scored") return rows.filter((r) => r.score != null);
    return rows;
  }, [rows, filter]);

  const histogram = useMemo(() => {
    const buckets: Record<string, number> = {};
    for (const r of rows) {
      if (r.score == null) continue;
      const bin = Math.max(1, Math.min(5, Math.round(Number(r.score))));
      buckets[bin] = (buckets[bin] || 0) + 1;
    }
    return Object.entries(buckets).map(([bin, count]) => ({ bin, count }));
  }, [rows]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-5xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <header className="px-4 py-2 bg-[color:var(--gsc-green)] text-white flex justify-between items-center rounded-t-lg">
          <h3 className="font-semibold text-sm">Data Preview – {dataset.metric}</h3>
          <X onClick={onClose} className="h-4 w-4 cursor-pointer" />
        </header>

        {/* Controls */}
        <div className="px-4 pt-3 text-sm flex items-center justify-between">
          <div className="flex gap-2 items-center">
            <span className="text-gray-600 text-sm">Filter:</span>
            <select
              value={filter}
              onChange={(e) =>
                setFilter(e.target.value as "raw" | "scored" | "both")
              }
              className="border rounded px-2 py-1 text-sm"
            >
              <option value="both">Both</option>
              <option value="raw">Raw only</option>
              <option value="scored">Scored only</option>
            </select>
          </div>
          <span className="text-gray-500 text-xs">
            Showing {filteredRows.length} of {rows.length} rows
          </span>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto p-4 text-sm space-y-3">
          {loading ? (
            <p>Loading…</p>
          ) : filteredRows.length === 0 ? (
            <p className="text-gray-500">No rows found.</p>
          ) : (
            <>
              <div className="overflow-x-auto border rounded-lg">
                <table className="min-w-full text-[13px]">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="p-2 text-left">Admin PCode</th>
                      <th className="p-2 text-left">Admin Name</th>
                      <th className="p-2 text-left">Raw Value</th>
                      <th className="p-2 text-left">Score (1–5)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRows.map((r) => (
                      <tr key={r.admin_pcode} className="border-t hover:bg-gray-50">
                        <td className="p-2 font-mono">{r.admin_pcode}</td>
                        <td className="p-2">{r.admin_name ?? "—"}</td>
                        <td className="p-2">{r.raw_value ?? "—"}</td>
                        <td className="p-2">{r.score ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {histogram.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-gray-700 font-medium mb-2 text-sm">
                    Score Distribution
                  </h4>
                  <div className="h-40">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={histogram}>
                        <XAxis dataKey="bin" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="count" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

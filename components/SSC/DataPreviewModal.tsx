"use client";

import { useEffect, useState, useMemo } from "react";
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
  dataset: any;
  instanceId: string;
  onClose: () => void;
};

export default function DataPreviewModal({ open, dataset, instanceId, onClose }: Props) {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<"raw" | "scored" | "both">("both");

  useEffect(() => {
    if (!open) return;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("unified_category_results")
        .select("admin_pcode, raw_value, score")
        .eq("metric", dataset.metric)
        .eq("source_note", dataset.source_note)
        .eq("instance_id", instanceId)
        .limit(200);
      if (!error) setRows(data || []);
      setLoading(false);
    })();
  }, [open, dataset, instanceId]);

  const filteredRows = useMemo(() => {
    if (filter === "raw") return rows.filter((r) => r.score == null);
    if (filter === "scored") return rows.filter((r) => r.score != null);
    return rows;
  }, [rows, filter]);

  const histogram = useMemo(() => {
    const buckets: Record<string, number> = {};
    for (const r of rows) {
      const bin = r.score != null ? Math.round(r.score) : 0;
      if (bin === 0) continue;
      buckets[bin] = (buckets[bin] || 0) + 1;
    }
    return Object.entries(buckets).map(([bin, count]) => ({
      bin,
      count,
    }));
  }, [rows]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-4xl max-h-[85vh] flex flex-col">
        <header className="px-4 py-2 bg-[color:var(--gsc-green)] text-white flex justify-between items-center rounded-t-lg">
          <h3 className="font-semibold text-sm">
            Data Preview – {dataset.metric}
          </h3>
          <X onClick={onClose} className="h-4 w-4 cursor-pointer" />
        </header>

        <div className="flex-1 overflow-auto p-4 text-sm space-y-3">
          <div className="flex justify-between items-center">
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

          {loading ? (
            <p>Loading...</p>
          ) : filteredRows.length === 0 ? (
            <p className="text-gray-500">No rows found.</p>
          ) : (
            <>
              <div className="overflow-x-auto border rounded-lg">
                <table className="min-w-full text-[13px]">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="p-2 text-left">Admin PCode</th>
                      <th className="p-2 text-left">Raw Value</th>
                      <th className="p-2 text-left">Score (1–5)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRows.map((r) => (
                      <tr
                        key={r.admin_pcode}
                        className="border-t hover:bg-gray-50"
                      >
                        <td className="p-2 font-mono">{r.admin_pcode}</td>
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
                        <Bar dataKey="count" fill="#16a34a" />
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

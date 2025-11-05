"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";

type Props = {
  open: boolean;
  metric: string;
  instanceId: string;
  onClose: () => void;
};

type Row = {
  admin_pcode: string;
  admin_name: string | null;
  raw_value: number | null;
  score: number | null;
};

export default function DataPreviewModal({ open, metric, instanceId, onClose }: Props) {
  const [rows, setRows] = useState<Row[]>([]);
  const [filter, setFilter] = useState<"raw" | "score" | "both">("both");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error } = await supabase
          .from("unified_category_results")
          .select(`
            admin_pcode,
            raw_value,
            score,
            admin_units ( name )
          `)
          .eq("instance_id", instanceId)
          .eq("metric", metric)
          .order("admin_pcode", { ascending: true })
          .limit(200); // prevent massive load

        if (error) throw error;

        const normalized = (data || []).map((d: any) => ({
          admin_pcode: d.admin_pcode,
          admin_name: d.admin_units?.name ?? null,
          raw_value: d.raw_value,
          score: d.score,
        }));
        setRows(normalized);
      } catch (err: any) {
        console.error("Error loading preview:", err);
        setError(err.message || "Failed to load data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [open, instanceId, metric]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white w-full max-w-4xl rounded shadow-lg overflow-hidden">
        <div className="bg-[color:var(--gsc-green)] text-white flex justify-between items-center p-3">
          <h2 className="font-semibold">
            Data Preview – {metric}
          </h2>
          <button onClick={onClose} className="text-white hover:text-gray-200">
            ✕
          </button>
        </div>

        <div className="p-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Filter:</label>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as any)}
                className="border rounded px-2 py-1 text-sm"
              >
                <option value="both">Both</option>
                <option value="raw">Raw only</option>
                <option value="score">Score only</option>
              </select>
            </div>
            <div className="text-sm text-gray-500">
              Showing {rows.length} of 200 rows
            </div>
          </div>

          {loading && <p className="text-sm text-gray-600">Loading data…</p>}
          {error && <p className="text-sm text-red-600">{error}</p>}

          {!loading && !error && rows.length === 0 && (
            <p className="text-sm text-gray-500 italic">No rows found.</p>
          )}

          {!loading && !error && rows.length > 0 && (
            <div className="overflow-auto max-h-[70vh] border rounded">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-100 text-gray-700">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium border-b">Admin PCode</th>
                    <th className="px-3 py-2 text-left font-medium border-b">Admin Name</th>
                    {(filter === "both" || filter === "raw") && (
                      <th className="px-3 py-2 text-right font-medium border-b">Raw Value</th>
                    )}
                    {(filter === "both" || filter === "score") && (
                      <th className="px-3 py-2 text-right font-medium border-b">Score (1–5)</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.admin_pcode} className="hover:bg-gray-50">
                      <td className="px-3 py-1 border-b">{r.admin_pcode}</td>
                      <td className="px-3 py-1 border-b">{r.admin_name ?? "—"}</td>
                      {(filter === "both" || filter === "raw") && (
                        <td className="px-3 py-1 border-b text-right">
                          {r.raw_value !== null ? r.raw_value.toLocaleString() : "—"}
                        </td>
                      )}
                      {(filter === "both" || filter === "score") && (
                        <td className="px-3 py-1 border-b text-right">
                          {r.score !== null ? r.score.toFixed(2) : "—"}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

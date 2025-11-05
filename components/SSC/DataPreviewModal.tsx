"use client";

import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";

type Props = {
  open: boolean;
  /** e.g., "poverty_rate", "population_density", "building_typology_weighted" */
  metric: string;
  /** instance id (uuid) to filter rows */
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
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [filter, setFilter] = useState<"both" | "raw" | "score">("both");
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  const title = useMemo(() => `Data Preview — ${metric}`, [metric]);

  useEffect(() => {
    if (!open) return;

    const fetchPreview = async () => {
      setLoading(true);
      setErrMsg(null);
      try {
        // 1) Count total rows for this metric in the instance (for the header)
        {
          const { count, error } = await supabase
            .from("unified_category_results")
            .select("*", { count: "exact", head: true })
            .eq("instance_id", instanceId)
            .eq("metric", metric);
          if (error) throw error;
          setTotalCount(count ?? 0);
        }

        // 2) Pull a page of rows (limit to 200 to keep modal snappy)
        const { data, error } = await supabase
          .from("unified_category_results")
          .select("admin_pcode, raw_value, score")
          .eq("instance_id", instanceId)
          .eq("metric", metric)
          .order("admin_pcode", { ascending: true })
          .limit(200);
        if (error) throw error;

        const pcodes = Array.from(new Set((data ?? []).map((r) => r.admin_pcode).filter(Boolean)));

        // 3) Fetch names for these pcodes from admin_units and merge client-side
        let nameMap = new Map<string, string>();
        if (pcodes.length > 0) {
          const { data: names, error: nerr } = await supabase
            .from("admin_units")
            .select("pcode, name")
            .in("pcode", pcodes);
          if (nerr) throw nerr;
          for (const n of names ?? []) nameMap.set(n.pcode, n.name);
        }

        const merged: Row[] =
          (data ?? []).map((r: any) => ({
            admin_pcode: r.admin_pcode,
            admin_name: nameMap.get(r.admin_pcode) ?? null,
            raw_value: r.raw_value,
            score: r.score,
          })) ?? [];

        setRows(merged);
      } catch (e: any) {
        console.error("DataPreviewModal error:", e);
        setErrMsg(e?.message || "Failed to load data");
      } finally {
        setLoading(false);
      }
    };

    fetchPreview();
  }, [open, metric, instanceId]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-5xl overflow-hidden rounded-md bg-white shadow-lg">
        <div className="flex items-center justify-between bg-[color:var(--gsc-green)] px-4 py-2 text-white">
          <h2 className="font-semibold">{title}</h2>
          <button onClick={onClose} className="rounded px-2 py-1 hover:bg-white/10">✕</button>
        </div>

        <div className="px-4 py-3">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-700">Filter:</label>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as "both" | "raw" | "score")}
                className="rounded border px-2 py-1 text-sm"
              >
                <option value="both">Both</option>
                <option value="raw">Raw only</option>
                <option value="score">Score only</option>
              </select>
            </div>
            <div className="text-sm text-gray-500">
              Showing {rows.length} {totalCount !== null ? `of ${totalCount}` : ""} rows
            </div>
          </div>

          {loading ? (
            <p className="text-sm text-gray-600">Loading…</p>
          ) : errMsg ? (
            <p className="text-sm text-red-600">{errMsg}</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-gray-500 italic">No rows found.</p>
          ) : (
            <div className="max-h-[70vh] overflow-auto rounded border">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-100 text-gray-700">
                  <tr>
                    <th className="border-b px-3 py-2 text-left font-medium">Admin PCode</th>
                    <th className="border-b px-3 py-2 text-left font-medium">Admin Name</th>
                    {(filter === "both" || filter === "raw") && (
                      <th className="border-b px-3 py-2 text-right font-medium">Raw Value</th>
                    )}
                    {(filter === "both" || filter === "score") && (
                      <th className="border-b px-3 py-2 text-right font-medium">Score (1–5)</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.admin_pcode} className="hover:bg-gray-50">
                      <td className="border-b px-3 py-1">{r.admin_pcode}</td>
                      <td className="border-b px-3 py-1">{r.admin_name ?? "—"}</td>
                      {(filter === "both" || filter === "raw") && (
                        <td className="border-b px-3 py-1 text-right">
                          {r.raw_value !== null ? r.raw_value.toLocaleString() : "—"}
                        </td>
                      )}
                      {(filter === "both" || filter === "score") && (
                        <td className="border-b px-3 py-1 text-right">
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

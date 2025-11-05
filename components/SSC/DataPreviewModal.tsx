"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { X } from "lucide-react";

type Props = {
  open: boolean;
  dataset: any;
  instanceId: string;
  onClose: () => void;
};

export default function DataPreviewModal({ open, dataset, instanceId, onClose }: Props) {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

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
        .limit(50);
      if (!error) setRows(data || []);
      setLoading(false);
    })();
  }, [open, dataset, instanceId]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl max-h-[80vh] flex flex-col">
        <header className="px-4 py-2 bg-[color:var(--gsc-green)] text-white flex justify-between items-center rounded-t-lg">
          <h3 className="font-semibold text-sm">
            Data Preview – {dataset.metric}
          </h3>
          <X onClick={onClose} className="h-4 w-4 cursor-pointer" />
        </header>

        <div className="flex-1 overflow-auto p-4 text-sm">
          {loading ? (
            <p>Loading...</p>
          ) : rows.length === 0 ? (
            <p className="text-gray-500">No rows found.</p>
          ) : (
            <table className="min-w-full border text-[13px]">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-2 text-left">Admin PCode</th>
                  <th className="p-2 text-left">Raw Value</th>
                  <th className="p-2 text-left">Score (1–5)</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.admin_pcode} className="border-t hover:bg-gray-50">
                    <td className="p-2 font-mono">{r.admin_pcode}</td>
                    <td className="p-2">{r.raw_value ?? "—"}</td>
                    <td className="p-2">{r.score ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

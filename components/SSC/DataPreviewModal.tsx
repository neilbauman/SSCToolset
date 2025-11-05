"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";

type Props = {
  open: boolean;
  dataset: any;
  instanceId: string;
  onClose: () => void;
};

// A lightweight modal to preview both raw and normalized values for a dataset
export default function DataPreviewModal({
  open,
  dataset,
  instanceId,
  onClose,
}: Props) {
  const [rows, setRows] = useState<any[]>([]);
  const [filter, setFilter] = useState<string>("both");

  useEffect(() => {
    if (!open || !dataset) return;

    const loadData = async () => {
      try {
        const { data, error } = await supabase.rpc("get_dataset_preview", {
          p_metric: dataset.metric,
          p_source_note: dataset.source_note,
          p_instance_id: instanceId,
        });

        if (error) {
          console.error("Error loading preview:", error);
          setRows([]);
          return;
        }

        setRows(data || []);
      } catch (err) {
        console.error("Unexpected error loading preview:", err);
        setRows([]);
      }
    };

    loadData();
  }, [open, dataset, instanceId]);

  if (!open) return null;

  const filteredRows =
    filter === "both"
      ? rows
      : filter === "raw"
      ? rows.filter((r) => r.raw_value !== null && r.score_1to5 == null)
      : rows.filter((r) => r.score_1to5 !== null);

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg max-w-5xl w-full p-4 relative">
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
        >
          <X className="h-5 w-5" />
        </button>

        <h2 className="text-lg font-semibold mb-2">
          Data Preview — {dataset.metric}
        </h2>

        <div className="flex justify-between items-center mb-3">
          <label className="text-sm text-gray-600">
            Filter:&nbsp;
            <select
              value={filter}
              onChange={(e) => setFilter(e.currentTarget.value)}
              className="border rounded px-2 py-1 text-sm"
            >
              <option value="both">Both</option>
              <option value="raw">Raw only</option>
              <option value="norm">Normalized only</option>
            </select>
          </label>
          <span className="text-xs text-gray-500">
            Showing {filteredRows.length} of {rows.length} rows
          </span>
        </div>

        <div className="overflow-y-auto max-h-[70vh] border rounded">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="p-2 text-left">Admin PCode</th>
                <th className="p-2 text-left">Admin Name</th>
                <th className="p-2 text-left">Raw Value</th>
                <th className="p-2 text-left">Score (1–5)</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.length ? (
                filteredRows.map((r, i) => (
                  <tr key={i} className="border-t hover:bg-gray-50">
                    <td className="p-2 font-mono text-xs">{r.admin_pcode}</td>
                    <td className="p-2">{r.admin_name || ""}</td>
                    <td className="p-2 text-right">
                      {r.raw_value !== null ? Number(r.raw_value).toFixed(2) : ""}
                    </td>
                    <td className="p-2 text-right">
                      {r.score_1to5 !== null ? Number(r.score_1to5).toFixed(2) : ""}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={4}
                    className="text-center text-gray-400 py-4 text-sm"
                  >
                    No rows found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

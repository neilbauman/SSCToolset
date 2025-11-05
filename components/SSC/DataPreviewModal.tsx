"use client";

import { useState, useEffect, useMemo } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { X, ArrowUpDown } from "lucide-react";

interface Props {
  open: boolean;
  dataset: any;
  instanceId: string;
  onClose: () => void;
}

interface DatasetRow {
  admin_pcode: string;
  admin_name: string;
  raw_value: number;
  score: number;
}

export default function DataPreviewModal({
  open,
  dataset,
  instanceId,
  onClose,
}: Props) {
  const [data, setData] = useState<DatasetRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("Both");
  const [rowLimit, setRowLimit] = useState<number>(100);
  const [sortKey, setSortKey] = useState<keyof DatasetRow>("admin_pcode");
  const [sortAsc, setSortAsc] = useState(true);

  useEffect(() => {
    if (!open || !dataset) return;
    fetchData();
  }, [dataset, instanceId, open, filter, rowLimit]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .rpc("get_dataset_preview", {
          p_metric: dataset.metric,
          p_source_note: dataset.source_note,
          p_instance_id: instanceId,
        })
        .range(0, rowLimit === 0 ? 50000 : rowLimit - 1); // ✅ request large sets

      if (error) throw error;
      setData(data || []);
    } catch (err) {
      console.error("Error loading preview:", err);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => {
      const v1 = a[sortKey] ?? "";
      const v2 = b[sortKey] ?? "";
      if (typeof v1 === "number" && typeof v2 === "number") {
        return sortAsc ? v1 - v2 : v2 - v1;
      }
      return sortAsc
        ? String(v1).localeCompare(String(v2))
        : String(v2).localeCompare(String(v1));
    });
  }, [data, sortKey, sortAsc]);

  const toggleSort = (key: keyof DatasetRow) => {
    if (key === sortKey) setSortAsc(!sortAsc);
    else {
      setSortKey(key);
      setSortAsc(true);
    }
  };

  if (!open || !dataset) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-40 flex justify-center items-start p-6 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-6xl max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-[color:var(--gsc-green)] text-white px-4 py-3 flex justify-between items-center">
          <h2 className="font-semibold">
            Data Preview — {dataset.metric} ({dataset.admin_level || "ADM"})
          </h2>
          <div className="flex items-center space-x-3 text-sm">
            <label>Filter:</label>
            <select
              className="bg-white text-black rounded px-2 py-1"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              <option>Both</option>
              <option>Raw Only</option>
              <option>Score Only</option>
            </select>

            <label>Rows:</label>
            <select
              className="bg-white text-black rounded px-2 py-1"
              value={rowLimit}
              onChange={(e) =>
                setRowLimit(
                  e.target.value === "All" ? 0 : parseInt(e.target.value, 10)
                )
              }
            >
              <option value={10}>10</option>
              <option value={100}>100</option>
              <option value={1000}>1000</option>
              <option value={5000}>5000</option>
              <option value={0}>All</option>
            </select>

            <button
              onClick={onClose}
              className="bg-white text-black px-3 py-1 rounded hover:bg-gray-200"
            >
              Close
            </button>
          </div>
        </div>

        {/* Metadata */}
        <div className="text-xs text-gray-700 bg-gray-50 px-4 py-2 border-b">
          Method: {dataset.norm_method} · Direction:{" "}
          {dataset.higher_is_better
            ? "↑ higher = worse"
            : "↓ lower = worse"}{" "}
          · Params: {JSON.stringify(dataset.norm_params)}
        </div>

        {/* Table */}
        <div className="flex-1 overflow-y-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-100 sticky top-0">
              <tr>
                <th
                  className="p-2 cursor-pointer text-left"
                  onClick={() => toggleSort("admin_pcode")}
                >
                  Admin PCode <ArrowUpDown className="inline h-3 w-3 ml-1" />
                </th>
                <th
                  className="p-2 cursor-pointer text-left"
                  onClick={() => toggleSort("admin_name")}
                >
                  Admin Name <ArrowUpDown className="inline h-3 w-3 ml-1" />
                </th>
                <th
                  className="p-2 cursor-pointer text-right"
                  onClick={() => toggleSort("raw_value")}
                >
                  Raw Value <ArrowUpDown className="inline h-3 w-3 ml-1" />
                </th>
                <th
                  className="p-2 cursor-pointer text-right"
                  onClick={() => toggleSort("score")}
                >
                  Score (1–5) <ArrowUpDown className="inline h-3 w-3 ml-1" />
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="text-center py-6 text-gray-400">
                    Loading…
                  </td>
                </tr>
              ) : sortedData.length ? (
                sortedData.map((r) => (
                  <tr
                    key={r.admin_pcode}
                    className="border-t hover:bg-gray-50 transition-colors"
                  >
                    <td className="p-2">{r.admin_pcode}</td>
                    <td className="p-2">{r.admin_name}</td>
                    <td className="p-2 text-right">
                      {r.raw_value?.toLocaleString() ?? "-"}
                    </td>
                    <td className="p-2 text-right">{r.score ?? "-"}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="text-center py-6 text-gray-400">
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

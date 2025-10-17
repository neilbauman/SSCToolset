"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { Loader2 } from "lucide-react";

type DatasetPreviewProps = {
  datasetId: string;
  datasetType: "adm0" | "gradient" | "categorical";
};

export default function DatasetPreview({ datasetId, datasetType }: DatasetPreviewProps) {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        setError(null);

        let query;
        if (datasetType === "categorical") {
          query = supabase
            .from("dataset_values_cat")
            .select("admin_pcode, category_label, category_score")
            .eq("dataset_id", datasetId)
            .limit(50);
        } else {
          query = supabase
            .from("dataset_values")
            .select("admin_pcode, value, unit")
            .eq("dataset_id", datasetId)
            .limit(50);
        }

        const { data, error } = await query;
        if (error) throw error;

        setRows(data || []);
      } catch (err: any) {
        console.error(err);
        setError(err.message || "Failed to load dataset preview.");
      } finally {
        setLoading(false);
      }
    }

    if (datasetId) fetchData();
  }, [datasetId, datasetType]);

  if (loading)
    return (
      <div className="flex justify-center items-center py-10 text-gray-500">
        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading preview...
      </div>
    );

  if (error)
    return (
      <div className="text-[var(--gsc-red)] text-sm p-4 border rounded">
        {error}
      </div>
    );

  if (!rows.length)
    return (
      <div className="text-gray-500 text-sm p-4 border rounded">
        No data found for this dataset.
      </div>
    );

  const headers =
    datasetType === "categorical"
      ? ["admin_pcode", "category_label", "category_score"]
      : ["admin_pcode", "value", "unit"];

  return (
    <div className="rounded-xl border overflow-auto bg-white">
      <table className="min-w-full text-sm">
        <thead className="bg-[var(--gsc-light-gray)]/60">
          <tr>
            {headers.map((h) => (
              <th
                key={h}
                className="px-3 py-2 text-left font-semibold border-b text-[var(--gsc-gray)]"
              >
                {h.replace(/_/g, " ")}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="hover:bg-gray-50">
              {headers.map((h) => (
                <td key={h} className="px-3 py-1 border-b">
                  {r[h] ?? "—"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

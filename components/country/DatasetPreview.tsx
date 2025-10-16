"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";

export default function DatasetPreview({ dataset }: { dataset: { id: string } }) {
  const [rows, setRows] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!dataset?.id) return;
    (async () => {
      setLoading(true);

      const { data: gradient } = await supabase
        .from("dataset_values")
        .select("admin_pcode,admin_level,value,unit,category_label")
        .eq("dataset_id", dataset.id)
        .limit(50);

      const { data: categorical } = await supabase
        .from("dataset_values_cat")
        .select("admin_pcode,admin_level,category_label,category_score")
        .eq("dataset_id", dataset.id)
        .limit(50);

      const data = (gradient && gradient.length > 0)
        ? gradient
        : (categorical || []);

      if (data.length > 0) {
        setHeaders(Object.keys(data[0]));
        setRows(data);
      } else {
        setHeaders([]);
        setRows([]);
      }

      setLoading(false);
    })();
  }, [dataset?.id]);

  if (loading)
    return (
      <div className="text-sm text-gray-500">
        Loading dataset preview…
      </div>
    );

  if (rows.length === 0)
    return (
      <div className="text-sm text-gray-500">
        No data found for this dataset.
      </div>
    );

  return (
    <div className="rounded-xl border overflow-auto bg-white">
      <table className="min-w-full text-sm">
        <thead className="bg-[var(--gsc-light-gray)]/60">
          <tr>
            {headers.map((h) => (
              <th key={h} className="p-2 text-left font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t">
              {headers.map((h) => (
                <td key={h} className="p-2 whitespace-nowrap">
                  {r[h] ?? ""}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length >= 50 && (
        <div className="p-

"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { Loader2 } from "lucide-react";

export default function DatasetPreview({ dataset }: any) {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!dataset?.id) return;
    (async () => {
      setLoading(true);
      try {
        let merged: any[] = [];

        // Gradient or ADM0
        const { data: grad } = await supabase
          .from("dataset_values")
          .select("admin_pcode, value, unit, admin_level")
          .eq("dataset_id", dataset.id)
          .limit(100);

        // Categorical
        const { data: cat } = await supabase
          .from("dataset_values_cat")
          .select("admin_pcode, category_label, category_score, unit, admin_level")
          .eq("dataset_id", dataset.id)
          .limit(100);

        merged = [...(grad || []), ...(cat || [])];
        setRows(merged);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [dataset?.id]);

  if (loading)
    return (
      <div className="p-4 text-gray-500 text-sm">
        <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
        Loading dataset preview…
      </div>
    );

  if (!rows?.length)
    return (
      <div className="p-4 text-gray-500 text-sm border-t">
        No data found for this dataset.
      </div>
    );

  const isCategorical = !!rows.find((r) => r.category_label);

  return (
    <div className="rounded-xl border overflow-auto bg-white">
      <table className="min-w-full text-sm">
        <thead className="bg-[var(--gsc-light-gray)]/60">
          <tr>
            <th className="px-2 py-1 text-left">Admin Pcode</th>
            <th className="px-2 py-1 text-left">Admin Level</th>
            {isCategorical ? (
              <>
                <th className="px-2 py-1 text-left">Category Label</th>
                <th className="px-2 py-1 text-right">Category Score</th>
              </>
            ) : (
              <>
                <th className="px-2 py-1 text-right">Value</th>
              </>
            )}
            <th className="px-2 py-1 text-left">Unit</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr
              key={i}
              className="border-t hover:bg-[var(--gsc-beige)]/40 transition"
            >
              <td className="px-2 py-1">{r.admin_pcode}</td>
              <td className="px-2 py-1">{r.admin_level}</td>
              {isCategorical ? (
                <>
                  <td className="px-2 py-1">{r.category_label}</td>
                  <td className="px-2 py-1 text-right">
                    {r.category_score ?? "—"}
                  </td>
                </>
              ) : (
                <td className="px-2 py-1 text-right">{r.value ?? "—"}</td>
              )}
              <td className="px-2 py-1">{r.unit ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

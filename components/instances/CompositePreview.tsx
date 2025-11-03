"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";

type Row = { admin_pcode: string; value: number };

interface Props {
  instanceId: string;
  category: string;
}

export default function CompositePreview({ instanceId, category }: Props) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!instanceId || !category) return;
    (async () => {
      setLoading(true);
      setErr(null);

      const { data: tbl, error: terr } = await supabase.rpc("get_composite_table_name", {
        p_instance_id: instanceId,
        p_category: category,
      });

      if (terr) {
        setErr(terr.message);
        setLoading(false);
        return;
      }

      const tableName = tbl?.result_table_name as string | null;
      if (!tableName) {
        setRows([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from(`derived.${tableName}`)
        .select("admin_pcode,value")
        .order("admin_pcode", { ascending: true })
        .limit(100);

      if (error) setErr(error.message);
      else setRows((data as Row[]) ?? []);
      setLoading(false);
    })();
  }, [instanceId, category]);

  return (
    <div className="rounded-lg border bg-white">
      <div className="flex items-center justify-between px-3 py-2 border-b bg-gray-50">
        <div className="font-semibold text-sm">
          Composite preview — {category.replaceAll("_", " ")}
        </div>
      </div>

      {err && (
        <div className="px-3 py-2 text-[11px] text-red-600 border-b bg-red-50 font-mono">
          {err}
        </div>
      )}

      {!err && (
        <div className="overflow-auto max-h-[420px]">
          <table className="w-full text-[11px]">
            <thead className="bg-gray-100 sticky top-0">
              <tr>
                <th className="text-left px-3 py-1">Admin pcode</th>
                <th className="text-right px-3 py-1">Value</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={2} className="px-3 py-6 text-gray-500 text-center">
                    Loading…
                  </td>
                </tr>
              ) : rows.length ? (
                rows.map((r) => (
                  <tr key={r.admin_pcode} className="border-t hover:bg-gray-50">
                    <td className="px-3 py-1 font-mono">{r.admin_pcode}</td>
                    <td className="px-3 py-1 text-right">{r.value.toFixed(2)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={2} className="px-3 py-6 text-gray-400 text-center italic">
                    No data available.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

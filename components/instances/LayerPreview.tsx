"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";

type Props = {
  layerId: string; // id from instance_layers
};

export default function LayerPreview({ layerId }: Props) {
  const [rows, setRows] = useState<{ admin_pcode: string; value: number }[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!layerId) return;
    (async () => {
      setLoading(true);
      setErr(null);

      // Find the layer result table name via RPC
      const { data: tbl, error: terr } = await supabase.rpc("get_layer_result_table", {
        p_layer_id: layerId,
      });

      if (terr) {
        setErr(terr.message);
        setLoading(false);
        return;
      }

      const tableName = tbl?.result_table_name;
      if (!tableName) {
        setErr("No result table found");
        setLoading(false);
        return;
      }

      // Fetch normalized data
      const { data, error } = await supabase
        .from(`derived.${tableName}`)
        .select("admin_pcode, value")
        .limit(50);

      if (error) setErr(error.message);
      else setRows((data as any) ?? []);

      setLoading(false);
    })();
  }, [layerId]);

  if (loading)
    return <div className="text-xs text-gray-500 px-4 py-2">Loading preview…</div>;

  if (err)
    return (
      <div className="text-xs text-red-600 px-4 py-2">
        Error: <span className="font-mono">{err}</span>
      </div>
    );

  if (!rows.length)
    return (
      <div className="text-xs text-gray-400 italic px-4 py-2">
        No preview data.
      </div>
    );

  return (
    <div className="overflow-auto border-t text-xs">
      <table className="w-full">
        <thead className="bg-gray-50 sticky top-0">
          <tr>
            <th className="text-left px-3 py-1">Admin pcode</th>
            <th className="text-right px-3 py-1">Value</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.admin_pcode} className="border-t">
              <td className="px-3 py-1 font-mono text-[10px]">{r.admin_pcode}</td>
              <td className="px-3 py-1 text-right">{r.value.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

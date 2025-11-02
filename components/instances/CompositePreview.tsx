"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";

type Row = { admin_pcode: string; value: number | null };
type Props = {
  instanceId: string;
  category?: string;
  className?: string;
};

export default function CompositePreview({
  instanceId,
  category = "underlying_vulnerability",
  className = "",
}: Props) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  const load = async () => {
    setLoading(true);
    setErr(null);
    try {
      const { data, error } = await supabase.rpc("get_composite_values", {
        p_instance_id: instanceId,
        p_category: category,
      });
      if (error) throw error;
      setRows(data ?? []);
    } catch (e: any) {
      setErr(e?.message ?? "Failed to load composite values");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [instanceId, category]);

  const shown = expanded ? rows : rows.slice(0, 10);

  return (
    <div className={`rounded-md border bg-gray-50 p-3 ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-medium text-gray-800 text-sm">
          {category.replaceAll("_", " ")} (composite preview)
        </h3>
        <button
          onClick={load}
          className="text-xs px-2 py-0.5 rounded bg-gray-100 hover:bg-gray-200"
        >
          Refresh
        </button>
      </div>

      {loading && <p className="text-xs text-gray-500">Loading…</p>}
      {err && <p className="text-xs text-red-600">{err}</p>}

      {!loading && !err && (
        <>
          {rows.length === 0 ? (
            <p className="text-xs text-gray-500">No data available.</p>
          ) : (
            <>
              <table className="w-full text-xs">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="text-left px-2 py-1 font-medium">PCode</th>
                    <th className="text-right px-2 py-1 font-medium">Value</th>
                  </tr>
                </thead>
                <tbody>
                  {shown.map((r) => (
                    <tr key={r.admin_pcode} className="border-t">
                      <td className="px-2 py-1">{r.admin_pcode}</td>
                      <td className="px-2 py-1 text-right">
                        {r.value === null ? "—" : r.value.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {rows.length > 10 && (
                <div className="flex justify-center pt-2">
                  <button
                    onClick={() => setExpanded(!expanded)}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    {expanded
                      ? "Collapse view"
                      : `Show all ${rows.length.toLocaleString()} rows`}
                  </button>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";

type Row = {
  admin_pcode: string;
  value: number | null;
};

type Props = {
  instanceId: string;
  /** optional; defaults to "underlying_vulnerability" */
  category?: string;
  className?: string;
};

export default function CompositePreview({
  instanceId,
  category = "underlying_vulnerability",
  className = "",
}: Props) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setErr(null);
    try {
      // Uses your RPC that returns admin_pcode, value
      const { data, error } = await supabase.rpc("get_composite_values", {
        p_instance_id: instanceId,
        p_category: category,
      });
      if (error) throw error;
      setRows(data ?? []);
    } catch (e: any) {
      setErr(e?.message ?? "Failed to load composite values");
      setRows(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instanceId, category]);

  return (
    <div className={`border rounded-lg p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-800">
          Composite preview – {category.replaceAll("_", " ")}
        </h3>
        <button
          onClick={load}
          className="text-sm px-3 py-1 rounded bg-gray-100 hover:bg-gray-200"
        >
          Refresh
        </button>
      </div>

      {loading && <p className="text-sm text-gray-500">Loading…</p>}
      {err && <p className="text-sm text-red-600">{err}</p>}

      {!loading && !err && (
        <>
          {rows && rows.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left">Admin pcode</th>
                    <th className="px-3 py-2 text-right">Value</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.admin_pcode} className="border-t">
                      <td className="px-3 py-2">{r.admin_pcode}</td>
                      <td className="px-3 py-2 text-right">
                        {r.value === null ? "—" : Number(r.value).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-gray-500">No composite rows.</p>
          )}
        </>
      )}
    </div>
  );
}

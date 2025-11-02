"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { Loader2, BarChart3 } from "lucide-react";

type Props = {
  instanceId: string;
  category?: string;
};

type Row = {
  admin_pcode: string;
  value: number;
};

export default function CompositePreview({ instanceId, category }: Props) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchComposite = async () => {
    setLoading(true);
    try {
      // Fetch the latest derived composite table for this instance + category
      const { data, error } = await supabase.rpc("get_composite_table_name", {
        p_instance_id: instanceId,
        p_category: category || "underlying_vulnerability",
      });

      if (error) throw error;
      const tableName = data?.table_name;
      if (!tableName) {
        setRows([]);
        setLoading(false);
        return;
      }

      // Query the composite table
      const { data: values, error: valErr } = await supabase.rpc(
        "get_composite_values",
        { p_table_name: tableName }
      );
      if (valErr) throw valErr;

      setRows(values || []);
    } catch (err) {
      console.error("Error fetching composite:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComposite();
  }, [instanceId, category]);

  return (
    <div className="mt-8 bg-white border rounded-lg shadow-sm">
      <div className="flex items-center gap-2 border-b px-4 py-2">
        <BarChart3 className="w-5 h-5 text-[color:var(--gsc-blue)]" />
        <h3 className="font-semibold text-base">
          Composite Preview ({category || "underlying_vulnerability"})
        </h3>
      </div>

      <div className="p-4">
        {loading ? (
          <div className="flex items-center justify-center py-8 text-gray-500">
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
            Loading composite...
          </div>
        ) : rows.length === 0 ? (
          <p className="text-gray-500 italic text-sm">
            No composite data found. Apply methodologies and rebuild the
            composite to view results.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-t">
              <thead className="bg-gray-100 text-left">
                <tr>
                  <th className="px-4 py-2">Admin Pcode</th>
                  <th className="px-4 py-2">Value</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 10).map((r) => (
                  <tr key={r.admin_pcode} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-1">{r.admin_pcode}</td>
                    <td className="px-4 py-1">{r.value.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

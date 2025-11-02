"use client";
import { useEffect, useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";

interface Props {
  instanceId: string;
  category: string;
}

export default function CompositePreview({ instanceId, category }: Props) {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchComposite = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error } = await supabase.rpc("fetch_derived_table", {
          schema: "derived",
          prefix: `instance_${instanceId.replace(/-/g, "_")}_${category}`,
        });
        if (error) throw error;
        setRows(data || []);
      } catch (e: any) {
        setError(e.message);
        setRows([]);
      } finally {
        setLoading(false);
      }
    };

    fetchComposite();
  }, [instanceId, category]);

  return (
    <div className="mt-6 border rounded-lg shadow-sm bg-white">
      <div className="p-3 border-b flex justify-between items-center">
        <h3 className="font-semibold text-gray-800">
          Composite Preview — {category.replace("_", " ")}
        </h3>
        {loading && (
          <span className="text-sm text-gray-400 animate-pulse">Loading...</span>
        )}
      </div>

      {error ? (
        <div className="p-4 text-red-600 text-sm">Error: {error}</div>
      ) : rows.length === 0 && !loading ? (
        <div className="p-4 text-gray-500 italic text-sm">
          No composite data found yet.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-100 text-gray-700">
              <tr>
                <th className="px-4 py-2 text-left">Admin PCode</th>
                <th className="px-4 py-2 text-right">Value</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, idx) => (
                <tr
                  key={`${r.admin_pcode}-${idx}`}
                  className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}
                >
                  <td className="px-4 py-1">{r.admin_pcode}</td>
                  <td className="px-4 py-1 text-right">
                    {Number(r.value).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

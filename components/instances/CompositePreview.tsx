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
  const [stats, setStats] = useState<{ min: number; max: number; count: number } | null>(null);

  // Map UI categories to actual DB table suffixes
  const categoryMap: Record<string, string> = {
    underlying_vulnerability: "underlying_vul",
    vulnerability: "underlying_vul",
    hazard: "hazard",
    ssc_pillar: "ssc_pillar",
  };

  const safeCategory = categoryMap[category] || category;

  useEffect(() => {
    const fetchComposite = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error } = await supabase.rpc("fetch_derived_table", {
          schema: "derived",
          prefix: `instance_${instanceId.replace(/-/g, "_")}_${safeCategory}`,
        });
        if (error) throw error;

        if (data && data.length > 0) {
          setRows(data);
          const values = data.map((d: any) => Number(d.value));
          const min = Math.min(...values);
          const max = Math.max(...values);
          setStats({ min, max, count: data.length });
        } else {
          setRows([]);
          setStats(null);
        }
      } catch (e: any) {
        setError(e.message);
        setRows([]);
        setStats(null);
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
        <div className="p-4 text-red-600 text-sm">
          <strong>Error:</strong> {error}
        </div>
      ) : rows.length === 0 && !loading ? (
        <div className="p-4 text-gray-500 italic text-sm">
          No composite data found yet.
        </div>
      ) : (
        <>
          {/* Summary */}
          {stats && (
            <div className="p-3 border-b text-sm text-gray-600 bg-gray-50 flex justify-between">
              <span>
                <strong>{stats.count}</strong> records
              </span>
              <span>
                Range: <strong>{stats.min.toFixed(2)}</strong> –{" "}
                <strong>{stats.max.toFixed(2)}</strong>
              </span>
            </div>
          )}

          {/* Data Table */}
          <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-100 text-gray-700 sticky top-0">
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
                    <td className="px-4 py-1 font-mono text-xs text-gray-700">
                      {r.admin_pcode}
                    </td>
                    <td className="px-4 py-1 text-right text-gray-800">
                      {Number(r.value).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

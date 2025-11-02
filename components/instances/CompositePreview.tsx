"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { Loader2 } from "lucide-react";

type Props = {
  instanceId: string;
  category: string;
};

type CompositeValue = {
  admin_pcode: string;
  value: number;
};

export default function CompositePreview({ instanceId, category }: Props) {
  const [data, setData] = useState<CompositeValue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchComposite = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase.rpc("get_composite_values", {
          p_instance_id: instanceId,
          p_category: category,
        });
        if (error) throw error;
        setData(data || []);
      } catch (err: any) {
        console.error(err);
        setError(err.message || "Error fetching data");
      } finally {
        setLoading(false);
      }
    };
    fetchComposite();
  }, [instanceId, category]);

  return (
    <div className="border rounded-lg p-4 shadow-sm bg-white">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-lg font-semibold capitalize">
          {category.replace(/_/g, " ")}
        </h3>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-6 text-gray-500">
          <Loader2 className="animate-spin w-5 h-5 mr-2" />
          Loading data...
        </div>
      ) : error ? (
        <p className="text-red-500 text-sm">{error}</p>
      ) : data.length === 0 ? (
        <p className="text-gray-500 italic">No data available.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="text-left px-3 py-2">Admin Pcode</th>
                <th className="text-right px-3 py-2">Value</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row) => (
                <tr
                  key={row.admin_pcode}
                  className="border-t hover:bg-gray-50 transition-colors"
                >
                  <td className="px-3 py-1">{row.admin_pcode}</td>
                  <td className="px-3 py-1 text-right">
                    {Number(row.value).toFixed(2)}
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

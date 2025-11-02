"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { Loader2 } from "lucide-react";

/**
 * Compact, multi-category composite preview for SSC instances.
 * Displays results for all analytical categories (P1–P3, Hazard, Underlying Vulnerability).
 */
interface Props {
  instanceId: string;
}

type CategoryKey =
  | "ssc_p1"
  | "ssc_p2"
  | "ssc_p3"
  | "hazard"
  | "underlying_vulnerability";

interface CompositeRow {
  admin_pcode: string;
  value: number;
}

const CATEGORY_MAP: Record<CategoryKey, string> = {
  ssc_p1: "SSC Pillar 1",
  ssc_p2: "SSC Pillar 2",
  ssc_p3: "SSC Pillar 3",
  hazard: "Hazards",
  underlying_vulnerability: "Underlying Vulnerabilities",
};

export default function CompositePreview({ instanceId }: Props) {
  const [data, setData] = useState<Record<CategoryKey, CompositeRow[]>>({
    ssc_p1: [],
    ssc_p2: [],
    ssc_p3: [],
    hazard: [],
    underlying_vulnerability: [],
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchComposite = async (category: CategoryKey) => {
    try {
      const { data, error } = await supabase.rpc("get_composite_values", {
        p_instance_id: instanceId,
        p_category: category,
      });
      if (error) throw error;
      return data || [];
    } catch (err: any) {
      console.warn(`No data for ${category}`, err.message);
      return [];
    }
  };

  const fetchAll = async () => {
    setLoading(true);
    setError(null);
    try {
      const results = await Promise.all(
        (Object.keys(CATEGORY_MAP) as CategoryKey[]).map(async (key) => {
          const rows = await fetchComposite(key);
          return [key, rows];
        })
      );
      const record = Object.fromEntries(results) as Record<
        CategoryKey,
        CompositeRow[]
      >;
      setData(record);
    } catch (err: any) {
      setError(err.message || "Failed to load composite results.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (instanceId) fetchAll();
  }, [instanceId]);

  const renderTable = (category: CategoryKey) => {
    const rows = data[category];
    const hasData = rows.length > 0;

    return (
      <div
        key={category}
        className="bg-white border rounded-lg shadow-sm p-4 h-full flex flex-col"
      >
        <h3 className="text-md font-semibold mb-3">
          {CATEGORY_MAP[category]}
        </h3>

        {loading ? (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading...
          </div>
        ) : hasData ? (
          <div className="overflow-y-auto max-h-[220px] border rounded">
            <table className="w-full text-sm">
              <thead className="bg-gray-100 text-gray-700 sticky top-0">
                <tr>
                  <th className="px-2 py-1 text-left">Admin PCode</th>
                  <th className="px-2 py-1 text-right">Value</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr
                    key={r.admin_pcode}
                    className="border-t hover:bg-gray-50 transition"
                  >
                    <td className="px-2 py-1">{r.admin_pcode}</td>
                    <td className="px-2 py-1 text-right">
                      {Number(r.value).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500 italic flex-1 flex items-center justify-center">
            No data available.
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="mt-6">
      <h2 className="text-lg font-semibold mb-3">Composite Results</h2>

      {error && (
        <div className="bg-red-100 text-red-600 p-2 rounded mb-3 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {renderTable("ssc_p1")}
        {renderTable("ssc_p2")}
        {renderTable("ssc_p3")}
        {renderTable("hazard")}
        {renderTable("underlying_vulnerability")}
      </div>
    </div>
  );
}

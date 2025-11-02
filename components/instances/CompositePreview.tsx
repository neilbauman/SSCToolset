"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { Loader2, BarChart3 } from "lucide-react";

type Composite = {
  instance_id: string;
  instance_title: string;
  country_iso: string;
  category: string;
  methodology_name: string;
  derived_table_ref: string;
  created_at: string;
};

export default function CompositePreview({ instanceId }: { instanceId: string }) {
  const [composites, setComposites] = useState<Composite[]>([]);
  const [selected, setSelected] = useState<Composite | null>(null);
  const [summary, setSummary] = useState<{ min: number; max: number; avg: number; count: number } | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchComposites = async () => {
    const { data, error } = await supabase
      .from("instance_composite_summary")
      .select("*")
      .eq("instance_id", instanceId)
      .order("created_at", { ascending: false });
    if (error) console.error(error);
    setComposites(data || []);
  };

  const fetchSummary = async (tableRef: string) => {
    setLoading(true);
    try {
      const cleanName = tableRef.replace("derived.", "");
      const { data, error } = await supabase.rpc("get_composite_summary", { p_table: cleanName });
      if (error) throw error;
      setSummary(data);
    } catch (err) {
      console.error(err);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComposites();
  }, [instanceId]);

  return (
    <div className="mt-8 border rounded-lg shadow-sm bg-white">
      <div className="p-4 border-b flex justify-between items-center">
        <h3 className="font-semibold text-lg flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-[color:var(--gsc-blue)]" />
          Composite Summary
        </h3>
        {loading && <Loader2 className="w-4 h-4 animate-spin text-gray-500" />}
      </div>

      <div className="p-4">
        {composites.length === 0 ? (
          <p className="text-gray-500 italic text-sm">No composites generated yet.</p>
        ) : (
          <>
            <table className="w-full text-sm mb-4 border">
              <thead className="bg-gray-100 text-left">
                <tr>
                  <th className="px-3 py-2">Category</th>
                  <th className="px-3 py-2">Methodology</th>
                  <th className="px-3 py-2">Table</th>
                  <th className="px-3 py-2 text-right">Created</th>
                  <th className="px-3 py-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {composites.map((c) => (
                  <tr key={c.derived_table_ref} className="border-t hover:bg-gray-50">
                    <td className="px-3 py-2">{c.category}</td>
                    <td className="px-3 py-2">{c.methodology_name || "—"}</td>
                    <td className="px-3 py-2">{c.derived_table_ref.replace("derived.", "")}</td>
                    <td className="px-3 py-2 text-right">
                      {new Date(c.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button
                        onClick={() => {
                          setSelected(c);
                          fetchSummary(c.derived_table_ref);
                        }}
                        className="px-2 py-1 text-xs rounded bg-[color:var(--gsc-blue)] text-white hover:opacity-90"
                      >
                        Preview
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {selected && summary && (
              <div className="border-t pt-3">
                <p className="font-semibold text-sm mb-2">
                  Preview: {selected.category} ({selected.methodology_name})
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                  <div className="bg-gray-50 p-3 rounded-md shadow-sm">
                    <p className="text-gray-500">Records</p>
                    <p className="font-semibold">{summary.count}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-md shadow-sm">
                    <p className="text-gray-500">Average</p>
                    <p className="font-semibold">{summary.avg?.toFixed(2)}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-md shadow-sm">
                    <p className="text-gray-500">Min</p>
                    <p className="font-semibold">{summary.min?.toFixed(2)}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-md shadow-sm">
                    <p className="text-gray-500">Max</p>
                    <p className="font-semibold">{summary.max?.toFixed(2)}</p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

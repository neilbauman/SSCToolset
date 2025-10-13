"use client";

import { useEffect, useState } from "react";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { Pencil, Trash2, Plus, Loader2 } from "lucide-react";

type Indicator = {
  id: string;
  code: string | null;
  name: string;
  topic: string | null;
  data_type: string | null;
  unit: string | null;
  type: string | null;
  description: string | null;
  pillar_id: string | null;
  theme_id: string | null;
  subtheme_id: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type Category = { indicator_id: string; category: string };

export default function IndicatorsPage() {
  const [indicators, setIndicators] = useState<Indicator[]>([]);
  const [categories, setCategories] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [openAdd, setOpenAdd] = useState(false);
  const [editing, setEditing] = useState<Indicator | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: inds } = await supabase.from("indicator_catalogue").select("*").order("created_at", { ascending: false });
      const { data: cats } = await supabase.from("indicator_categories").select("indicator_id, category");
      const grouped: Record<string, string[]> = {};
      (cats || []).forEach((c) => {
        if (!grouped[c.indicator_id]) grouped[c.indicator_id] = [];
        grouped[c.indicator_id].push(c.category);
      });
      setIndicators(inds || []);
      setCategories(grouped);
      setLoading(false);
    })();
  }, []);

  const handleDelete = async (id: string) => {
    await supabase.from("indicator_catalogue").delete().eq("id", id);
    setIndicators((prev) => prev.filter((i) => i.id !== id));
  };

  const headerProps = {
    title: "Indicator Catalogue",
    group: "ssc-config" as const,
    description: "Manage indicators used across SSC, vulnerability, and hazard layers.",
    breadcrumbs: (
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "SSC Configuration", href: "/configuration" },
          { label: "Indicator Catalogue" },
        ]}
      />
    ),
  };

  return (
    <SidebarLayout headerProps={headerProps}>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-[color:var(--gsc-gray)]">
          Indicators
        </h2>
        <button
          onClick={() => setOpenAdd(true)}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-md text-white bg-[color:var(--gsc-red)] hover:opacity-90"
        >
          <Plus className="w-4 h-4" /> Add Indicator
        </button>
      </div>

      <div className="border rounded-lg p-3 shadow-sm bg-white overflow-auto">
        {loading ? (
          <div className="p-6 text-gray-600 flex items-center gap-2 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading indicators…
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="text-left px-2 py-1">Code</th>
                <th className="text-left px-2 py-1">Name</th>
                <th className="text-left px-2 py-1">Topic</th>
                <th className="text-left px-2 py-1">Categories</th>
                <th className="text-left px-2 py-1">Type</th>
                <th className="text-left px-2 py-1">Unit</th>
                <th className="text-left px-2 py-1">Data Type</th>
                <th className="text-left px-2 py-1">Updated</th>
                <th className="text-right px-2 py-1">Actions</th>
              </tr>
            </thead>
            <tbody>
              {indicators.map((ind) => (
                <tr
                  key={ind.id}
                  className="border-b last:border-b-0 hover:bg-gray-50"
                >
                  <td className="px-2 py-1">{ind.code || "—"}</td>
                  <td className="px-2 py-1 font-medium">{ind.name}</td>
                  <td className="px-2 py-1 text-gray-700">
                    {ind.topic || "—"}
                  </td>
                  <td className="px-2 py-1">
                    {(categories[ind.id] || []).length ? (
                      <div className="flex gap-1 flex-wrap">
                        {categories[ind.id].map((c) => (
                          <span
                            key={c}
                            className="text-xs bg-gray-100 px-2 py-0.5 rounded"
                          >
                            {c}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-gray-400 text-xs">none</span>
                    )}
                  </td>
                  <td className="px-2 py-1">{ind.type || "—"}</td>
                  <td className="px-2 py-1">{ind.unit || "—"}</td>
                  <td className="px-2 py-1">{ind.data_type || "—"}</td>
                  <td className="px-2 py-1">
                    {ind.updated_at
                      ? new Date(ind.updated_at).toLocaleDateString()
                      : "—"}
                  </td>
                  <td className="px-2 py-1 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        className="p-1 rounded hover:bg-gray-100"
                        title="Edit"
                        onClick={() => setEditing(ind)}
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        className="p-1 rounded hover:bg-gray-100 text-[color:var(--gsc-red)]"
                        title="Delete"
                        onClick={() => handleDelete(ind.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!indicators.length && (
                <tr>
                  <td
                    colSpan={9}
                    className="text-center py-6 text-gray-500 italic"
                  >
                    No indicators yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {openAdd && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-lg">
            <h3 className="text-lg font-semibold mb-3">Add New Indicator</h3>
            <p className="text-sm text-gray-500 mb-4">
              Modal functionality coming soon — structure is ready for
              expansion.
            </p>
            <div className="flex justify-end">
              <button
                onClick={() => setOpenAdd(false)}
                className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </SidebarLayout>
  );
}

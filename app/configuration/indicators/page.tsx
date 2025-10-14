"use client";

import { useEffect, useState, useMemo } from "react";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { Pencil, Trash2, Plus, Loader2, Search } from "lucide-react";
import EditIndicatorModal from "@/components/configuration/indicators/EditIndicatorModal";
import FrameworkLinkDisplay from "@/components/configuration/FrameworkLinkDisplay";

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

  // Filters
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("All");

  // 🔹 Load indicators + categories
  const loadAll = async () => {
    setLoading(true);
    const { data: inds } = await supabase
      .from("indicator_catalogue")
      .select("*")
      .order("created_at", { ascending: false });
    const { data: cats } = await supabase
      .from("indicator_categories")
      .select("indicator_id, category");
    const grouped: Record<string, string[]> = {};
    (cats || []).forEach((c) => {
      if (!grouped[c.indicator_id]) grouped[c.indicator_id] = [];
      grouped[c.indicator_id].push(c.category);
    });
    setIndicators(inds || []);
    setCategories(grouped);
    setLoading(false);
  };

  useEffect(() => {
    loadAll();
  }, []);

  const handleDelete = async (id: string) => {
    await supabase.from("indicator_catalogue").delete().eq("id", id);
    await supabase.from("indicator_categories").delete().eq("indicator_id", id);
    setIndicators((prev) => prev.filter((i) => i.id !== id));
  };

  // 🔹 Filter + search logic
  const filteredIndicators = useMemo(() => {
    return indicators.filter((ind) => {
      const term = search.toLowerCase();
      const inSearch =
        !term ||
        ind.name.toLowerCase().includes(term) ||
        (ind.code ?? "").toLowerCase().includes(term) ||
        (ind.topic ?? "").toLowerCase().includes(term);

      const cats = categories[ind.id] || [];
      const inCat =
        categoryFilter === "All" ||
        cats.map((c) => c.toLowerCase()).includes(categoryFilter.toLowerCase());

      return inSearch && inCat;
    });
  }, [indicators, categories, search, categoryFilter]);

  const headerProps = {
    title: "Indicator Catalogue",
    group: "ssc-config" as const,
    description:
      "Manage indicators used across SSC, vulnerability, and hazard layers.",
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
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <h2 className="text-lg font-semibold text-[color:var(--gsc-gray)]">
          Indicators
        </h2>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto sm:items-center">
          <div className="relative flex-1 sm:flex-none">
            <Search className="w-4 h-4 text-gray-400 absolute left-2 top-2.5" />
            <input
              type="text"
              placeholder="Search indicators..."
              className="border rounded-md pl-8 pr-3 py-1 text-sm w-full sm:w-64"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="border rounded-md text-sm py-1 px-2"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option>All</option>
            <option>SSC</option>
            <option>Vulnerability</option>
            <option>Hazard</option>
          </select>
          <button
            onClick={() => setOpenAdd(true)}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-md text-white bg-[color:var(--gsc-red)] hover:opacity-90"
          >
            <Plus className="w-4 h-4" /> Add Indicator
          </button>
        </div>
      </div>

      {/* Table */}
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
              {filteredIndicators.map((ind) => (
                <tr
                  key={ind.id}
                  className="border-b last:border-b-0 hover:bg-gray-50"
                >
                  <td className="px-2 py-1">{ind.code || "—"}</td>
                  <td className="px-2 py-1 font-medium">
                    {ind.name}
                    <FrameworkLinkDisplay
                      pillar_id={ind.pillar_id}
                      theme_id={ind.theme_id}
                      subtheme_id={ind.subtheme_id}
                    />
                  </td>
                  <td className="px-2 py-1">{ind.topic || "—"}</td>
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
                      <span className="text-gray-400 text-xs">—</span>
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
              {!filteredIndicators.length && (
                <tr>
                  <td
                    colSpan={9}
                    className="text-center py-6 text-gray-500 italic"
                  >
                    No indicators match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Modals */}
      {openAdd && (
        <EditIndicatorModal
          open={openAdd}
          onClose={() => setOpenAdd(false)}
          onSaved={loadAll}
        />
      )}
      {editing && (
        <EditIndicatorModal
          open={!!editing}
          indicatorId={editing?.id ?? null}   // ✅ pass the ID only
          onClose={() => setEditing(null)}
          onSaved={loadAll}                   // ✅ matches the correct prop name
        />
      )}
    </SidebarLayout>
  );
}

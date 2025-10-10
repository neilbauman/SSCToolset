"use client";

import { useState, useEffect, useMemo } from "react";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { PlusCircle, Edit3, Trash2, Search, Loader2, Database } from "lucide-react";
import EditDatasetModal from "@/components/country/EditDatasetModal";
import ConfirmDeleteModal from "@/components/common/ConfirmDeleteModal";
import type { CountryParams } from "@/app/country/types";

type Dataset = {
  id: string;
  title: string;
  description?: string | null;
  source?: string | null;
  theme?: string | null;
  admin_level?: string | null;
  upload_type?: string | null;
  created_at?: string;
  indicator_id?: string | null;
};

export default function CountryDatasetsPage({ params }: { params: CountryParams }) {
  const { id: countryIso } = params;
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [themes, setThemes] = useState<string[]>([]);
  const [types, setTypes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterTheme, setFilterTheme] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string | null>(null);
  const [openEdit, setOpenEdit] = useState<Dataset | null>(null);
  const [openDelete, setOpenDelete] = useState<Dataset | null>(null);

  useEffect(() => {
    const fetchDatasets = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("dataset_metadata")
        .select("*")
        .eq("country_iso", countryIso)
        .order("created_at", { ascending: false });
      if (!error && data) {
        setDatasets(data);
        const uniqueThemes = [...new Set(data.map((d) => d.theme).filter(Boolean))];
        const uniqueTypes = [...new Set(data.map((d) => d.upload_type).filter(Boolean))];
        setThemes(uniqueThemes);
        setTypes(uniqueTypes);
      }
      setLoading(false);
    };
    fetchDatasets();
  }, [countryIso]);

  const filtered = useMemo(() => {
    return datasets.filter((d) => {
      const s = search.toLowerCase();
      const matchesSearch =
        !s ||
        d.title?.toLowerCase().includes(s) ||
        d.description?.toLowerCase().includes(s) ||
        d.source?.toLowerCase().includes(s);
      const matchesTheme = !filterTheme || d.theme === filterTheme;
      const matchesType = !filterType || d.upload_type === filterType;
      return matchesSearch && matchesTheme && matchesType;
    });
  }, [datasets, search, filterTheme, filterType]);

  const parseSource = (src: string | null) => {
    if (!src) return <span className="text-gray-400">—</span>;
    try {
      const j = JSON.parse(src);
      if (j.url)
        return (
          <a href={j.url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
            {j.name || j.url}
          </a>
        );
      return <span>{j.name || src}</span>;
    } catch {
      return <span>{src}</span>;
    }
  };

  const handleDelete = async (id: string) => {
    await supabase.from("dataset_metadata").delete().eq("id", id);
    setOpenDelete(null);
    setDatasets((prev) => prev.filter((d) => d.id !== id));
  };

  const headerProps = {
    title: `${countryIso} – Other Datasets`,
    group: "country-config" as const,
    description: "Manage additional datasets for this country's configuration.",
    breadcrumbs: (
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Country Configuration", href: "/country" },
          { label: countryIso, href: `/country/${countryIso}` },
          { label: "Datasets" },
        ]}
      />
    ),
  };

  return (
    <SidebarLayout headerProps={headerProps}>
      <div className="border rounded-lg p-4 shadow-sm bg-white mb-4">
        <div className="flex flex-wrap gap-3 items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-green-600" />
            <h2 className="text-lg font-semibold">Country Datasets</h2>
          </div>
          <button
            onClick={() => setOpenEdit({ id: "", title: "", description: "", source: "", theme: "", admin_level: "" })}
            className="flex items-center gap-1 text-sm bg-[color:var(--gsc-red)] text-white px-3 py-1 rounded hover:opacity-90"
          >
            <PlusCircle className="w-4 h-4" />
            Add Dataset
          </button>
        </div>

        <div className="flex flex-wrap gap-3 mb-3">
          <div className="flex items-center border rounded px-2 py-1 bg-white w-full sm:w-64">
            <Search className="w-4 h-4 text-gray-500 mr-2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search datasets..."
              className="flex-1 text-sm outline-none bg-transparent"
            />
          </div>

          <select
            value={filterTheme || ""}
            onChange={(e) => setFilterTheme(e.target.value || null)}
            className="border rounded px-2 py-1 text-sm"
          >
            <option value="">All Themes</option>
            {themes.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>

          <select
            value={filterType || ""}
            onChange={(e) => setFilterType(e.target.value || null)}
            className="border rounded px-2 py-1 text-sm"
          >
            <option value="">All Types</option>
            {types.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-gray-600 text-sm">
            <Loader2 className="animate-spin w-4 h-4" /> Loading datasets...
          </div>
        ) : filtered.length === 0 ? (
          <p className="italic text-gray-500 text-sm">No datasets found.</p>
        ) : (
          <table className="w-full text-sm border rounded">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-2 py-1 text-left">Title</th>
                <th className="px-2 py-1 text-left">Theme</th>
                <th className="px-2 py-1 text-left">Admin Level</th>
                <th className="px-2 py-1 text-left">Source</th>
                <th className="px-2 py-1 text-left">Created</th>
                <th className="px-2 py-1 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((ds) => (
                <tr key={ds.id} className="hover:bg-gray-50">
                  <td className="border px-2 py-1">{ds.title || "—"}</td>
                  <td className="border px-2 py-1">{ds.theme || "—"}</td>
                  <td className="border px-2 py-1">{ds.admin_level || "—"}</td>
                  <td className="border px-2 py-1">{parseSource(ds.source ?? null)}</td>
                  <td className="border px-2 py-1 text-gray-500">
                    {ds.created_at ? new Date(ds.created_at).toLocaleDateString() : "—"}
                  </td>
                  <td className="border px-2 py-1 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
                        onClick={() => setOpenEdit(ds)}
                      >
                        <Edit3 className="w-4 h-4" />
                        Edit
                      </button>
                      <button
                        className="flex items-center gap-1 text-xs text-[color:var(--gsc-red)] hover:underline"
                        onClick={() => setOpenDelete(ds)}
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {openEdit && (
        <EditDatasetModal
          open={!!openEdit}
          dataset={openEdit}
          onClose={() => setOpenEdit(null)}
          countryIso={countryIso}
          onSaved={() => {
            setOpenEdit(null);
            location.reload();
          }}
        />
      )}

      {openDelete && (
        <ConfirmDeleteModal
          open={!!openDelete}
          message={`Delete dataset "${openDelete.title}"?`}
          onClose={() => setOpenDelete(null)}
          onConfirm={() => handleDelete(openDelete.id)}
        />
      )}
    </SidebarLayout>
  );
}

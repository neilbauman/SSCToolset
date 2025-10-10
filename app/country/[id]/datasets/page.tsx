"use client";

import { useState, useEffect } from "react";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { Database, PlusCircle, Edit3, Trash2, Link2 } from "lucide-react";
import AddDatasetModal from "@/components/country/AddDatasetModal";
import ConfirmDeleteModal from "@/components/common/DeleteConfirmationModal";
import type { CountryParams } from "@/app/country/types";

type Dataset = {
  id: string;
  title: string;
  theme: string;
  admin_level: string;
  source: string | null;
  created_at: string;
};

export default function DatasetsPage({ params }: { params: CountryParams }) {
  const { id: countryIso } = params;
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [openAdd, setOpenAdd] = useState(false);
  const [openDelete, setOpenDelete] = useState<Dataset | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadDatasets();
  }, [countryIso]);

  const loadDatasets = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("dataset_metadata")
      .select("id, title, theme, admin_level, source, created_at")
      .eq("country_iso", countryIso)
      .order("created_at", { ascending: false });
    if (!error && data) {
      setDatasets(data);
    }
    setLoading(false);
  };

  const handleDeleteDataset = async (id: string) => {
    await supabase.from("dataset_metadata").delete().eq("id", id);
    setOpenDelete(null);
    await loadDatasets();
  };

  const parseSource = (source: string | null) => {
    if (!source) return "—";
    try {
      const parsed = JSON.parse(source);
      if (parsed.url) {
        return (
          <a
            href={parsed.url}
            target="_blank"
            rel="noreferrer"
            className="text-blue-600 hover:underline flex items-center gap-1"
          >
            <Link2 className="w-4 h-4" />
            {parsed.name || parsed.url}
          </a>
        );
      }
      return parsed.name || "—";
    } catch {
      return source;
    }
  };

  const headerProps = {
    title: "Country Datasets",
    group: "country-config" as const,
    description:
      "Manage datasets associated with this country. Add new indicators, upload CSV data, or edit existing metadata.",
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
      <div className="border rounded-lg p-4 shadow-sm bg-white mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Database className="w-5 h-5 text-green-600" />
            Country Datasets
          </h2>
          <button
            onClick={() => setOpenAdd(true)}
            className="flex items-center gap-2 text-sm text-white bg-[color:var(--gsc-red)] px-3 py-1 rounded hover:opacity-90"
          >
            <PlusCircle className="w-4 h-4" /> Add Dataset
          </button>
        </div>

        {loading ? (
          <p className="text-sm text-gray-500 italic">Loading datasets...</p>
        ) : datasets.length > 0 ? (
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
              {datasets.map((ds) => (
                <tr key={ds.id} className="border-b hover:bg-gray-50">
                  <td className="px-2 py-1">{ds.title || "—"}</td>
                  <td className="px-2 py-1">{ds.theme || "—"}</td>
                  <td className="px-2 py-1">{ds.admin_level || "—"}</td>
                  <td className="px-2 py-1">{parseSource(ds.source)}</td>
                  <td className="px-2 py-1 text-gray-500">
                    {new Date(ds.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-2 py-1 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        className="flex items-center gap-1 text-xs text-gray-700 hover:underline"
                        onClick={() => alert("Edit coming soon")}
                      >
                        <Edit3 className="w-4 h-4" /> Edit
                      </button>
                      <button
                        className="flex items-center gap-1 text-xs text-[color:var(--gsc-red)] hover:underline"
                        onClick={() => setOpenDelete(ds)}
                      >
                        <Trash2 className="w-4 h-4" /> Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="italic text-gray-500 text-sm">
            No datasets have been uploaded yet.
          </p>
        )}
      </div>

      {openAdd && (
        <AddDatasetModal
          open={openAdd}
          onClose={() => setOpenAdd(false)}
          countryIso={countryIso}
          onSaved={loadDatasets}
        />
      )}

      {openDelete && (
        <ConfirmDeleteModal
          open={!!openDelete}
          title="Delete Dataset"
          message={`Are you sure you want to delete "${openDelete.title}"? This will permanently remove it and all its associated values.`}
          onClose={() => setOpenDelete(null)}
          onConfirm={() => handleDeleteDataset(openDelete.id)}
        />
      )}
    </SidebarLayout>
  );
}

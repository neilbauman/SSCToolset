"use client";

import { useEffect, useState } from "react";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { Database, Plus, Loader2, Trash2, Eye } from "lucide-react";
import DatasetWizard from "./DatasetWizard";
import ConfirmDeleteModal from "@/components/country/ConfirmDeleteModal";

type CountryParams = { id: string };

type DatasetMeta = {
  id: string;
  country_iso: string | null;
  title: string;
  data_type: "numeric" | "categorical" | null;
  admin_level: string | null;
  year?: number | null;
  created_at?: string | null;
  indicator_id?: string | null;
};

export default function CountryDatasetsPage({ params }: { params: CountryParams }) {
  const countryIso = params.id;
  const [datasets, setDatasets] = useState<DatasetMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  async function fetchDatasets() {
    setLoading(true);
    const { data, error } = await supabase
      .from("dataset_metadata")
      .select("id,country_iso,title,data_type,admin_level,year,created_at,indicator_id")
      .eq("country_iso", countryIso)
      .order("created_at", { ascending: false });
    if (error) console.error(error);
    setDatasets(data || []);
    setLoading(false);
  }

  useEffect(() => {
    fetchDatasets();
  }, [countryIso]);

  async function handleDelete() {
    if (!deleteId) return;
    const { error } = await supabase.from("dataset_metadata").delete().eq("id", deleteId);
    if (error) console.error(error);
    setDeleteId(null);
    fetchDatasets();
  }

  const headerProps = {
    title: `${countryIso} – Datasets`,
    group: "country-config" as const,
    description: "Manage datasets uploaded for this country.",
    trailing: (
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Country", href: `/country` },
          { label: countryIso, href: `/country/${countryIso}` },
          { label: "Datasets" },
        ]}
      />
    ),
  };

  return (
    <SidebarLayout headerProps={headerProps}>
      <div className="p-4 md:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-[color:var(--gsc-blue)]">
            <Database className="w-5 h-5" />
            <h2 className="text-lg font-semibold">Country Datasets</h2>
          </div>
          <button
            onClick={() => setWizardOpen(true)}
            className="flex items-center gap-2 bg-[color:var(--gsc-red)] text-white text-sm rounded-md px-3 py-2 hover:opacity-90"
          >
            <Plus className="w-4 h-4" /> Add Dataset
          </button>
        </div>

        {/* Table */}
        <div className="border rounded-lg bg-white overflow-hidden">
          {loading ? (
            <div className="p-6 flex items-center justify-center text-gray-500">
              <Loader2 className="w-5 h-5 animate-spin" /> Loading datasets…
            </div>
          ) : datasets.length === 0 ? (
            <div className="p-6 text-gray-500 text-sm text-center">
              No datasets uploaded for this country yet.
            </div>
          ) : (
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-2">Title</th>
                  <th className="text-left px-4 py-2">Type</th>
                  <th className="text-left px-4 py-2">Admin</th>
                  <th className="text-left px-4 py-2">Year</th>
                  <th className="text-left px-4 py-2">Indicator</th>
                  <th className="px-4 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {datasets.map((d) => (
                  <tr key={d.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-2">{d.title}</td>
                    <td className="px-4 py-2 capitalize">{d.data_type}</td>
                    <td className="px-4 py-2">{d.admin_level}</td>
                    <td className="px-4 py-2">{d.year ?? "—"}</td>
                    <td className="px-4 py-2 text-gray-600">
                      {d.indicator_id ? d.indicator_id.slice(0, 8) : "—"}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <button
                        onClick={() => alert("Coming soon: dataset details view")}
                        className="text-gray-600 hover:text-[color:var(--gsc-blue)] mr-2"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteId(d.id)}
                        className="text-gray-600 hover:text-[color:var(--gsc-red)]"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {wizardOpen && (
          <DatasetWizard
            countryIso={countryIso}
            onClose={() => setWizardOpen(false)}
            onSaved={fetchDatasets}
          />
        )}

        {deleteId && (
          <ConfirmDeleteModal
            open={!!deleteId}
            onClose={() => setDeleteId(null)}
            onConfirm={handleDelete}
            message="Are you sure you want to delete this dataset and its values?"
          />
        )}
      </div>
    </SidebarLayout>
  );
}

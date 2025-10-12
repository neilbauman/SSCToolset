"use client";

import { useState, useEffect } from "react";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { Database, PlusCircle, Trash2, Download } from "lucide-react";
import AddDatasetModal from "@/components/country/AddDatasetModal";
import ConfirmDeleteModal from "@/components/country/ConfirmDeleteModal";

export default function DatasetsPage({ params }: any) {
  const countryIso = params.id;
  const [datasets, setDatasets] = useState<any[]>([]);
  const [openAdd, setOpenAdd] = useState(false);
  const [openDelete, setOpenDelete] = useState<any | null>(null);

  async function loadDatasets() {
    const { data } = await supabase
      .from("dataset_metadata")
      .select(
        "id, title, description, admin_level, data_type, upload_type, created_at, indicator_catalogue(name, theme)"
      )
      .eq("country_iso", countryIso)
      .order("created_at", { ascending: false });
    if (data) setDatasets(data);
  }

  async function handleDelete(id: string) {
    await supabase.from("dataset_metadata").delete().eq("id", id);
    setOpenDelete(null);
    await loadDatasets();
  }

  useEffect(() => {
    loadDatasets();
  }, [countryIso]);

  const headerProps = {
    title: `${countryIso} – Other Datasets`,
    group: "country-config" as const,
    description: "Manage country-specific datasets and indicators.",
    breadcrumbs: (
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Country Configuration", href: "/country" },
          { label: countryIso, href: `/country/${countryIso}` },
          { label: "Other Datasets" },
        ]}
      />
    ),
  };

  return (
    <SidebarLayout headerProps={headerProps}>
      <div className="border rounded-lg p-4 shadow-sm bg-white">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Database className="w-5 h-5 text-green-600" />
            Country Datasets
          </h2>
          <button
            onClick={() => setOpenAdd(true)}
            className="flex items-center gap-1 px-3 py-1.5 text-sm text-white rounded hover:opacity-90"
            style={{ backgroundColor: "var(--gsc-red)" }}
          >
            <PlusCircle className="w-4 h-4" /> Add Dataset
          </button>
        </div>

        {datasets.length ? (
          <table className="w-full text-sm border rounded">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-3 py-2 text-left">Title</th>
                <th>Indicator</th>
                <th>Theme</th>
                <th>Admin Level</th>
                <th>Type</th>
                <th>Data Type</th>
                <th>Created</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {datasets.map((d) => (
                <tr key={d.id} className="border-t hover:bg-gray-50">
                  <td className="px-3 py-2">{d.title}</td>
                  <td className="px-3 py-2">
                    {d.indicator_catalogue?.name || "—"}
                  </td>
                  <td className="px-3 py-2">
                    {d.indicator_catalogue?.theme || "—"}
                  </td>
                  <td className="px-3 py-2">{d.admin_level}</td>
                  <td className="px-3 py-2 capitalize">{d.upload_type}</td>
                  <td className="px-3 py-2 capitalize">{d.data_type}</td>
                  <td className="px-3 py-2 text-gray-500">
                    {new Date(d.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex justify-end gap-3">
                      <button className="text-blue-600 hover:underline text-xs flex items-center gap-1">
                        <Download className="w-4 h-4" /> Template
                      </button>
                      <button
                        className="text-[color:var(--gsc-red)] hover:underline text-xs flex items-center gap-1"
                        onClick={() => setOpenDelete(d)}
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
            No datasets uploaded yet.
          </p>
        )}
      </div>

      {openAdd && (
        <AddDatasetModal
          open={openAdd}
          onClose={() => setOpenAdd(false)}
          countryIso={countryIso}
          onUploaded={loadDatasets}
        />
      )}

      {openDelete && (
        <ConfirmDeleteModal
          open={!!openDelete}
          message={`This will permanently remove "${openDelete.title}" and its data.`}
          onClose={() => setOpenDelete(null)}
          onConfirm={() => handleDelete(openDelete.id)}
        />
      )}
    </SidebarLayout>
  );
}

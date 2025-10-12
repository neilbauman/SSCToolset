"use client";

import { useState, useEffect } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import AddDatasetModal from "@/components/country/AddDatasetModal";
import TemplateDownloadModal from "@/components/country/TemplateDownloadModal";
import ConfirmDeleteModal from "@/components/country/ConfirmDeleteModal";
import { Database, Plus, FileDown, Loader2, Eye, Trash2 } from "lucide-react";
import type { CountryParams } from "@/app/country/types";

export default function CountryDatasetsPage({ params }: { params: CountryParams }) {
  const countryIso = params.id;
  const [datasets, setDatasets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [openAdd, setOpenAdd] = useState(false);
  const [openTemplate, setOpenTemplate] = useState(false);
  const [openDelete, setOpenDelete] = useState<any | null>(null);
  const [selectedDataset, setSelectedDataset] = useState<any | null>(null);
  const [previewRows, setPreviewRows] = useState<any[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);

  // 📦 Load datasets
  async function loadDatasets() {
    setLoading(true);
    const { data, error } = await supabase
      .from("dataset_metadata")
      .select(
        `
        id, title, description, country_iso, created_at,
        indicator_id,
        indicator_catalogue(name, theme, data_type),
        admin_level, upload_type, data_type, source
      `
      )
      .eq("country_iso", countryIso)
      .order("created_at", { ascending: false });

    if (!error && data) setDatasets(data);
    setLoading(false);
  }

  useEffect(() => {
    loadDatasets();
  }, [countryIso]);

  // 👁️ Load dataset values preview
  async function loadPreview(datasetId: string) {
    setPreviewLoading(true);
    setPreviewRows([]);
    const { data, error } = await supabase
      .from("dataset_values")
      .select("admin_pcode, value, unit, notes")
      .eq("dataset_id", datasetId)
      .limit(20);

    if (!error && data) setPreviewRows(data);
    setPreviewLoading(false);
  }

  // 🗑️ Delete dataset
  async function handleDeleteDataset(id: string) {
    const { error } = await supabase.from("dataset_metadata").delete().eq("id", id);
    if (error) alert("Failed to delete dataset.");
    else await loadDatasets();
    setOpenDelete(null);
  }

  const headerProps = {
    title: "Other Datasets",
    group: "country",
    description:
      "Upload and manage additional datasets such as national statistics or gradient indicators.",
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
      {/* Header Actions */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-[color:var(--gsc-gray)]">
          Country Datasets
        </h2>
        <div className="flex gap-2">
          <button
            onClick={() => setOpenTemplate(true)}
            className="flex items-center gap-1 px-3 py-1.5 rounded text-white text-sm hover:opacity-90"
            style={{ backgroundColor: "var(--gsc-blue)" }}
          >
            <FileDown className="w-4 h-4" /> Download Template
          </button>
          <button
            onClick={() => setOpenAdd(true)}
            className="flex items-center gap-1 px-3 py-1.5 rounded text-white text-sm hover:opacity-90"
            style={{ backgroundColor: "var(--gsc-red)" }}
          >
            <Plus className="w-4 h-4" /> Add Dataset
          </button>
        </div>
      </div>

      {/* Datasets Table */}
      {loading ? (
        <div className="flex items-center gap-2 text-gray-600 text-sm">
          <Loader2 className="animate-spin w-4 h-4" /> Loading datasets...
        </div>
      ) : datasets.length === 0 ? (
        <p className="text-gray-500 text-sm italic">No datasets uploaded yet.</p>
      ) : (
        <div className="overflow-x-auto border rounded-md">
          <table className="min-w-full text-sm">
            <thead className="bg-[color:var(--gsc-beige)] text-[color:var(--gsc-gray)] text-left">
              <tr>
                <th className="px-3 py-2 font-medium">Title</th>
                <th className="px-3 py-2 font-medium">Indicator</th>
                <th className="px-3 py-2 font-medium">Type</th>
                <th className="px-3 py-2 font-medium">Admin Level</th>
                <th className="px-3 py-2 font-medium">Data Type</th>
                <th className="px-3 py-2 font-medium">Source</th>
                <th className="px-3 py-2 font-medium">Created</th>
                <th className="px-3 py-2 font-medium text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {datasets.map((ds) => {
                const src = ds.source ? JSON.parse(ds.source) : null;
                return (
                  <tr
                    key={ds.id}
                    className="border-t hover:bg-gray-50 cursor-pointer"
                    onClick={() => {
                      setSelectedDataset(ds);
                      loadPreview(ds.id);
                    }}
                  >
                    <td className="px-3 py-2">{ds.title}</td>
                    <td className="px-3 py-2">
                      {ds.indicator_catalogue?.name || "—"}
                    </td>
                    <td className="px-3 py-2 capitalize">{ds.upload_type}</td>
                    <td className="px-3 py-2">{ds.admin_level}</td>
                    <td className="px-3 py-2 capitalize">{ds.data_type}</td>
                    <td className="px-3 py-2">
                      {src?.name ? (
                        src.url ? (
                          <a
                            href={src.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[color:var(--gsc-blue)] underline"
                          >
                            {src.name}
                          </a>
                        ) : (
                          src.name
                        )
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-3 py-2 text-gray-500">
                      {new Date(ds.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedDataset(ds);
                            loadPreview(ds.id);
                          }}
                          title="View Data"
                          className="text-[color:var(--gsc-blue)] hover:text-blue-700"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenDelete(ds);
                          }}
                          title="Delete Dataset"
                          className="text-[color:var(--gsc-red)] hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Preview Panel */}
      {selectedDataset && (
        <div className="mt-6 border rounded-md p-4 bg-[color:var(--gsc-beige)]">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-base font-semibold text-[color:var(--gsc-gray)]">
              Dataset Preview — {selectedDataset.title}
            </h3>
            <button
              onClick={() => setSelectedDataset(null)}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Close
            </button>
          </div>

          {previewLoading ? (
            <div className="flex items-center gap-2 text-gray-500 text-sm">
              <Loader2 className="animate-spin w-4 h-4" /> Loading data...
            </div>
          ) : previewRows.length === 0 ? (
            <p className="text-gray-500 text-sm italic">
              No data rows found for this dataset.
            </p>
          ) : (
            <div className="overflow-x-auto border rounded bg-white">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-100 text-gray-700">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">Admin PCode</th>
                    <th className="px-3 py-2 text-left font-medium">Value</th>
                    <th className="px-3 py-2 text-left font-medium">Unit</th>
                    <th className="px-3 py-2 text-left font-medium">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((r, i) => (
                    <tr key={i} className="border-t">
                      <td className="px-3 py-1">{r.admin_pcode}</td>
                      <td className="px-3 py-1">{r.value}</td>
                      <td className="px-3 py-1">{r.unit || "—"}</td>
                      <td className="px-3 py-1">{r.notes || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {openAdd && (
        <AddDatasetModal
          open={openAdd}
          onClose={() => setOpenAdd(false)}
          countryIso={countryIso}
          onUploaded={loadDatasets}
        />
      )}
      {openTemplate && (
        <TemplateDownloadModal
          open={openTemplate}
          onClose={() => setOpenTemplate(false)}
          countryIso={countryIso}
        />
      )}
      {openDelete && (
        <ConfirmDeleteModal
          open={!!openDelete}
          title="Delete Dataset"
          message={`Are you sure you want to delete "${openDelete.title}"? This will remove all associated data values.`}
          onClose={() => setOpenDelete(null)}
          onConfirm={() => handleDeleteDataset(openDelete.id)}
        />
      )}
    </SidebarLayout>
  );
}

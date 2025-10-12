"use client";

import { useEffect, useState } from "react";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import {
  Database,
  PlusCircle,
  Eye,
  Trash2,
  Edit3,
  Loader2,
  Download,
} from "lucide-react";
import AddDatasetModal from "@/components/country/AddDatasetModal";
import EditDatasetModal from "@/components/country/EditDatasetModal";
import ConfirmDeleteModal from "@/components/country/ConfirmDeleteModal";

type CountryParams = { id: string };

type DatasetMeta = {
  id: string;
  title: string;
  description?: string | null;
  indicator_id?: string | null;
  type?: string | null;
  admin_level?: string | null;
  data_type?: string | null;
  source?: string | null;
  created_at: string;
  year?: number | null;
  unit?: string | null;
  theme?: string | null;
  upload_type?: string | null;
  country_iso?: string | null;
};

type DatasetRow = {
  admin_name: string | null;
  admin_pcode: string;
  value: number | null;
  unit: string | null;
};

export default function DatasetsPage({ params }: { params: CountryParams }) {
  const countryIso = params.id;
  const [datasets, setDatasets] = useState<DatasetMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [openAdd, setOpenAdd] = useState(false);
  const [openEdit, setOpenEdit] = useState<DatasetMeta | null>(null);
  const [openDelete, setOpenDelete] = useState<DatasetMeta | null>(null);
  const [selectedDataset, setSelectedDataset] = useState<DatasetMeta | null>(null);
  const [previewData, setPreviewData] = useState<DatasetRow[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);

  // 🟢 Load datasets
  useEffect(() => {
    const fetchDatasets = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("dataset_metadata")
        .select("*")
        .eq("country_iso", countryIso)
        .order("created_at", { ascending: false });
      if (error) console.error("Error fetching datasets:", error);
      else setDatasets(data || []);
      setLoading(false);
    };
    fetchDatasets();
  }, [countryIso]);

  // 🟢 Load dataset values for preview
  const loadPreview = async (datasetId: string) => {
    setPreviewLoading(true);
    setSelectedDataset(datasets.find((d) => d.id === datasetId) || null);

    const { data, error } = await supabase
      .from("view_dataset_values_with_names")
      .select("admin_name, admin_pcode, value, unit")
      .eq("dataset_id", datasetId)
      .limit(1000);

    if (error) {
      console.error("Error loading dataset preview:", error);
      setPreviewData([]);
    } else {
      setPreviewData(data || []);
    }
    setPreviewLoading(false);
  };

  const handleDelete = async (id: string) => {
    await supabase.from("dataset_metadata").delete().eq("id", id);
    await supabase.from("dataset_values").delete().eq("dataset_id", id);
    setDatasets((prev) => prev.filter((d) => d.id !== id));
    setOpenDelete(null);
  };

  const headerProps = {
    title: `${countryIso} – Other Datasets`,
    group: "country-config" as const,
    description:
      "Upload and manage additional datasets such as national statistics or gradient indicators.",
    breadcrumbs: (
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Country Configuration", href: "/country" },
          { label: countryIso },
          { label: "Other Datasets" },
        ]}
      />
    ),
  };

  return (
    <SidebarLayout headerProps={headerProps}>
      {/* Header Actions */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-[color:var(--gsc-gray)] flex items-center gap-2">
          <Database className="w-5 h-5 text-[color:var(--gsc-red)]" />
          Country Datasets
        </h2>
        <div className="flex gap-2">
          <button
            onClick={() => window.location.assign(`/country/${countryIso}/download-template`)}
            className="flex items-center text-sm border px-3 py-1 rounded text-blue-700 hover:bg-blue-50"
          >
            <Download className="w-4 h-4 mr-1" /> Template
          </button>
          <button
            onClick={() => setOpenAdd(true)}
            className="flex items-center text-sm text-white bg-[color:var(--gsc-red)] px-3 py-1 rounded hover:opacity-90"
          >
            <PlusCircle className="w-4 h-4 mr-1" /> Add Dataset
          </button>
        </div>
      </div>

      {/* Dataset Table */}
      <div className="border rounded-lg p-4 bg-white shadow-sm">
        {loading ? (
          <div className="flex items-center text-sm text-gray-600">
            <Loader2 className="animate-spin w-4 h-4 mr-2" /> Loading datasets...
          </div>
        ) : datasets.length === 0 ? (
          <p className="italic text-gray-500 text-sm">No datasets uploaded yet.</p>
        ) : (
          <table className="w-full text-sm border rounded">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-2 py-1 text-left">Title</th>
                <th>Type</th>
                <th>Admin Level</th>
                <th>Data Type</th>
                <th>Theme</th>
                <th>Source</th>
                <th>Year</th>
                <th>Created</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {datasets.map((ds) => (
                <tr key={ds.id} className="hover:bg-gray-50">
                  <td className="border px-2 py-1">{ds.title}</td>
                  <td className="border px-2 py-1">{ds.type || "—"}</td>
                  <td className="border px-2 py-1">{ds.admin_level || "—"}</td>
                  <td className="border px-2 py-1">{ds.data_type || "—"}</td>
                  <td className="border px-2 py-1">{ds.theme || "—"}</td>
                  <td className="border px-2 py-1">
                    {ds.source ? (
                      (() => {
                        try {
                          const parsed = JSON.parse(ds.source);
                          return parsed.url ? (
                            <a
                              href={parsed.url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-blue-600 hover:underline"
                            >
                              {parsed.name || parsed.url}
                            </a>
                          ) : (
                            parsed.name || "—"
                          );
                        } catch {
                          return ds.source;
                        }
                      })()
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="border px-2 py-1 text-center">
                    {ds.year ? ds.year : "—"}
                  </td>
                  <td className="border px-2 py-1 text-center">
                    {new Date(ds.created_at).toISOString().split("T")[0]}
                  </td>
                  <td className="border px-2 py-1 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        className="text-blue-600 hover:underline text-xs flex items-center"
                        onClick={() => loadPreview(ds.id)}
                      >
                        <Eye className="w-4 h-4 mr-1" /> Preview
                      </button>
                      <button
                        className="text-gray-700 hover:underline text-xs flex items-center"
                        onClick={() => setOpenEdit(ds)}
                      >
                        <Edit3 className="w-4 h-4 mr-1" /> Edit
                      </button>
                      <button
                        className="text-[color:var(--gsc-red)] hover:underline text-xs flex items-center"
                        onClick={() => setOpenDelete(ds)}
                      >
                        <Trash2 className="w-4 h-4 mr-1" /> Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Dataset Preview */}
      {selectedDataset && (
        <div className="mt-6 border rounded-lg p-4 bg-[color:var(--gsc-beige)] shadow-sm">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-md font-semibold text-[color:var(--gsc-gray)]">
              Dataset Preview — {selectedDataset.title}
            </h3>
            <button
              onClick={() => setSelectedDataset(null)}
              className="text-sm text-gray-500 hover:text-gray-800"
            >
              Close
            </button>
          </div>
          {previewLoading ? (
            <div className="flex items-center text-sm text-gray-600">
              <Loader2 className="animate-spin w-4 h-4 mr-2" /> Loading data...
            </div>
          ) : previewData.length === 0 ? (
            <p className="italic text-gray-500 text-sm">No data found for this dataset.</p>
          ) : (
            <table className="w-full text-sm border rounded">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-2 py-1 text-left">Admin Name</th>
                  <th className="px-2 py-1 text-left">PCode</th>
                  <th className="px-2 py-1 text-right">Value</th>
                  <th className="px-2 py-1 text-right">Unit</th>
                </tr>
              </thead>
              <tbody>
                {previewData.map((row, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="border px-2 py-1">{row.admin_name || "—"}</td>
                    <td className="border px-2 py-1">{row.admin_pcode}</td>
                    <td className="border px-2 py-1 text-right">
                      {row.value !== null ? row.value.toFixed(2) : "—"}
                    </td>
                    <td className="border px-2 py-1 text-right">{row.unit || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Modals */}
      {openAdd && (
        <AddDatasetModal
          open={openAdd}
          onClose={() => setOpenAdd(false)}
          countryIso={countryIso}
          onUploaded={async () => {
            const { data } = await supabase
              .from("dataset_metadata")
              .select("*")
              .eq("country_iso", countryIso)
              .order("created_at", { ascending: false });
            setDatasets(data || []);
          }}
        />
      )}

      {openEdit && (
        <EditDatasetModal
          open={!!openEdit}
          dataset={openEdit}
          onClose={() => setOpenEdit(null)}
          onSave={async () => {
            const { data } = await supabase
              .from("dataset_metadata")
              .select("*")
              .eq("country_iso", countryIso)
              .order("created_at", { ascending: false });
            setDatasets(data || []);
          }}
        />
      )}

      {openDelete && (
        <ConfirmDeleteModal
          open={!!openDelete}
          message={`Delete dataset "${openDelete.title}"? This will permanently remove it and its data.`}
          onClose={() => setOpenDelete(null)}
          onConfirm={() => handleDelete(openDelete.id)}
        />
      )}
    </SidebarLayout>
  );
}

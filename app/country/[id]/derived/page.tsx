"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import {
  Eye,
  Edit3,
  Trash2,
  Plus,
  RefreshCw,
  ChevronUp,
  ChevronDown,
  Loader2,
} from "lucide-react";
import CreateDerivedDatasetWizard_JoinAware from "@/components/country/wizard";
import type { CountryParams } from "@/app/country/types";

type DerivedDataset = {
  id: string;
  title: string;
  admin_level: string;
  method: string;
  created_at: string;
  taxonomy_categories?: string[];
  is_index_ready?: boolean;
};

export default function DerivedDatasetsPage({ params }: { params: CountryParams }) {
  const countryIso = params.id;
  const [datasets, setDatasets] = useState<DerivedDataset[]>([]);
  const [sortField, setSortField] = useState<keyof DerivedDataset>("created_at");
  const [sortAsc, setSortAsc] = useState(false);
  const [selectedDataset, setSelectedDataset] = useState<DerivedDataset | null>(null);
  const [openWizard, setOpenWizard] = useState(false);
  const [editDataset, setEditDataset] = useState<DerivedDataset | null>(null);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [healthSummary, setHealthSummary] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  // 🔹 Load datasets
  const loadDatasets = async () => {
    const { data, error } = await supabase
      .from("derived_dataset_metadata")
      .select("id, title, admin_level, method, created_at, taxonomy_categories, is_index_ready")
      .eq("country_iso", countryIso)
      .order(sortField, { ascending: sortAsc });

    if (error) {
      console.error(error);
      return;
    }
    setDatasets(data || []);
  };

  useEffect(() => {
    loadDatasets();
  }, [sortField, sortAsc, countryIso]);

  const toggleSort = (field: keyof DerivedDataset) => {
    if (sortField === field) setSortAsc(!sortAsc);
    else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  // 🔹 View dataset
  const viewDataset = async (dataset: DerivedDataset) => {
    setSelectedDataset(dataset);
    setPreviewData([]);
    setLoadingPreview(true);
    const tableName = `derived_${dataset.id}`;

    // Check if table exists
    const { error: existsErr } = await supabase.from(tableName).select("pcode").limit(1);
    if (existsErr) {
      alert(`⚠️ Dataset not yet computed or missing (${tableName}).`);
      setLoadingPreview(false);
      return;
    }

    const { data, error } = await supabase.from(tableName).select("*").limit(100);
    if (error) {
      console.error("Preview error:", error);
      alert("Failed to load preview");
      setLoadingPreview(false);
      return;
    }
    setPreviewData(data || []);
    summarizeHealth(data);
    setLoadingPreview(false);
  };

  // 🔹 Data health
  const summarizeHealth = (data: any[]) => {
    if (!data || data.length === 0) return setHealthSummary(null);
    const total = data.length;
    const missing = data.filter((r) => r.join_status === "missing_gis").length;
    const pct = ((missing / total) * 100).toFixed(1);
    setHealthSummary(`Data health: ${total - missing}/${total} matched (${pct}% missing GIS)`);
  };

  // 🔹 Delete dataset
  const deleteDataset = async (dataset: DerivedDataset) => {
    if (!confirm(`Delete derived dataset "${dataset.title}"?`)) return;
    const { error } = await supabase
      .from("derived_dataset_metadata")
      .delete()
      .eq("id", dataset.id);
    if (error) {
      alert("Delete failed: " + error.message);
      return;
    }
    await supabase.from("derived_dataset_records").delete().eq("derived_dataset_id", dataset.id);
    alert("🗑️ Dataset deleted");
    loadDatasets();
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDatasets();
    setRefreshing(false);
  };

  return (
    <SidebarLayout
      headerProps={{
        title: `${countryIso} – Derived Datasets`,
        group: "country-config",
        breadcrumbs: (
          <Breadcrumbs
            items={[
              { label: "Dashboard", href: "/" },
              { label: "Country Configuration", href: "/country" },
              { label: countryIso, href: `/country/${countryIso}` },
              { label: "Derived Datasets", href: "#" },
            ]}
          />
        ),
      }}
    >
      <div className="p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Derived Datasets</h2>
          <div className="flex gap-2">
            <button
              onClick={handleRefresh}
              className="flex items-center gap-1 px-3 py-1.5 text-sm rounded bg-[#640811] text-white hover:opacity-90"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} /> Refresh
            </button>
            <button
              onClick={() => {
                setEditDataset(null);
                setOpenWizard(true);
              }}
              className="flex items-center gap-1 px-3 py-1.5 text-sm rounded bg-[#640811] text-white hover:opacity-90"
            >
              <Plus className="w-4 h-4" /> New
            </button>
          </div>
        </div>

        {/* Dataset Table */}
        <div className="bg-white border rounded-md overflow-hidden shadow text-sm">
          <table className="min-w-full border-collapse">
            <thead className="bg-gray-50 border-b">
              <tr>
                {[
                  ["title", "Title"],
                  ["admin_level", "Admin"],
                  ["method", "Method"],
                  ["created_at", "Created"],
                ].map(([field, label]) => (
                  <th
                    key={field}
                    className="px-3 py-2 text-left cursor-pointer select-none"
                    onClick={() => toggleSort(field as keyof DerivedDataset)}
                  >
                    <div className="flex items-center gap-1">
                      {label}
                      {sortField === field &&
                        (sortAsc ? (
                          <ChevronUp className="w-3 h-3 text-gray-500" />
                        ) : (
                          <ChevronDown className="w-3 h-3 text-gray-500" />
                        ))}
                    </div>
                  </th>
                ))}
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {datasets.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center italic text-gray-500 py-3">
                    No derived datasets found.
                  </td>
                </tr>
              ) : (
                datasets.map((ds) => (
                  <tr
                    key={ds.id}
                    className="border-b hover:bg-gray-50 cursor-pointer"
                    onClick={() => viewDataset(ds)}
                  >
                    <td className="px-3 py-2 text-[#640811] font-medium">{ds.title}</td>
                    <td className="px-3 py-2">{ds.admin_level}</td>
                    <td className="px-3 py-2">{ds.method}</td>
                    <td className="px-3 py-2">
                      {new Date(ds.created_at).toLocaleDateString()}
                    </td>
                    <td
                      className="px-3 py-2 text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex gap-2 justify-end">
                        <button
                          title="View"
                          onClick={() => viewDataset(ds)}
                          className="text-gray-700 hover:text-[#640811]"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          title="Edit"
                          onClick={() => {
                            setEditDataset(ds);
                            setOpenWizard(true);
                          }}
                          className="text-gray-700 hover:text-[#640811]"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          title="Delete"
                          onClick={() => deleteDataset(ds)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Dataset Preview */}
        {selectedDataset && (
          <div className="mt-6 bg-white border rounded-md shadow p-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-semibold text-sm">
                {selectedDataset.title} — {selectedDataset.admin_level}
              </h3>
              <button
                onClick={() => setSelectedDataset(null)}
                className="text-xs text-gray-600 hover:text-[#640811]"
              >
                Close
              </button>
            </div>

            <div className="border rounded-md bg-gray-50 p-2 text-xs mb-3 grid grid-cols-3 gap-y-1 gap-x-4">
              <div>
                <span className="font-medium text-gray-700">Method:</span>{" "}
                {selectedDataset.method}
              </div>
              <div>
                <span className="font-medium text-gray-700">Created:</span>{" "}
                {new Date(selectedDataset.created_at).toLocaleDateString()}
              </div>
              <div>
                <span className="font-medium text-gray-700">Index Ready:</span>{" "}
                {selectedDataset.is_index_ready ? "✅ Yes" : "—"}
              </div>
              {healthSummary && (
                <div className="col-span-3 text-[#640811] font-medium">
                  {healthSummary}
                </div>
              )}
            </div>

            {loadingPreview ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
                <span className="ml-2 text-gray-500 text-sm">Loading preview...</span>
              </div>
            ) : (
              <div className="max-h-80 overflow-y-auto text-xs border rounded">
                <table className="w-full">
                  <thead className="bg-gray-100">
                    <tr>
                      {previewData.length > 0 &&
                        Object.keys(previewData[0]).map((k) => (
                          <th key={k} className="p-1 text-left">
                            {k}
                          </th>
                        ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="text-center italic text-gray-500 py-2"
                        >
                          No preview data
                        </td>
                      </tr>
                    ) : (
                      previewData.map((r, i) => (
                        <tr key={i} className="border-t">
                          {Object.entries(r).map(([k, v], j) => (
                            <td key={j} className="p-1">
                              {typeof v === "number"
                                ? Number(v).toLocaleString(undefined, {
                                    maximumFractionDigits: 2,
                                  })
                                : v?.toString() ?? "—"}
                            </td>
                          ))}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Wizard Modal */}
        {openWizard && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
            <div className="bg-white rounded-lg shadow-lg max-w-6xl w-full h-[90vh] overflow-y-auto relative">
              <button
                onClick={() => setOpenWizard(false)}
                className="absolute top-3 right-3 text-gray-500 hover:text-gray-800"
              >
                ✕
              </button>
              <CreateDerivedDatasetWizard_JoinAware
                countryIso={countryIso}
                onClose={() => {
                  setOpenWizard(false);
                  loadDatasets();
                }}
                editDataset={editDataset}
              />
            </div>
          </div>
        )}
      </div>
    </SidebarLayout>
  );
}

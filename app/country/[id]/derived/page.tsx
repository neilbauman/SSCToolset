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
  Database,
  Zap,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import DerivedDatasetWizard from "@/components/country/wizard";
import type { CountryParams } from "@/app/country/types";

type Method = "ratio" | "multiply" | "sum" | "difference";

type DerivedDataset = {
  id: string;
  title: string;
  description: string | null;
  admin_level: string;
  method: string;
  created_at: string;
  updated_at?: string;
  record_count?: number;
  storage_model?: string;
  is_parametric?: boolean;
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
  const [loadingPreview, setLoadingPreview] = useState(false);

  // --- Load dataset list
  const loadDatasets = async () => {
    const { data, error } = await supabase
      .from("derived_dataset_metadata")
      .select("*")
      .eq("country_iso", countryIso)
      .order(sortField, { ascending: sortAsc });

    if (!error && data) setDatasets(data);
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

  const deleteDataset = async (dataset: DerivedDataset) => {
    if (!confirm(`Delete derived dataset "${dataset.title}"?`)) return;
    await supabase.from("derived_dataset_metadata").delete().eq("id", dataset.id);
    loadDatasets();
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDatasets();
    setRefreshing(false);
  };

  // --- Load dataset preview via RPC
  const loadPreview = async (datasetId: string) => {
    if (!datasetId) return;
    setLoadingPreview(true);

    const { data, error } = await supabase.rpc("get_derived_dataset_preview", {
      p_dataset_id: datasetId,
    });

    setLoadingPreview(false);
    if (error) {
      console.error("Preview load failed:", error.message);
      setPreviewData([]);
      return;
    }

    setPreviewData(data || []);
  };

  // --- Materialize dataset
  const handleMaterialize = async (dataset: DerivedDataset) => {
    if (!dataset) return;
    const { error } = await supabase.rpc("materialize_derived_dataset", {
      p_dataset_id: dataset.id,
    });

    if (error) {
      alert("Materialize failed: " + error.message);
      return;
    }

    alert(`✅ "${dataset.title}" materialized successfully.`);
    loadDatasets();
    loadPreview(dataset.id);
  };

  // --- Dematerialize dataset
  const handleDematerialize = async (dataset: DerivedDataset) => {
    if (!dataset) return;
    if (!confirm(`Dematerialize "${dataset.title}"? This will delete stored data but keep metadata.`))
      return;

    const { error } = await supabase.rpc("dematerialize_derived_dataset", {
      p_dataset_id: dataset.id,
    });

    if (error) {
      alert("Dematerialize failed: " + error.message);
      return;
    }

    alert(`🗑️ "${dataset.title}" dematerialized successfully.`);
    loadDatasets();
    setPreviewData([]);
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
        {/* --- Header Controls --- */}
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

        {/* --- Dataset Table --- */}
        <div className="bg-white border rounded-md overflow-hidden shadow text-sm">
          <table className="min-w-full border-collapse">
            <thead className="bg-gray-50 border-b">
              <tr>
                {[
                  ["title", "Title"],
                  ["description", "Description"],
                  ["admin_level", "Admin"],
                  ["storage_model", "Type"],
                  ["record_count", "Records"],
                  ["method", "Method"],
                  ["updated_at", "Updated"],
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
                  <td colSpan={8} className="text-center italic text-gray-500 py-3">
                    No derived datasets found.
                  </td>
                </tr>
              ) : (
                datasets.map((ds) => (
                  <tr
                    key={ds.id}
                    className={`border-b hover:bg-gray-50 cursor-pointer ${
                      selectedDataset?.id === ds.id ? "bg-gray-100" : ""
                    }`}
                    onClick={() => {
                      setSelectedDataset(ds);
                      loadPreview(ds.id);
                    }}
                  >
                    <td className="px-3 py-2 text-[#640811] font-medium">{ds.title}</td>
                    <td className="px-3 py-2 text-gray-700">{ds.description || "—"}</td>
                    <td className="px-3 py-2">{ds.admin_level}</td>
                    <td className="px-3 py-2">
                      {ds.storage_model === "fixed" ? (
                        <span className="px-2 py-0.5 rounded text-xs bg-green-100 text-green-800">
                          Fixed
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-xs bg-yellow-100 text-yellow-800">
                          Parametric
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2">{ds.record_count ?? 0}</td>
                    <td className="px-3 py-2">{ds.method}</td>
                    <td className="px-3 py-2">
                      {new Date(ds.updated_at || ds.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <div className="flex gap-2 justify-end">
                        <button
                          title="Preview"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedDataset(ds);
                            loadPreview(ds.id);
                          }}
                          className="text-gray-600 hover:text-[#640811]"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          title="Materialize"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMaterialize(ds);
                          }}
                          className="text-gray-600 hover:text-[#640811]"
                        >
                          <Database className="w-4 h-4" />
                        </button>
                        <button
                          title="Edit"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditDataset({
                              ...ds,
                              method: (ds.method as Method) || "ratio",
                            });
                            setOpenWizard(true);
                          }}
                          className="text-gray-600 hover:text-[#640811]"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          title="Delete"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteDataset(ds);
                          }}
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

        {/* --- Preview Panel --- */}
        {selectedDataset && (
          <div className="bg-white border rounded-md shadow p-4">
            <div className="flex justify-between items-center mb-2">
              <div>
                <h3 className="text-md font-semibold text-[#640811]">
                  {selectedDataset.title}
                </h3>
                <p className="text-xs text-gray-500">
                  {selectedDataset.record_count ?? 0} records ·{" "}
                  {selectedDataset.storage_model ?? "parametric"} · Last updated{" "}
                  {new Date(selectedDataset.updated_at || selectedDataset.created_at).toLocaleString()}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleMaterialize(selectedDataset)}
                  className="px-3 py-1 text-white rounded bg-[#640811] hover:opacity-90 flex items-center gap-1 text-sm"
                >
                  <Zap className="w-4 h-4" /> Rematerialize
                </button>
                <button
                  onClick={() => handleDematerialize(selectedDataset)}
                  className="px-3 py-1 text-white rounded bg-red-600 hover:bg-red-700 flex items-center gap-1 text-sm"
                >
                  <Trash2 className="w-4 h-4" /> Dematerialize
                </button>
              </div>
            </div>

            <div className="max-h-96 overflow-y-auto border rounded text-xs">
              {loadingPreview ? (
                <p className="text-center italic text-gray-500 py-3">Loading preview...</p>
              ) : previewData.length === 0 ? (
                <p className="text-center italic text-gray-500 py-3">
                  No data available. Try materializing the dataset first.
                </p>
              ) : (
                <table className="w-full">
                  <thead className="bg-gray-100 sticky top-0">
                    <tr>
                      {Object.keys(previewData[0]).map((key) => (
                        <th key={key} className="p-1 text-left">
                          {key}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.map((row, i) => (
                      <tr key={i} className="border-t hover:bg-gray-50">
                        {Object.entries(row).map(([k, v]) => (
                          <td key={k} className="p-1">
                            {v === null ? "—" : String(v)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* --- Wizard Modal --- */}
        {openWizard && (
          <DerivedDatasetWizard
            open={openWizard}
            onClose={() => {
              setOpenWizard(false);
              loadDatasets();
            }}
            countryIso={countryIso}
            editDataset={editDataset as any}
          />
        )}
      </div>
    </SidebarLayout>
  );
}

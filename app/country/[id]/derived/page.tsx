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
  Database,
  Activity,
  Layers,
} from "lucide-react";
import DerivedDatasetWizard from "@/components/country/wizard";
import type { CountryParams } from "@/app/country/types";

type Method = "ratio" | "multiply" | "sum" | "difference";

interface DerivedDataset {
  id: string;
  title: string;
  description: string | null;
  admin_level: string;
  method: Method;
  is_parametric: boolean | null;
  normalize_percent: boolean | null;
  decimals?: number | null;
  record_count?: number | null;
  created_at: string;
}

export default function DerivedDatasetsPage({
  params,
}: {
  params: CountryParams;
}) {
  const countryIso = params.id;
  const [datasets, setDatasets] = useState<DerivedDataset[]>([]);
  const [selectedDataset, setSelectedDataset] =
    useState<DerivedDataset | null>(null);
  const [preview, setPreview] = useState<any[]>([]);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [sortField, setSortField] =
    useState<keyof DerivedDataset>("created_at");
  const [sortAsc, setSortAsc] = useState(false);
  const [editDataset, setEditDataset] = useState<DerivedDataset | null>(null);
  const [openWizard, setOpenWizard] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // --- Load metadata
  const loadDatasets = async () => {
    const { data, error } = await supabase
      .from("derived_dataset_metadata")
      .select("*")
      .eq("country_iso", countryIso)
      .order(sortField, { ascending: sortAsc });

    if (error) {
      console.error("Error loading derived datasets:", error);
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

  // --- Load preview
  const loadPreview = async (dataset: DerivedDataset) => {
    if (!dataset?.id) return;
    setLoadingPreview(true);
    const tableName = `derived_${dataset.id}`;
    const { data, error } = await supabase
      .from(tableName)
      .select("*")
      .limit(25);

    setLoadingPreview(false);
    if (error) {
      console.error("Error loading preview:", error);
      setPreview([]);
    } else setPreview(data || []);
  };

  // --- When selecting dataset
  const handleSelectDataset = (ds: DerivedDataset) => {
    setSelectedDataset(ds);
    loadPreview(ds);
  };

  // --- Helpers for visual health indicators
  const getHealthColor = (count?: number | null) => {
    if (count == null) return "bg-gray-200 text-gray-600";
    if (count > 5000) return "bg-green-100 text-green-800";
    if (count > 1000) return "bg-yellow-100 text-yellow-700";
    return "bg-red-100 text-red-700";
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
        {/* ---- Header Actions ---- */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Derived Datasets</h2>
          <div className="flex gap-2">
            <button
              onClick={handleRefresh}
              className="flex items-center gap-1 px-3 py-1.5 text-sm rounded bg-[#640811] text-white hover:opacity-90"
            >
              <RefreshCw
                className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`}
              />{" "}
              Refresh
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

        {/* ---- Dataset List ---- */}
        <div className="bg-white border rounded-md overflow-hidden shadow text-sm">
          <table className="min-w-full border-collapse">
            <thead className="bg-gray-50 border-b">
              <tr>
                {[
                  ["title", "Name"],
                  ["admin_level", "Admin"],
                  ["method", "Method"],
                  ["is_parametric", "Type"],
                  ["normalize_percent", "Format"],
                  ["record_count", "Records"],
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
                  <td
                    colSpan={8}
                    className="text-center italic text-gray-500 py-3"
                  >
                    No derived datasets found.
                  </td>
                </tr>
              ) : (
                datasets.map((ds) => (
                  <tr
                    key={ds.id}
                    onClick={() => handleSelectDataset(ds)}
                    className={`border-b hover:bg-gray-50 cursor-pointer ${
                      selectedDataset?.id === ds.id ? "bg-gray-100" : ""
                    }`}
                  >
                    <td className="px-3 py-2 font-medium text-[#640811]">
                      {ds.title}
                    </td>
                    <td className="px-3 py-2">{ds.admin_level}</td>
                    <td className="px-3 py-2">{ds.method}</td>
                    <td className="px-3 py-2">
                      {ds.is_parametric ? "Parametric" : "Fixed"}
                    </td>
                    <td className="px-3 py-2">
                      {ds.normalize_percent ? "Percent" : "Numeric"}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`px-2 py-0.5 rounded text-xs ${getHealthColor(
                          ds.record_count
                        )}`}
                      >
                        {ds.record_count ?? 0}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      {new Date(ds.created_at).toLocaleDateString()}
                    </td>
                    <td
                      className="px-3 py-2 text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex gap-2 justify-end">
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

        {/* ---- Preview Panel ---- */}
        {selectedDataset && (
          <div className="mt-6 bg-white border rounded-md shadow p-4">
            <div className="flex justify-between items-center mb-3">
              <div>
                <h3 className="text-lg font-semibold text-[#640811]">
                  {selectedDataset.title}
                </h3>
                {selectedDataset.description && (
                  <p className="text-xs text-gray-600">
                    {selectedDataset.description}
                  </p>
                )}
              </div>
              <div className="flex gap-2 text-xs">
                <span className="px-2 py-0.5 bg-gray-100 rounded border text-gray-700">
                  {selectedDataset.admin_level}
                </span>
                <span className="px-2 py-0.5 bg-gray-100 rounded border text-gray-700">
                  {selectedDataset.method}
                </span>
                <span className="px-2 py-0.5 bg-gray-100 rounded border text-gray-700">
                  {selectedDataset.is_parametric ? "Parametric" : "Fixed"}
                </span>
                <span className="px-2 py-0.5 bg-gray-100 rounded border text-gray-700">
                  {selectedDataset.normalize_percent ? "Percent" : "Numeric"}
                </span>
                <span
                  className={`px-2 py-0.5 rounded border ${getHealthColor(
                    selectedDataset.record_count
                  )}`}
                >
                  {selectedDataset.record_count ?? 0} records
                </span>
              </div>
            </div>

            {loadingPreview ? (
              <div className="text-center text-gray-500 py-5 text-sm">
                Loading preview...
              </div>
            ) : preview.length === 0 ? (
              <div className="text-center text-gray-500 py-5 text-sm italic">
                No data available in this derived dataset.
              </div>
            ) : (
              <div className="max-h-[60vh] overflow-auto border rounded text-xs">
                <table className="min-w-full border-collapse">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      {Object.keys(preview[0] || {}).map((key) => (
                        <th
                          key={key}
                          className="text-left px-2 py-1 border-b font-medium"
                        >
                          {key}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((row, i) => (
                      <tr key={i} className="border-t hover:bg-gray-50">
                        {Object.entries(row).map(([k, v], j) => (
                          <td key={j} className="px-2 py-1 border-b">
                            {v == null ? "—" : String(v)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ---- Wizard ---- */}
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

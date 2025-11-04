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
  Database,
} from "lucide-react";
import DerivedDatasetWizard from "@/components/country/wizard";
import type { CountryParams } from "@/app/country/types";

type UnifiedDataset = {
  dataset_id: string;
  title: string;
  country_iso: string;
  admin_level: string;
  dataset_type: string;
  method?: string | null;
  formula?: string | null;
  schema_name: string;
  table_name: string;
  created_at?: string;
};

export default function DerivedDatasetsPage({ params }: { params: CountryParams }) {
  const countryIso = params.id;
  const [datasets, setDatasets] = useState<UnifiedDataset[]>([]);
  const [sortField, setSortField] = useState<keyof UnifiedDataset>("title");
  const [sortAsc, setSortAsc] = useState(true);
  const [selectedDataset, setSelectedDataset] = useState<UnifiedDataset | null>(null);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [openWizard, setOpenWizard] = useState(false);
  const [editDataset, setEditDataset] = useState<UnifiedDataset | null>(null);
  const [loading, setLoading] = useState(false);

  // -------------------------------
  // Load datasets from unified_datasets
  // -------------------------------
  const loadDatasets = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("unified_datasets")
      .select("*")
      .eq("country_iso", countryIso)
      .eq("dataset_type", "derived");
    if (!error && data) setDatasets(data);
    setLoading(false);
  };

  useEffect(() => {
    loadDatasets();
  }, [countryIso]);

  const sorted = [...datasets].sort((a, b) => {
    const av = (a[sortField] || "") as string;
    const bv = (b[sortField] || "") as string;
    return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av);
  });

  const toggleSort = (field: keyof UnifiedDataset) => {
    if (sortField === field) setSortAsc(!sortAsc);
    else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  // -------------------------------
  // Delete dataset
  // -------------------------------
  const deleteDataset = async (ds: UnifiedDataset) => {
    if (!confirm(`Delete derived dataset "${ds.title}"?`)) return;
    await supabase.from("unified_datasets").delete().eq("dataset_id", ds.dataset_id);
    loadDatasets();
  };

  // -------------------------------
  // Preview dataset
  // -------------------------------
  const handleSelect = async (ds: UnifiedDataset) => {
    setSelectedDataset(ds);
    setPreviewData([]);
    if (!ds.schema_name || !ds.table_name) {
      alert("Dataset has no table assigned.");
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from(`${ds.schema_name}.${ds.table_name}`)
      .select("*")
      .limit(100);
    setLoading(false);
    if (error) {
      alert("Error loading data: " + error.message);
      return;
    }
    setPreviewData(data || []);
  };

  // -------------------------------
  // Page render
  // -------------------------------
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
              onClick={loadDatasets}
              className="flex items-center gap-1 px-3 py-1.5 text-sm rounded bg-[#640811] text-white hover:opacity-90"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
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

        {/* Table */}
        <div className="bg-white border rounded-md overflow-hidden shadow text-sm">
          <table className="min-w-full border-collapse">
            <thead className="bg-gray-50 border-b">
              <tr>
                {[
                  ["title", "Title"],
                  ["admin_level", "Admin"],
                  ["method", "Method"],
                  ["dataset_type", "Type"],
                ].map(([f, l]) => (
                  <th
                    key={f}
                    className="px-3 py-2 text-left cursor-pointer select-none"
                    onClick={() => toggleSort(f as keyof UnifiedDataset)}
                  >
                    <div className="flex items-center gap-1">
                      {l}
                      {sortField === f &&
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
              {sorted.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center italic text-gray-500 py-3">
                    No derived datasets found.
                  </td>
                </tr>
              ) : (
                sorted.map((ds) => (
                  <tr
                    key={ds.dataset_id}
                    className={`border-b hover:bg-gray-50 ${
                      selectedDataset?.dataset_id === ds.dataset_id ? "bg-gray-100" : ""
                    }`}
                  >
                    <td
                      className="px-3 py-2 text-[#640811] font-medium cursor-pointer"
                      onClick={() => handleSelect(ds)}
                    >
                      {ds.title}
                    </td>
                    <td className="px-3 py-2">{ds.admin_level}</td>
                    <td className="px-3 py-2">{ds.method ?? "—"}</td>
                    <td className="px-3 py-2">{ds.dataset_type}</td>
                    <td className="px-3 py-2 text-right">
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

        {/* Preview */}
        {selectedDataset && (
          <div className="border rounded-md bg-white shadow p-4">
            <div className="flex justify-between mb-2">
              <h3 className="font-semibold text-sm">
                {selectedDataset.title} — {selectedDataset.admin_level}
              </h3>
              {loading && <Loader2 className="animate-spin w-4 h-4 text-gray-500" />}
            </div>

            <div className="max-h-72 overflow-y-auto border rounded text-xs">
              <table className="w-full">
                <thead className="bg-gray-100 sticky top-0">
                  <tr>
                    <th className="p-1 text-left">Admin PCode</th>
                    <th className="p-1 text-right">Value</th>
                  </tr>
                </thead>
                <tbody>
                  {previewData.length === 0 ? (
                    <tr>
                      <td colSpan={2} className="text-center italic text-gray-500 py-2">
                        No preview data
                      </td>
                    </tr>
                  ) : (
                    previewData.map((r, i) => (
                      <tr key={i} className="border-t hover:bg-gray-50">
                        <td className="p-1">{r.admin_pcode ?? r.out_join_key}</td>
                        <td className="p-1 text-right">
                          {typeof r.value === "number" ? r.value.toFixed(2) : r.value ?? "—"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Wizard */}
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

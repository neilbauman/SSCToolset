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
  Loader2,
  Info,
} from "lucide-react";
import DerivedDatasetWizard from "@/components/country/wizard";
import type { CountryParams } from "@/app/country/types";

type DerivedDataset = {
  id: string;
  title: string;
  description: string | null;
  admin_level: string;
  method: string;
  created_at: string;
  taxonomy_categories?: string[];
  taxonomy_terms?: string[];
  storage_model?: string;
  is_index_ready?: boolean;
  record_count?: number;
  is_parametric?: boolean;
};

export default function DerivedDatasetsPage({ params }: { params: CountryParams }) {
  const countryIso = params.id;
  const [datasets, setDatasets] = useState<DerivedDataset[]>([]);
  const [sortField, setSortField] = useState<keyof DerivedDataset>("title");
  const [sortAsc, setSortAsc] = useState(true);
  const [selectedDataset, setSelectedDataset] = useState<DerivedDataset | null>(null);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [openWizard, setOpenWizard] = useState(false);
  const [editDataset, setEditDataset] = useState<DerivedDataset | null>(null);
  const [loading, setLoading] = useState(false);

  const loadDatasets = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("derived_dataset_metadata")
      .select("*")
      .eq("country_iso", countryIso);
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

  const toggleSort = (field: keyof DerivedDataset) => {
    if (sortField === field) setSortAsc(!sortAsc);
    else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const deleteDataset = async (ds: DerivedDataset) => {
    if (!confirm(`Delete derived dataset "${ds.title}"?`)) return;
    await supabase.from("derived_dataset_metadata").delete().eq("id", ds.id);
    loadDatasets();
  };

  const handleMaterialize = async (ds: DerivedDataset) => {
    if (!confirm(`Materialize dataset "${ds.title}"?`)) return;
    setLoading(true);
    const { error } = await supabase.rpc("materialize_derived_dataset", { p_dataset_id: ds.id });
    setLoading(false);
    if (error) return alert("❌ Materialize error: " + error.message);
    alert("✅ Materialized successfully.");
    loadDatasets();
  };

  const handleSelect = async (ds: DerivedDataset) => {
    setSelectedDataset(ds);
    setPreviewData([]);
    const { data, error } = await supabase.rpc("get_dataset_values", { p_dataset_id: ds.id });
    if (error) {
      alert("Error loading data: " + error.message);
      return;
    }
    setPreviewData(data || []);
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
                  ["storage_model", "Model"],
                  ["record_count", "Records"],
                ].map(([f, l]) => (
                  <th
                    key={f}
                    className="px-3 py-2 text-left cursor-pointer select-none"
                    onClick={() => toggleSort(f as keyof DerivedDataset)}
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
                <th className="px-3 py-2 text-left">Taxonomy</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center italic text-gray-500 py-3">
                    No derived datasets found.
                  </td>
                </tr>
              ) : (
                sorted.map((ds) => (
                  <tr
                    key={ds.id}
                    className={`border-b hover:bg-gray-50 ${
                      selectedDataset?.id === ds.id ? "bg-gray-100" : ""
                    }`}
                  >
                    <td
                      className="px-3 py-2 text-[#640811] font-medium cursor-pointer"
                      onClick={() => handleSelect(ds)}
                    >
                      {ds.title}
                    </td>
                    <td className="px-3 py-2">{ds.admin_level}</td>
                    <td className="px-3 py-2">{ds.method}</td>
                    <td className="px-3 py-2">
                      <span
                        className={`px-2 py-0.5 rounded text-xs ${
                          ds.storage_model === "fixed"
                            ? "bg-green-100 text-green-700"
                            : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {ds.storage_model === "fixed" ? "Fixed" : "Parametric"}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right">{ds.record_count ?? 0}</td>
                    <td className="px-3 py-2">
                      {(ds.taxonomy_terms || [])
                        .slice(0, 3)
                        .map((t, i) => (
                          <span
                            key={i}
                            className="inline-block bg-gray-100 text-gray-700 text-xs rounded px-2 py-0.5 mr-1"
                          >
                            {t}
                          </span>
                        ))}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <div className="flex gap-2 justify-end">
                        {ds.storage_model !== "fixed" && (
                          <button
                            title="Materialize"
                            onClick={() => handleMaterialize(ds)}
                            className="text-gray-700 hover:text-green-700"
                          >
                            <Database className="w-4 h-4" />
                          </button>
                        )}
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

        {/* Inline Data Panel */}
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
                    <th className="p-1 text-left">PCode</th>
                    <th className="p-1 text-left">Admin Name</th>
                    <th className="p-1 text-right">Value</th>
                  </tr>
                </thead>
                <tbody>
                  {previewData.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="text-center italic text-gray-500 py-2">
                        No preview data
                      </td>
                    </tr>
                  ) : (
                    previewData.map((r, i) => (
                      <tr key={i} className="border-t hover:bg-gray-50">
                        <td className="p-1">{r.admin_pcode || r.out_join_key}</td>
                        <td className="p-1">{r.out_place_name || r.place_name || r.name || "—"}</td>
                        <td className="p-1 text-right">
                          {typeof (r.value ?? r.out_derived) === "number"
                            ? (r.value ?? r.out_derived).toFixed(1)
                            : r.value ?? r.out_derived ?? "—"}
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

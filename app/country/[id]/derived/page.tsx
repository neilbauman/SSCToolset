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
  Zap,
  Trash,
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
  created_at: string;
  updated_at?: string;
  record_count?: number;
  storage_model?: string;
  is_index_ready?: boolean;
}

export default function DerivedDatasetsPage({ params }: { params: CountryParams }) {
  const countryIso = params.id;
  const [datasets, setDatasets] = useState<DerivedDataset[]>([]);
  const [sortField, setSortField] = useState<keyof DerivedDataset>("created_at");
  const [sortAsc, setSortAsc] = useState(false);
  const [selected, setSelected] = useState<DerivedDataset | null>(null);
  const [openWizard, setOpenWizard] = useState(false);
  const [editDataset, setEditDataset] = useState<DerivedDataset | null>(null);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const ACCENT = "#640811";

  const loadDatasets = async () => {
    const { data, error } = await supabase
      .from("derived_dataset_metadata")
      .select("*")
      .eq("country_iso", countryIso)
      .order(sortField, { ascending: sortAsc });

    if (error) console.error(error);
    if (data) setDatasets(data);
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

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDatasets();
    setRefreshing(false);
  };

  const deleteDataset = async (dataset: DerivedDataset) => {
    if (!confirm(`Delete derived dataset "${dataset.title}"? This cannot be undone.`)) return;
    await supabase.from("derived_dataset_metadata").delete().eq("id", dataset.id);
    loadDatasets();
  };

  const materializeDataset = async (dataset: DerivedDataset) => {
    if (!confirm(`Materialize dataset "${dataset.title}" now?`)) return;
    const { error } = await supabase.rpc("materialize_derived_dataset", { p_dataset_id: dataset.id });
    if (error) alert("Materialize failed: " + error.message);
    else alert("✅ Dataset materialized successfully.");
    loadDatasets();
  };

  const dematerializeDataset = async (dataset: DerivedDataset) => {
    if (!confirm(`Dematerialize dataset "${dataset.title}"? This will delete stored records but keep its definition.`)) return;
    const { error } = await supabase.rpc("dematerialize_derived_dataset", { p_dataset_id: dataset.id });
    if (error) alert("Dematerialize failed: " + error.message);
    else alert("🧹 Dataset dematerialized (definition retained).");
    loadDatasets();
  };

  const viewDataset = async (dataset: DerivedDataset) => {
    setSelected(dataset);
    setLoadingPreview(true);
    const tableName = `derived_${dataset.id}`;
    const { data, error } = await supabase.rpc("execute_dynamic_sql", {
      sql: `SELECT out_place_name, out_derived, out_join_status FROM "${tableName}" LIMIT 100`,
    });
    setLoadingPreview(false);
    if (error) {
      setPreviewData([]);
      console.warn("No records or preview unavailable:", error.message);
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
      <div className="p-6 space-y-6">
        {/* --- Header Bar --- */}
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

        {/* --- Dataset List --- */}
        <div className="bg-white border rounded-md overflow-hidden shadow text-sm">
          <table className="min-w-full border-collapse">
            <thead className="bg-gray-50 border-b text-xs uppercase text-gray-600">
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
                  <td colSpan={8} className="text-center italic text-gray-500 py-4">
                    No derived datasets found.
                  </td>
                </tr>
              ) : (
                datasets.map((ds) => (
                  <tr
                    key={ds.id}
                    className={`border-b hover:bg-gray-50 ${
                      selected?.id === ds.id ? "bg-gray-100" : ""
                    }`}
                  >
                    <td className="px-3 py-2 font-medium text-[#640811]">{ds.title}</td>
                    <td className="px-3 py-2 text-gray-600">{ds.description || "—"}</td>
                    <td className="px-3 py-2">{ds.admin_level}</td>
                    <td className="px-3 py-2">
                      {ds.storage_model === "fixed" ? (
                        <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs">Fixed</span>
                      ) : (
                        <span className="bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded text-xs">Parametric</span>
                      )}
                    </td>
                    <td className="px-3 py-2">{ds.record_count ?? 0}</td>
                    <td className="px-3 py-2">{ds.method}</td>
                    <td className="px-3 py-2">
                      {ds.updated_at ? new Date(ds.updated_at).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <div className="flex justify-end gap-2">
                        <button title="View" onClick={() => viewDataset(ds)} className="text-gray-700 hover:text-[#640811]">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button title="Materialize" onClick={() => materializeDataset(ds)} className="text-gray-700 hover:text-[#640811]">
                          <Database className="w-4 h-4" />
                        </button>
                        {ds.storage_model === "fixed" && (
                          <button
                            title="Dematerialize"
                            onClick={() => dematerializeDataset(ds)}
                            className="text-gray-700 hover:text-red-600"
                          >
                            <Trash className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          title="Edit"
                          onClick={() => {
                            setEditDataset({
                              ...ds,
                              method: (ds.method as Method) || "ratio",
                            });
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

        {/* --- Preview Panel --- */}
        {selected && (
          <div className="bg-white border rounded-md shadow p-4 text-sm">
            <div className="flex justify-between items-center mb-3">
              <div>
                <h3 className="text-base font-semibold text-[#640811]">{selected.title}</h3>
                <p className="text-xs text-gray-600">
                  {selected.record_count ?? 0} records · {selected.storage_model || "parametric"} ·{" "}
                  Last updated {selected.updated_at ? new Date(selected.updated_at).toLocaleString() : "—"}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => materializeDataset(selected)}
                  className="flex items-center gap-1 px-2 py-1 rounded text-xs text-white"
                  style={{ background: ACCENT }}
                >
                  <Zap className="w-3 h-3" /> Rematerialize
                </button>
                {selected.storage_model === "fixed" && (
                  <button
                    onClick={() => dematerializeDataset(selected)}
                    className="flex items-center gap-1 px-2 py-1 rounded text-xs text-red-600 border border-red-300"
                  >
                    <Trash className="w-3 h-3" /> Dematerialize
                  </button>
                )}
              </div>
            </div>

            {loadingPreview ? (
              <p className="italic text-gray-500 text-center py-6">Loading data preview…</p>
            ) : previewData.length === 0 ? (
              <p className="italic text-gray-500 text-center py-6">
                No data available. Try materializing the dataset first.
              </p>
            ) : (
              <div className="max-h-80 overflow-y-auto border rounded">
                <table className="w-full text-xs">
                  <thead className="bg-gray-100 sticky top-0">
                    <tr>
                      {Object.keys(previewData[0]).map((k) => (
                        <th key={k} className="p-1 text-left">
                          {k}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.map((r, i) => (
                      <tr key={i} className="border-t hover:bg-gray-50">
                        {Object.entries(r).map(([k, v], j) => (
                          <td key={j} className="p-1">
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

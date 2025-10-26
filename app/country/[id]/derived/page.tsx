"use client";

import { useEffect, useState } from "react";
import {
  Eye,
  RefreshCw,
  Pencil,
  Trash2,
  Zap,
  ArrowUpDown,
  XCircle,
} from "lucide-react";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import type { CountryParams } from "@/app/country/types";
import CreateDerivedDatasetWizard_JoinAware from "@/components/country/CreateDerivedDatasetWizard_JoinAware";

type DerivedDataset = {
  id: string;
  title: string;
  description: string | null;
  admin_level: string;
  method: string | null;
  formula: string | null;
  dynamic_resolution: boolean;
  created_at: string;
  updated_at: string | null;
  country_iso: string;
};

export default function DerivedDatasetsPage({ params }: { params: CountryParams }) {
  const { id: countryIso } = params;
  const [datasets, setDatasets] = useState<DerivedDataset[]>([]);
  const [selectedDataset, setSelectedDataset] = useState<DerivedDataset | null>(null);
  const [dataPreview, setDataPreview] = useState<any[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [openWizard, setOpenWizard] = useState(false);
  const [editDataset, setEditDataset] = useState<DerivedDataset | null>(null);
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortAsc, setSortAsc] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState<DerivedDataset | null>(null);
  const [toasts, setToasts] = useState<{ id: number; msg: string }[]>([]);

  const showToast = (msg: string) => {
    const id = Date.now();
    setToasts((t) => [...t, { id, msg }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
  };

  // ───────────────────────────────
  // Fetch all derived datasets
  // ───────────────────────────────
  async function fetchDerived() {
    const { data, error } = await supabase
      .from("derived_dataset_metadata")
      .select("*")
      .eq("country_iso", countryIso)
      .order("created_at", { ascending: false });
    if (error) console.error(error);
    else setDatasets(data || []);
  }

  useEffect(() => {
    fetchDerived();
  }, [countryIso]);

  // ───────────────────────────────
  // View dataset preview
  // ───────────────────────────────
  async function viewDataset(dataset: DerivedDataset) {
    setSelectedDataset(dataset);
    setLoadingPreview(true);
    try {
      const tableName = `derived_pop_density_${dataset.admin_level.toLowerCase()}`;
      const { data, error } = await supabase.from(tableName).select("*").limit(200);
      if (error) throw error;
      setDataPreview(data || []);
      setColumns(data?.length ? Object.keys(data[0]) : []);
    } catch (err: any) {
      showToast("Failed to load dataset preview: " + err.message);
    } finally {
      setLoadingPreview(false);
    }
  }

  // ───────────────────────────────
  // Sort preview data
  // ───────────────────────────────
  function sortData(col: string) {
    if (!dataPreview.length) return;
    const newAsc = sortCol === col ? !sortAsc : true;
    const sorted = [...dataPreview].sort((a, b) => {
      const valA = a[col];
      const valB = b[col];
      const numA = parseFloat(valA);
      const numB = parseFloat(valB);
      if (!isNaN(numA) && !isNaN(numB)) return newAsc ? numA - numB : numB - numA;
      return newAsc
        ? String(valA ?? "").localeCompare(String(valB ?? ""))
        : String(valB ?? "").localeCompare(String(valA ?? ""));
    });
    setDataPreview(sorted);
    setSortCol(col);
    setSortAsc(newAsc);
  }

  // ───────────────────────────────
  // Refresh derived (edge function)
  // ───────────────────────────────
  async function refreshDerived(dataset: DerivedDataset) {
    try {
      setRefreshing(true);
      const { error } = await supabase.functions.invoke("auto-refresh-popdensity", {
        body: { country_iso: countryIso },
      });
      if (error) throw error;
      showToast(`✅ Triggered refresh for ${dataset.title}`);
      await fetchDerived();
    } catch (err: any) {
      showToast("❌ Refresh failed: " + err.message);
    } finally {
      setRefreshing(false);
    }
  }

  // ───────────────────────────────
  // Delete dataset (confirmation modal)
  // ───────────────────────────────
  async function deleteDerivedConfirmed() {
    if (!confirmDelete) return;
    try {
      const { error } = await supabase
        .from("derived_dataset_metadata")
        .delete()
        .eq("id", confirmDelete.id);
      if (error) throw error;
      showToast(`🗑️ Deleted ${confirmDelete.title}`);
      if (selectedDataset?.id === confirmDelete.id) setSelectedDataset(null);
      setConfirmDelete(null);
      await fetchDerived();
    } catch (err: any) {
      showToast("❌ Delete failed: " + err.message);
    }
  }

  // ───────────────────────────────
  // Render
  // ───────────────────────────────
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
              { label: "Derived", href: "#" },
            ]}
          />
        ),
      }}
    >
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Derived Datasets</h2>
          <button
            onClick={() => {
              setEditDataset(null);
              setOpenWizard(true);
            }}
            className="flex items-center gap-1 px-3 py-1.5 text-sm rounded bg-[#640811] text-white hover:opacity-90"
          >
            <Zap className="w-4 h-4" /> New Derived
          </button>
        </div>

        {/* Dataset Table */}
        <div className="bg-white border rounded-md overflow-hidden text-sm shadow">
          <table className="min-w-full border-collapse">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-3 py-2 text-left">Title</th>
                <th className="px-3 py-2 text-left">Admin Level</th>
                <th className="px-3 py-2 text-left">Method</th>
                <th className="px-3 py-2 text-left">Formula</th>
                <th className="px-3 py-2 text-left">Dynamic</th>
                <th className="px-3 py-2 text-left">Created</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {datasets.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center italic text-gray-500 py-3">
                    No derived datasets yet.
                  </td>
                </tr>
              ) : (
                datasets.map((d) => (
                  <tr
                    key={d.id}
                    onClick={() => viewDataset(d)}
                    className={`border-b hover:bg-gray-50 cursor-pointer ${
                      selectedDataset?.id === d.id ? "bg-gray-100" : ""
                    }`}
                  >
                    <td className="px-3 py-2 text-[#640811] font-medium hover:underline">
                      {d.title}
                    </td>
                    <td className="px-3 py-2">{d.admin_level}</td>
                    <td className="px-3 py-2">{d.method ?? "—"}</td>
                    <td className="px-3 py-2">{d.formula ?? "—"}</td>
                    <td className="px-3 py-2">
                      {d.dynamic_resolution ? "Auto" : "Manual"}
                    </td>
                    <td className="px-3 py-2 text-gray-500">
                      {new Date(d.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-3 py-2 text-right space-x-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          viewDataset(d);
                        }}
                        className="text-blue-600 hover:text-blue-800"
                        title="View Dataset"
                      >
                        <Eye className="w-4 h-4 inline" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditDataset(d);
                          setOpenWizard(true);
                        }}
                        className="text-gray-700 hover:text-gray-900"
                        title="Edit"
                      >
                        <Pencil className="w-4 h-4 inline" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmDelete(d);
                        }}
                        className="text-red-600 hover:text-red-800"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4 inline" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Dataset Viewer */}
        {selectedDataset && (
          <div className="bg-white border rounded-md p-4 shadow-md">
            <div className="flex justify-between mb-2">
              <h3 className="text-md font-semibold">
                {selectedDataset.title} — Preview
              </h3>
              {loadingPreview && <span className="text-gray-500 text-sm">Loading…</span>}
            </div>

            <div className="overflow-x-auto max-h-[400px] overflow-y-auto border rounded">
              {dataPreview.length === 0 ? (
                <div className="text-center p-6 text-gray-500">
                  {loadingPreview ? "Loading data…" : "No records found."}
                </div>
              ) : (
                <table className="min-w-full text-xs border-collapse">
                  <thead className="bg-gray-50 border-b sticky top-0">
                    <tr>
                      {columns.map((c) => (
                        <th
                          key={c}
                          onClick={() => sortData(c)}
                          className="px-2 py-1 text-left border-b cursor-pointer hover:bg-gray-100 select-none"
                        >
                          {c}{" "}
                          {sortCol === c && (
                            <ArrowUpDown
                              className={`inline w-3 h-3 ml-1 ${
                                sortAsc ? "rotate-180" : ""
                              }`}
                            />
                          )}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {dataPreview.map((row, i) => (
                      <tr key={i} className="border-b hover:bg-gray-50">
                        {columns.map((col) => (
                          <td key={col} className="px-2 py-1">
                            {String(row[col] ?? "—")}
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

        {/* Wizard */}
        {openWizard && (
          <CreateDerivedDatasetWizard_JoinAware
            open={openWizard}
            onClose={() => {
              setOpenWizard(false);
              setEditDataset(null);
            }}
            onSaved={() => {
              fetchDerived();
              showToast("✅ Dataset list refreshed");
            }}
            countryIso={countryIso}
            editDataset={editDataset}
          />
        )}

        {/* Delete Confirmation Modal */}
        {confirmDelete && (
          <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
            <div className="bg-white rounded-xl p-6 w-[90%] max-w-sm shadow-lg">
              <div className="flex items-center gap-2 mb-3">
                <XCircle className="w-6 h-6 text-red-600" />
                <h3 className="text-lg font-semibold">Delete Derived Dataset</h3>
              </div>
              <p className="text-sm mb-4">
                Are you sure you want to permanently delete{" "}
                <span className="font-medium text-[#640811]">
                  {confirmDelete.title}
                </span>
                ?
              </p>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setConfirmDelete(null)}
                  className="px-3 py-1 border rounded"
                >
                  Cancel
                </button>
                <button
                  onClick={deleteDerivedConfirmed}
                  className="px-3 py-1 bg-[#640811] text-white rounded"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Toasts */}
        <div className="fixed bottom-4 right-4 space-y-2 z-50">
          {toasts.map((t) => (
            <div
              key={t.id}
              className="flex items-center gap-2 bg-[#640811] text-white px-4 py-2 rounded shadow-md"
            >
              <span>{t.msg}</span>
              <button onClick={() => setToasts((ts) => ts.filter((x) => x.id !== t.id))}>
                <XCircle className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </SidebarLayout>
  );
}

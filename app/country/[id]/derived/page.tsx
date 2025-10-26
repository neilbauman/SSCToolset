"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import SidebarLayout from "@/components/layouts/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { Eye, Edit3, Trash2, Plus, RefreshCw, ChevronUp, ChevronDown } from "lucide-react";
import CreateDerivedDatasetWizard_JoinAware from "@/components/country/CreateDerivedDatasetWizard_JoinAware";
import type { CountryParams } from "@/app/country/types";

type DerivedDataset = {
  id: string;
  title: string;
  description: string;
  admin_level: string;
  method: string;
  created_at: string;
  updated_at?: string;
  formula?: string;
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

  // ─────────────────────────────
  // Load derived datasets
  // ─────────────────────────────
  const loadDatasets = async () => {
    const { data, error } = await supabase
      .from("derived_dataset_metadata")
      .select("*")
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

  // ─────────────────────────────
  // Handle sort
  // ─────────────────────────────
  const toggleSort = (field: keyof DerivedDataset) => {
    if (sortField === field) setSortAsc(!sortAsc);
    else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  // ─────────────────────────────
  // Handle view (preview)
  // ─────────────────────────────
  const viewDataset = async (dataset: DerivedDataset) => {
  setSelectedDataset(dataset);
  setPreviewData([]);
  const tableName = `derived_${dataset.id}`;

  // Check if the physical table exists
  const { error: existsErr } = await supabase
    .from(tableName)
    .select("pcode")
    .limit(1);

  if (existsErr) {
    console.warn("Dataset table missing, attempting dynamic preview...");

    // Try using the dynamic preview RPC (for auto or parametric datasets)
    const { data, error } = await supabase.rpc("simulate_join_preview_pd_dynamic", {
      p_country_iso: countryIso,
      p_target_level: dataset.admin_level,
    });

    if (error) {
      console.error("Preview RPC failed:", error);
      setPreviewData([]);
      alert(
        `⚠️ Dataset not yet computed or missing in schema (${tableName}).`
      );
      return;
    }
    setPreviewData(data || []);
    return;
  }

  // Otherwise, query the physical table
  const { data, error } = await supabase
    .from(tableName)
    .select("*")
    .limit(100);

  if (error) {
    console.error("Preview error:", error);
    alert("Failed to load preview");
    return;
  }
  setPreviewData(data || []);
};

  // ─────────────────────────────
  // Handle delete
  // ─────────────────────────────
  const deleteDataset = async (dataset: DerivedDataset) => {
    if (!confirm(`Delete derived dataset "${dataset.title}"? This cannot be undone.`)) return;

    const { error } = await supabase
      .from("derived_dataset_metadata")
      .delete()
      .eq("id", dataset.id);

    if (error) {
      console.error("Delete failed:", error);
      alert("Delete failed: " + error.message);
      return;
    }

    // Optional: drop the physical table if exists
    await supabase.rpc("drop_derived_dataset_table", { p_dataset_id: dataset.id });

    alert("🗑️ Dataset deleted");
    loadDatasets();
  };

  // ─────────────────────────────
  // Refresh button handler
  // ─────────────────────────────
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

        {/* Table */}
        <div className="bg-white border rounded-md overflow-hidden shadow text-sm">
          <table className="min-w-full border-collapse">
            <thead className="bg-gray-50 border-b">
              <tr>
                {[
                  ["title", "Title"],
                  ["admin_level", "Admin"],
                  ["method", "Method"],
                  ["created_at", "Created"],
                  ["is_index_ready", "Index Ready"],
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
                    <td className="px-3 py-2 text-center">
                      {ds.is_index_ready ? "✅" : "—"}
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
                Preview: {selectedDataset.title}
              </h3>
              <button
                onClick={() => setSelectedDataset(null)}
                className="text-xs text-gray-600 hover:text-[#640811]"
              >
                Close
              </button>
            </div>
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
                        {Object.values(r).map((v: any, j) => (
                          <td key={j} className="p-1">
                            {v === null ? "—" : v.toString()}
                          </td>
                        ))}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Wizard Modal */}
        {openWizard && (
  <CreateDerivedDatasetWizard_JoinAware
    open={openWizard}
    onClose={() => {
      setOpenWizard(false);
      setEditDataset(null);
    }}
    countryIso={countryIso}
    editDataset={editDataset}
/>
)} {
          id: editDataset.id,
          title: editDataset.title,
          description: editDataset.description ?? null,
          admin_level: editDataset.admin_level,
          method: (editDataset.method as "ratio" | "multiply" | "sum" | "difference") ?? "ratio",
          use_scalar_b: !!editDataset.use_scalar_b,
          scalar_b_val: editDataset.scalar_b_val ?? null,
          dataset_a_id: editDataset.dataset_a_id ?? null,
          dataset_b_id: editDataset.dataset_b_id ?? null,
          table_a: editDataset.table_a ?? null,
          table_b: editDataset.table_b ?? null,
          col_a: editDataset.col_a ?? "population",
          col_b: editDataset.col_b ?? "area_sqkm",
          decimals: editDataset.decimals ?? 2,
          source_level: editDataset.source_level ?? null,
          target_level: editDataset.target_level ?? editDataset.admin_level ?? null,
          dynamic_resolution: editDataset.dynamic_resolution ?? false,
          dependencies: editDataset.dependencies ?? {},
          formula: editDataset.formula ?? "",
          taxonomy_categories: editDataset.taxonomy_categories ?? [],
          taxonomy_terms: editDataset.taxonomy_terms ?? [],
        }
      : null
  }
/>
        )}
      </div>
    </SidebarLayout>
  );
}

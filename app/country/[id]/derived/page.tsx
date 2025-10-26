"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Eye,
  RefreshCw,
  Pencil,
  Trash2,
  Zap,
} from "lucide-react";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import type { CountryParams } from "@/app/country/types";

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
  const [toasts, setToasts] = useState<{ id: number; msg: string }[]>([]);

  const showToast = (msg: string) => {
    const id = Date.now();
    setToasts((t) => [...t, { id, msg }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
  };

  // Fetch all derived datasets
  async function fetchDerived() {
    const { data, error } = await supabase
      .from("derived_dataset_metadata")
      .select("*")
      .eq("country_iso", countryIso)
      .order("created_at", { ascending: false });
    if (error) console.error("❌ Error loading derived datasets:", error);
    else setDatasets(data || []);
  }

  // View dataset (load its rows dynamically)
  async function viewDataset(dataset: DerivedDataset) {
    setSelectedDataset(dataset);
    setLoadingPreview(true);

    try {
      const tableName = `derived_pop_density_${dataset.admin_level.toLowerCase()}`;
      const { data, error } = await supabase
        .from(tableName)
        .select("*")
        .limit(100);
      if (error) throw error;
      setDataPreview(data || []);
      if (data && data.length > 0) {
        setColumns(Object.keys(data[0]));
      } else {
        setColumns([]);
      }
    } catch (err: any) {
      console.error("❌ Error fetching dataset rows:", err.message);
      showToast("Failed to load dataset preview");
    } finally {
      setLoadingPreview(false);
    }
  }

  // Refresh dataset via edge function (temporary for popdensity)
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
      console.error(err);
      showToast("❌ Refresh failed: " + err.message);
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => {
    fetchDerived();
  }, [countryIso]);

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
            className="flex items-center gap-1 px-3 py-1.5 text-sm rounded bg-[#640811] text-white hover:opacity-90"
          >
            <Zap className="w-4 h-4" /> New Derived Dataset
          </button>
        </div>

        {/* Derived Dataset Table */}
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
                    <td className="px-3 py-2 font-medium text-[#640811] hover:underline">
                      {d.title}
                    </td>
                    <td className="px-3 py-2">{d.admin_level}</td>
                    <td className="px-3 py-2">{d.method ?? "—"}</td>
                    <td className="px-3 py-2">{d.formula ?? "—"}</td>
                    <td className="px-3 py-2">
                      {d.dynamic_resolution ? (
                        <span className="text-green-600 font-medium">Auto</span>
                      ) : (
                        <span className="text-gray-500">Manual</span>
                      )}
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
                      >
                        <Eye className="w-4 h-4 inline" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          refreshDerived(d);
                        }}
                        disabled={refreshing}
                        className="text-[#640811] hover:text-red-700 disabled:opacity-50"
                      >
                        <RefreshCw className="w-4 h-4 inline" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          showToast("✏️ Edit mode coming soon");
                        }}
                        className="text-gray-700 hover:text-gray-900"
                      >
                        <Pencil className="w-4 h-4 inline" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          showToast("🗑️ Delete mode coming soon");
                        }}
                        className="text-red-600 hover:text-red-800"
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
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-md font-semibold">
                {selectedDataset.title} — Preview
              </h3>
              {loadingPreview ? (
                <span className="text-sm text-gray-500">Loading…</span>
              ) : (
                <span className="text-sm text-gray-400">
                  Showing up to 100 records
                </span>
              )}
            </div>

            <div className="overflow-x-auto max-h-[400px] overflow-y-auto border rounded">
              {loadingPreview ? (
                <div className="text-center p-10 text-gray-500">Loading data…</div>
              ) : dataPreview.length === 0 ? (
                <div className="text-center p-10 text-gray-500">
                  No records found for this dataset.
                </div>
              ) : (
                <table className="min-w-full text-xs border-collapse">
                  <thead className="bg-gray-50 border-b sticky top-0">
                    <tr>
                      {columns.map((c) => (
                        <th key={c} className="px-2 py-1 text-left border-b">
                          {c}
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

        {/* Toasts */}
        <div className="fixed bottom-4 right-4 space-y-2 z-50">
          {toasts.map((t) => (
            <div
              key={t.id}
              className="flex items-center gap-2 bg-[#640811] text-white px-4 py-2 rounded shadow-md"
            >
              <span>{t.msg}</span>
            </div>
          ))}
        </div>
      </div>
    </SidebarLayout>
  );
}

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
  storage_model?: string | null;
  created_at: string;
}

export default function DerivedDatasetsPage({
  params,
}: {
  params: CountryParams;
}) {
  const countryIso = params.id;
  const [datasets, setDatasets] = useState<DerivedDataset[]>([]);
  const [sortField, setSortField] =
    useState<keyof DerivedDataset>("created_at");
  const [sortAsc, setSortAsc] = useState(false);
  const [editDataset, setEditDataset] = useState<DerivedDataset | null>(null);
  const [openWizard, setOpenWizard] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // --- Load datasets
  const loadDatasets = async () => {
    const { data, error } = await supabase
      .from("derived_dataset_metadata")
      .select("*") // ← revert to safe generic select
      .eq("country_iso", countryIso)
      .order(sortField, { ascending: sortAsc });

    if (error) {
      console.error("Error loading datasets:", error);
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

        <div className="bg-white border rounded-md overflow-hidden shadow text-sm">
          <table className="min-w-full border-collapse">
            <thead className="bg-gray-50 border-b">
              <tr>
                {[
                  ["title", "Name"],
                  ["description", "Description"],
                  ["admin_level", "Admin"],
                  ["method", "Method"],
                  ["is_parametric", "Type"],
                  ["normalize_percent", "Format"],
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
                  <tr key={ds.id} className="border-b hover:bg-gray-50">
                    <td className="px-3 py-2 font-medium text-[#640811]">
                      {ds.title}
                    </td>
                    <td className="px-3 py-2 text-gray-700">
                      {ds.description || "—"}
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
                      {new Date(ds.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <div className="flex gap-2 justify-end">
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

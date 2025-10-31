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
  Layers,
} from "lucide-react";
import DerivedDatasetWizard from "@/components/country/wizard";
import type { CountryParams } from "@/app/country/types";

type Method = "ratio" | "multiply" | "sum" | "difference";

type DerivedDataset = {
  id: string;
  title: string;
  description: string | null;
  admin_level: string;
  method: Method;
  created_at: string;
  is_parametric: boolean;
  normalize_percent: boolean;
  data_format?: string;
  decimals?: number;
  record_count?: number;
  taxonomy_categories?: string[];
};

export default function DerivedDatasetsPage({ params }: { params: CountryParams }) {
  const countryIso = params.id;
  const [datasets, setDatasets] = useState<DerivedDataset[]>([]);
  const [sortField, setSortField] = useState<keyof DerivedDataset>("created_at");
  const [sortAsc, setSortAsc] = useState(false);
  const [editDataset, setEditDataset] = useState<DerivedDataset | null>(null);
  const [openWizard, setOpenWizard] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Load derived datasets
  const loadDatasets = async () => {
    const { data, error } = await supabase
  .from("derived_dataset_metadata")
  .select(`
    id,
    title,
    description,
    admin_level,
    method,
    created_at,
    is_parametric,
    normalize_percent,
    data_format,
    decimals,
    record_count,
    taxonomy_categories
  `)
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

  const formatBadge = (ds: DerivedDataset) => {
    if (ds.normalize_percent) return <span className="px-2 py-0.5 text-xs rounded bg-blue-100 text-blue-700">%</span>;
    if (ds.data_format === "gradient") return <span className="px-2 py-0.5 text-xs rounded bg-orange-100 text-orange-700">Gradient</span>;
    return <span className="px-2 py-0.5 text-xs rounded bg-gray-100 text-gray-700">Numeric</span>;
  };

  const paramBadge = (flag: boolean) => (
    <span
      className={`px-2 py-0.5 text-xs rounded ${
        flag ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"
      }`}
    >
      {flag ? "Parametric" : "Fixed"}
    </span>
  );

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

        {/* Dataset List Table */}
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
                  ["data_format", "Format"],
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
                  <td colSpan={8} className="text-center italic text-gray-500 py-3">
                    No derived datasets found.
                  </td>
                </tr>
              ) : (
                datasets.map((ds) => (
                  <tr key={ds.id} className="border-b hover:bg-gray-50 transition-colors">
                    <td className="px-3 py-2 font-medium text-[#640811]">{ds.title}</td>
                    <td className="px-3 py-2 text-gray-700 truncate max-w-[200px]">{ds.description || "—"}</td>
                    <td className="px-3 py-2">{ds.admin_level}</td>
                    <td className="px-3 py-2 capitalize">{ds.method}</td>
                    <td className="px-3 py-2">{paramBadge(ds.is_parametric)}</td>
                    <td className="px-3 py-2">{formatBadge(ds)}</td>
                    <td className="px-3 py-2">{new Date(ds.created_at).toLocaleDateString()}</td>
                    <td className="px-3 py-2 text-right">
                      <div className="flex gap-2 justify-end">
                        <button
                          title="View data"
                          onClick={() => alert(`Coming soon: preview for ${ds.title}`)}
                          className="text-gray-600 hover:text-[#640811]"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          title="Edit"
                          onClick={() => {
                            setEditDataset({
                              ...ds,
                              description: ds.description ?? null,
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

        {/* Wizard Modal */}
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

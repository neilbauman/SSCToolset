"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { Plus, Eye, Edit3, Trash2, ArrowUpDown } from "lucide-react";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import CreateDerivedDatasetWizard_JoinAware from "@/components/country/CreateDerivedDatasetWizard_JoinAware";
import type { CountryParams } from "@/app/country/types";

type DerivedDataset = {
  id: string;
  title: string;
  description: string;
  admin_level: string;
  method: string;
  created_at: string;
};

export default function DerivedDatasetsPage({ params }: { params: CountryParams }) {
  const countryIso = params.id;
  const [datasets, setDatasets] = useState<DerivedDataset[]>([]);
  const [openWizard, setOpenWizard] = useState(false);
  const [editDataset, setEditDataset] = useState<DerivedDataset | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: keyof DerivedDataset; direction: "asc" | "desc" }>({
    key: "created_at",
    direction: "desc",
  });

  const fetchDerivedDatasets = async () => {
    const { data, error } = await supabase
      .from("derived_dataset_metadata")
      .select("id, title, description, admin_level, method, created_at")
      .eq("country_iso", countryIso)
      .order("created_at", { ascending: false });
    if (error) console.error("Fetch error:", error);
    else setDatasets(data || []);
  };

  useEffect(() => {
    fetchDerivedDatasets();
  }, [countryIso]);

  const sortedDatasets = useMemo(() => {
    const sorted = [...datasets];
    sorted.sort((a, b) => {
      const aVal = a[sortConfig.key] ?? "";
      const bVal = b[sortConfig.key] ?? "";
      if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [datasets, sortConfig]);

  const requestSort = (key: keyof DerivedDataset) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  const handleDelete = async (datasetId: string) => {
    if (!confirm("Are you sure you want to delete this derived dataset?")) return;
    const { error } = await supabase.from("derived_dataset_metadata").delete().eq("id", datasetId);
    if (error) return alert("❌ Delete failed: " + error.message);
    await fetchDerivedDatasets();
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
      <div className="p-6 space-y-4">
        {/* Header Actions */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Derived Datasets</h2>
          <button
            onClick={() => {
              setEditDataset(null);
              setOpenWizard(true);
            }}
            className="flex items-center gap-1 px-3 py-1.5 text-sm rounded bg-[#640811] text-white hover:opacity-90"
          >
            <Plus className="w-4 h-4" /> New Derived Dataset
          </button>
        </div>

        {/* Table */}
        <div className="bg-white border rounded-md overflow-hidden text-sm shadow">
          <table className="min-w-full border-collapse">
            <thead className="bg-gray-50 border-b">
              <tr>
                {[
                  { key: "title", label: "Title" },
                  { key: "admin_level", label: "Admin" },
                  { key: "method", label: "Method" },
                  { key: "created_at", label: "Created" },
                ].map(({ key, label }) => (
                  <th
                    key={key}
                    onClick={() => requestSort(key as keyof DerivedDataset)}
                    className="px-3 py-2 text-left cursor-pointer select-none hover:bg-gray-100"
                  >
                    <div className="flex items-center gap-1">
                      {label}
                      <ArrowUpDown className="w-3 h-3 opacity-60" />
                    </div>
                  </th>
                ))}
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedDatasets.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center italic text-gray-500 py-3">
                    No derived datasets found.
                  </td>
                </tr>
              ) : (
                sortedDatasets.map(d => (
                  <tr
                    key={d.id}
                    className="border-b hover:bg-gray-50 cursor-pointer"
                    onClick={() => window.location.assign(`/country/${countryIso}/derived/${d.id}`)}
                  >
                    <td className="px-3 py-2 text-[#640811] font-medium">{d.title}</td>
                    <td className="px-3 py-2">{d.admin_level}</td>
                    <td className="px-3 py-2">{d.method}</td>
                    <td className="px-3 py-2">{new Date(d.created_at).toLocaleDateString()}</td>
                    <td
                      className="px-3 py-2 text-right space-x-2"
                      onClick={e => e.stopPropagation()}
                    >
                      <button
                        onClick={() => window.location.assign(`/country/${countryIso}/derived/${d.id}`)}
                        className="text-[#640811] hover:text-[#3c050c]"
                        title="View Dataset"
                      >
                        <Eye className="w-4 h-4 inline" />
                      </button>
                      <button
                        onClick={() => {
                          setEditDataset(d);
                          setOpenWizard(true);
                        }}
                        className="text-blue-600 hover:text-blue-800"
                        title="Edit Dataset"
                      >
                        <Edit3 className="w-4 h-4 inline" />
                      </button>
                      <button
                        onClick={() => handleDelete(d.id)}
                        className="text-red-600 hover:text-red-800"
                        title="Delete Dataset"
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

        {/* Wizard Modal */}
        {openWizard && (
          <CreateDerivedDatasetWizard_JoinAware
            open={openWizard}
            onClose={() => setOpenWizard(false)}
            countryIso={countryIso}
            editDataset={editDataset}
          />
        )}
      </div>
    </SidebarLayout>
  );
}

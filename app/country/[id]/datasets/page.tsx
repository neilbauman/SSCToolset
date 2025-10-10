"use client";

import { useState, useEffect } from "react";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import {
  Database,
  Upload,
  CheckCircle2,
  Trash2,
  Edit3,
  Search,
  Plus,
  Loader2,
} from "lucide-react";
import ConfirmDeleteModal from "@/components/country/ConfirmDeleteModal";
import AddDatasetModal from "@/components/country/AddDatasetModal";
import type { CountryParams } from "@/app/country/types";

type Country = { iso_code: string; name: string };
type Dataset = {
  id: string;
  title: string;
  year: number | null;
  dataset_date: string | null;
  source: any;
  notes: string | null;
  is_active: boolean;
  created_at: string;
};

type StatRecord = {
  id: string;
  indicator_name: string;
  unit: string;
  value: number;
  updated_at: string;
};

export default function DatasetsPage({ params }: { params: CountryParams }) {
  const { id: countryIso } = params;
  const [country, setCountry] = useState<Country | null>(null);
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [stats, setStats] = useState<StatRecord[]>([]);
  const [selectedDataset, setSelectedDataset] = useState<Dataset | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [openAdd, setOpenAdd] = useState(false);
  const [openDelete, setOpenDelete] = useState<Dataset | null>(null);

  // 🧭 Fetch country info
  useEffect(() => {
    supabase
      .from("countries")
      .select("iso_code, name")
      .eq("iso_code", countryIso)
      .maybeSingle()
      .then(({ data }) => data && setCountry(data));
  }, [countryIso]);

  // 📦 Load Datasets (metadata table)
  useEffect(() => {
    const loadDatasets = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("dataset_metadata")
        .select("*")
        .eq("country_iso", countryIso)
        .order("created_at", { ascending: false });
      if (!error && data) setDatasets(data);
      setLoading(false);
    };
    loadDatasets();
  }, [countryIso]);

  // 📊 Load Stats (national indicators)
  useEffect(() => {
    const loadStats = async () => {
      const { data, error } = await supabase
        .from("indicator_results")
        .select(
          `
          id,
          value,
          computed_at,
          indicator_catalogue (
            name,
            unit
          )
        `
        )
        .eq("country_iso", countryIso)
        .is("admin_pcode", null)
        .order("computed_at", { ascending: false });

      if (!error && data) {
        const formatted = data.map((r: any) => ({
          id: r.id,
          indicator_name: r.indicator_catalogue?.name || "Unnamed Indicator",
          unit: r.indicator_catalogue?.unit || "",
          value: r.value,
          updated_at: r.computed_at,
        }));
        setStats(formatted);
      }
    };
    loadStats();
  }, [countryIso]);

  const handleDeleteDataset = async (id: string) => {
    await supabase.from("dataset_metadata").delete().eq("id", id);
    setOpenDelete(null);
    setDatasets((prev) => prev.filter((d) => d.id !== id));
  };

  const filteredDatasets = datasets.filter((d) =>
    d.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const headerProps = {
    title: `${country?.name ?? countryIso} – Other Datasets`,
    group: "country-config" as const,
    description:
      "Upload and manage national or supplementary datasets that extend the baseline.",
    breadcrumbs: (
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Country Configuration", href: "/country" },
          { label: country?.name ?? countryIso, href: `/country/${countryIso}` },
          { label: "Other Datasets" },
        ]}
      />
    ),
  };

  return (
    <SidebarLayout headerProps={headerProps}>
      {loading ? (
        <div className="flex items-center gap-2 text-gray-600 text-sm">
          <Loader2 className="animate-spin w-4 h-4" />
          Loading datasets...
        </div>
      ) : (
        <>
          {/* 🧩 Top Section — Dataset Table */}
          <div className="border rounded-lg p-4 shadow-sm mb-6 bg-white">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Database className="w-5 h-5 text-blue-600" />
                Dataset Metadata
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={() => setOpenAdd(true)}
                  className="flex items-center text-sm text-white bg-[color:var(--gsc-red)] px-3 py-1 rounded hover:opacity-90"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Dataset
                </button>
              </div>
            </div>

            {datasets.length ? (
              <table className="w-full text-sm border rounded">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-2 py-1 text-left">Title</th>
                    <th>Source</th>
                    <th>Year</</th>
                    <th>Date</th>
                    <th>Type</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDatasets.map((d) => (
                    <tr
                      key={d.id}
                      className={`hover:bg-gray-50 ${
                        selectedDataset?.id === d.id ? "bg-blue-50" : ""
                      }`}
                    >
                      <td
                        className="border px-2 py-1 cursor-pointer font-medium"
                        onClick={() => setSelectedDataset(d)}
                      >
                        {d.title}
                      </td>
                      <td className="border px-2 py-1 text-center">
                        {d.source?.name ?? "—"}
                      </td>
                      <td className="border px-2 py-1 text-center">
                        {d.year ?? "—"}
                      </td>
                      <td className="border px-2 py-1 text-center">
                        {d.dataset_date ?? "—"}
                      </td>
                      <td className="border px-2 py-1 text-center">
                        {(d as any).dataset_type ?? "—"}
                      </td>
                      <td className="border px-2 py-1 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            className="text-gray-700 hover:underline text-xs flex items-center"
                            onClick={() =>
                              alert("Editing not yet implemented")
                            }
                          >
                            <Edit3 className="w-4 h-4 mr-1" /> Edit
                          </button>
                          <button
                            className="text-[color:var(--gsc-red)] hover:underline text-xs flex items-center"
                            onClick={() => setOpenDelete(d)}
                          >
                            <Trash2 className="w-4 h-4 mr-1" /> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="italic text-gray-500 text-sm">
                No additional datasets uploaded yet.
              </p>
            )}
          </div>

          {/* 🧮 Bottom Section — National Statistics */}
          <div className="border rounded-lg p-4 shadow-sm bg-white">
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              National Statistics
            </h2>

            {stats.length ? (
              <table className="w-full text-sm border rounded">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-2 py-1 text-left">Indicator</th>
                    <th>Value</th>
                    <th>Unit</th>
                    <th>Last Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.map((s) => (
                    <tr key={s.id} className="hover:bg-gray-50">
                      <td className="border px-2 py-1">{s.indicator_name}</td>
                      <td className="border px-2 py-1 text-center">
                        {s.value}
                      </td>
                      <td className="border px-2 py-1 text-center">{s.unit}</td>
                      <td className="border px-2 py-1 text-center">
                        {new Date(s.updated_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="italic text-gray-500 text-sm">
                No national statistics yet. Use “Add Dataset” to start.
              </p>
            )}
          </div>
        </>
      )}

      {/* 🧩 Modals */}
      {openAdd && (
        <AddDatasetModal
          open={openAdd}
          onClose={() => setOpenAdd(false)}
          countryIso={countryIso}
          onSaved={() => setOpenAdd(false)}
        />
      )}
      {openDelete && (
        <ConfirmDeleteModal
          open={!!openDelete}
          message={`This will permanently remove dataset "${openDelete.title}".`}
          onClose={() => setOpenDelete(null)}
          onConfirm={() => handleDeleteDataset(openDelete.id)}
        />
      )}
    </SidebarLayout>
  );
}

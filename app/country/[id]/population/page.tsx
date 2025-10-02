"use client";

import { useState, useEffect } from "react";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import DatasetHealth from "@/components/country/DatasetHealth";
import UploadPopulationModal from "@/components/country/UploadPopulationModal";
import { Users, Database, Trash2, CheckCircle, Plus } from "lucide-react";
import type { CountryParams } from "@/app/country/types";

type DatasetVersion = {
  id: string;
  country_iso: string;
  year: number | null;
  dataset_date: string | null;
  source: any;
  is_active: boolean;
  created_at: string;
};

type PopulationRow = {
  id: string;
  dataset_id?: string;
  pcode: string;
  name: string;
  population: number;
};

export default function PopulationPage({ params }: any) {
  const { id: countryIso } = params as CountryParams;

  const [datasets, setDatasets] = useState<DatasetVersion[]>([]);
  const [activeDataset, setActiveDataset] = useState<DatasetVersion | null>(null);
  const [populationRows, setPopulationRows] = useState<PopulationRow[]>([]);
  const [adminCount, setAdminCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [openUpload, setOpenUpload] = useState(false);

  const fetchDatasets = async () => {
    const { data } = await supabase
      .from("population_datasets")
      .select("*")
      .eq("country_iso", countryIso)
      .order("dataset_date", { ascending: false })
      .order("year", { ascending: false });

    if (data) {
      setDatasets(data as DatasetVersion[]);
      const active = data.find((d: any) => d.is_active) || null;
      setActiveDataset(active);
    }
  };

  const fetchPopulationRows = async (datasetId?: string) => {
    if (!datasetId) {
      setPopulationRows([]);
      return;
    }
    const { data } = await supabase
      .from("population_data")
      .select("*")
      .eq("country_iso", countryIso)
      .eq("dataset_id", datasetId);

    if (data) {
      setPopulationRows(data as PopulationRow[]);
    }
  };

  const fetchAdminUnits = async () => {
    const { data } = await supabase
      .from("admin_units")
      .select("id")
      .eq("country_iso", countryIso);
    setAdminCount(data?.length || 0);
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await fetchDatasets();
      await fetchAdminUnits();
      setLoading(false);
    };
    load();
  }, [countryIso]);

  useEffect(() => {
    if (activeDataset) {
      fetchPopulationRows(activeDataset.id);
    }
  }, [activeDataset]);

  const handleDeleteDataset = async (datasetId: string) => {
    await supabase.from("population_datasets").delete().eq("id", datasetId);
    await fetchDatasets();
  };

  const handleSetActive = async (datasetId: string) => {
    await supabase
      .from("population_datasets")
      .update({ is_active: false })
      .eq("country_iso", countryIso);

    await supabase
      .from("population_datasets")
      .update({ is_active: true })
      .eq("id", datasetId);

    await fetchDatasets();
  };

  // Health metrics
  const totalUnits = populationRows.length;
  const validPopulationCount = populationRows.filter((r) => r.population > 0).length;
  const hasYear = !!activeDataset?.year;
  const coverage = adminCount > 0 ? (populationRows.length / adminCount) * 100 : 0;

  const headerProps = {
    title: `${countryIso} – Population`,
    group: "country-config" as const,
    description: "Manage population datasets for this country.",
    breadcrumbs: (
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Country Configuration", href: "/country" },
          { label: countryIso, href: `/country/${countryIso}` },
          { label: "Population" },
        ]}
      />
    ),
  };

  return (
    <SidebarLayout headerProps={headerProps}>
      {/* Dataset Versions */}
      <div className="border rounded-lg p-4 shadow-sm mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Database className="w-5 h-5 text-blue-600" />
            Dataset Versions
          </h2>
          <button
            onClick={() => setOpenUpload(true)}
            className="flex items-center gap-2 text-sm text-white bg-[color:var(--gsc-green)] px-3 py-1.5 rounded hover:opacity-90"
          >
            <Plus className="w-4 h-4" /> Add Population Dataset
          </button>
        </div>

        {loading ? (
          <p className="text-gray-500">Loading versions…</p>
        ) : datasets.length === 0 ? (
          <p className="italic text-gray-400">No versions uploaded yet</p>
        ) : (
          <table className="w-full text-sm border">
            <thead className="bg-gray-100">
              <tr>
                <th className="border px-2 py-1 text-left">Year</th>
                <th className="border px-2 py-1 text-left">Date</th>
                <th className="border px-2 py-1 text-left">Source</th>
                <th className="border px-2 py-1 text-left">Active</th>
                <th className="border px-2 py-1 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {datasets.map((d) => (
                <tr key={d.id} className="hover:bg-gray-50">
                  <td className="border px-2 py-1">{d.year ?? "-"}</td>
                  <td className="border px-2 py-1">{d.dataset_date ?? "-"}</td>
                  <td className="border px-2 py-1">
                    {typeof d.source === "object"
                      ? d.source?.name ?? JSON.stringify(d.source)
                      : d.source ?? "-"}
                  </td>
                  <td className="border px-2 py-1">
                    {d.is_active ? (
                      <span className="text-green-600 font-medium">Active</span>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="border px-2 py-1 flex gap-2">
                    {!d.is_active && (
                      <button
                        onClick={() => handleSetActive(d.id)}
                        className="flex items-center text-sm text-blue-600 border px-2 py-1 rounded hover:bg-blue-50"
                      >
                        <CheckCircle className="w-4 h-4 mr-1" /> Set Active
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteDataset(d.id)}
                      className="flex items-center text-sm text-red-600 border px-2 py-1 rounded hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4 mr-1" /> Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Dataset Health */}
      <DatasetHealth
        totalUnits={totalUnits}
        validPopulationCount={validPopulationCount}
        coverage={coverage}
        hasYear={hasYear}
      />

      {/* Population Table */}
      <div className="border rounded-lg p-4 shadow-sm mt-6">
        <h2 className="text-lg font-semibold flex items-center gap-2 mb-3">
          <Users className="w-5 h-5 text-gray-600" />
          Population Data
        </h2>
        {populationRows.length === 0 ? (
          <p className="italic text-gray-400">No population data uploaded</p>
        ) : (
          <table className="w-full text-sm border">
            <thead className="bg-gray-100">
              <tr>
                <th className="border px-2 py-1 text-left">PCode</th>
                <th className="border px-2 py-1 text-left">Name</th>
                <th className="border px-2 py-1 text-left">Population</th>
              </tr>
            </thead>
            <tbody>
              {populationRows.map((row) => (
                <tr key={row.id} className="hover:bg-gray-50">
                  <td className="border px-2 py-1">{row.pcode}</td>
                  <td className="border px-2 py-1">{row.name}</td>
                  <td className="border px-2 py-1">{row.population}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <UploadPopulationModal
        open={openUpload}
        onClose={() => setOpenUpload(false)}
        countryIso={countryIso}
        onUploaded={fetchDatasets}
      />
    </SidebarLayout>
  );
}

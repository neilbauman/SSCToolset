"use client";

import { useEffect, useState } from "react";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import DatasetHealth from "@/components/country/DatasetHealth";
import UploadPopulationModal from "@/components/country/UploadPopulationModal";
import { Users, Upload } from "lucide-react";
import type { CountryParams } from "@/app/country/types";

type Country = {
  iso_code: string;
  name: string;
};

type PopulationDataset = {
  id: string;
  year: number;
  dataset_date: string | null;
  source: string | null;
  description?: string;
  is_active?: boolean;
};

type PopulationRow = {
  id: string;
  dataset_id: string;
  pcode: string;
  name: string;
  population: number;
  level?: string;
};

export default function PopulationPage({ params }: any) {
  const { id: countryIso } = params as CountryParams;

  const [country, setCountry] = useState<Country | null>(null);
  const [datasets, setDatasets] = useState<PopulationDataset[]>([]);
  const [rows, setRows] = useState<PopulationRow[]>([]);
  const [selectedDataset, setSelectedDataset] = useState<string | null>(null);
  const [openUpload, setOpenUpload] = useState(false);

  // Fetch country
  useEffect(() => {
    const fetchCountry = async () => {
      const { data } = await supabase
        .from("countries")
        .select("iso_code, name")
        .eq("iso_code", countryIso)
        .single();
      if (data) setCountry(data as Country);
    };
    fetchCountry();
  }, [countryIso]);

  // Fetch datasets
  const fetchDatasets = async () => {
    const { data, error } = await supabase
      .from("population_datasets")
      .select("*")
      .eq("country_iso", countryIso)
      .order("year", { ascending: false });

    if (error) {
      console.error("Error fetching population_datasets:", error);
      return;
    }
    if (data) {
      setDatasets(data as PopulationDataset[]);
      const active = data.find((d: any) => d.is_active);
      if (active) setSelectedDataset(active.id);
    }
  };

  useEffect(() => {
    fetchDatasets();
  }, [countryIso]);

  // Fetch rows for selected dataset
  const fetchRows = async (datasetId: string) => {
    const { data, error } = await supabase
      .from("population_data")
      .select("*")
      .eq("dataset_id", datasetId);

    if (error) {
      console.error("Error fetching population_data:", error);
      return;
    }
    if (data) setRows(data as PopulationRow[]);
  };

  useEffect(() => {
    if (selectedDataset) fetchRows(selectedDataset);
  }, [selectedDataset]);

  // Health checks
  const totalUnits = rows.length;
  const missingPcodes = rows.filter((r) => !r.pcode).length;
  const allHavePcodes = totalUnits > 0 && missingPcodes === 0;
  const missingPopulation = rows.filter((r) => !r.population || r.population <= 0).length;
  const hasPopulation = totalUnits > 0 && missingPopulation === 0;

  // Compute lowest admin level present in dataset
  const computeLowestLevel = () => {
    if (!rows || rows.length === 0) return "None";
    const levels = new Set(rows.map((r) => r.level || "ADM0"));
    if (levels.has("ADM2")) return "ADM2";
    if (levels.has("ADM1")) return "ADM1";
    return "ADM0";
  };

  // Compute completeness
  const computeCompleteness = () => {
    if (rows.length === 0) return "Missing";
    if (allHavePcodes && hasPopulation) return "Complete";
    return "Partial";
  };

  const headerProps = {
    title: `${country?.name ?? countryIso} – Population`,
    group: "country-config" as const,
    description: "Manage population datasets for this country.",
    breadcrumbs: (
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Country Configuration", href: "/country" },
          { label: country?.name ?? countryIso, href: `/country/${countryIso}` },
          { label: "Population" },
        ]}
      />
    ),
  };

  return (
    <SidebarLayout headerProps={headerProps}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Dataset Versions */}
        <div className="border rounded-lg p-4 shadow-sm">
          <h2 className="text-lg font-semibold flex items-center gap-2 mb-3">
            <Users className="w-5 h-5 text-blue-600" />
            Dataset Versions
          </h2>
          {datasets.length === 0 ? (
            <p className="italic text-gray-400">No versions uploaded yet</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {datasets.map((ds) => {
                const isSelected = selectedDataset === ds.id;
                return (
                  <li
                    key={ds.id}
                    className={`p-2 border rounded cursor-pointer ${
                      isSelected ? "bg-blue-50 border-blue-400" : "hover:bg-gray-50"
                    }`}
                    onClick={() => setSelectedDataset(ds.id)}
                  >
                    <p>
                      <strong>Year:</strong> {ds.year}{" "}
                      {ds.is_active && <span className="text-green-600">(Active)</span>}
                    </p>
                    {ds.dataset_date && (
                      <p>
                        <strong>Date:</strong> {ds.dataset_date}
                      </p>
                    )}
                    {ds.source && (
                      <p>
                        <strong>Source:</strong> {ds.source}
                      </p>
                    )}
                    <p>
                      <strong>Rows:</strong> {rows.length}
                    </p>
                    <p>
                      <strong>Lowest Level:</strong> {computeLowestLevel()}
                    </p>
                    <p>
                      <strong>Status:</strong> {computeCompleteness()}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
          <button
            onClick={() => setOpenUpload(true)}
            className="mt-3 flex items-center text-sm text-white bg-[color:var(--gsc-red)] px-3 py-1.5 rounded hover:opacity-90"
          >
            <Upload className="w-4 h-4 mr-1" /> Add Population Data
          </button>
        </div>

        {/* Data Health */}
        <DatasetHealth
          totalUnits={totalUnits}
          allHavePcodes={allHavePcodes}
          missingPcodes={missingPcodes}
          hasPopulation={hasPopulation}
        />
      </div>

      {/* Population Data Table */}
      <div className="border rounded-lg p-4 shadow-sm">
        <h2 className="text-lg font-semibold mb-3">Population Data</h2>
        {rows.length === 0 ? (
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
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="border px-2 py-1">{r.pcode}</td>
                  <td className="border px-2 py-1">{r.name}</td>
                  <td className="border px-2 py-1">{r.population}</td>
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

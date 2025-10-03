"use client";

import { useEffect, useState } from "react";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import UploadPopulationModal from "@/components/country/UploadPopulationModal";
import DatasetHealth from "@/components/country/DatasetHealth";
import { Users, Upload } from "lucide-react";
import type { CountryParams } from "@/app/country/types";

type Country = {
  iso_code: string;
  name: string;
};

type PopulationDataset = {
  id: string;
  title: string | null;
  year: number;
  dataset_date: string | null;
  source: string | null;
  is_active: boolean;
};

type PopulationRow = {
  id: string;
  pcode: string;
  name: string;
  population: number;
  year: number;
  dataset_id: string;
};

export default function PopulationPage({ params }: any) {
  const { id: countryIso } = params as CountryParams;

  const [country, setCountry] = useState<Country | null>(null);
  const [datasets, setDatasets] = useState<PopulationDataset[]>([]);
  const [selectedDataset, setSelectedDataset] = useState<PopulationDataset | null>(null);
  const [rows, setRows] = useState<PopulationRow[]>([]);
  const [openUpload, setOpenUpload] = useState(false);

  // fetch country
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

  // fetch population datasets
  const fetchDatasets = async () => {
    const { data } = await supabase
      .from("population_datasets")
      .select("*")
      .eq("country_iso", countryIso)
      .order("year", { ascending: false });

    if (data) {
      setDatasets(data as PopulationDataset[]);
      const active = data.find((d) => d.is_active);
      if (active) {
        setSelectedDataset(active);
        fetchRows(active.id);
      } else if (data.length > 0) {
        setSelectedDataset(data[0]);
        fetchRows(data[0].id);
      }
    }
  };

  // fetch rows for selected dataset
  const fetchRows = async (datasetId: string) => {
    const { data } = await supabase
      .from("population_data")
      .select("*")
      .eq("dataset_id", datasetId);
    if (data) setRows(data as PopulationRow[]);
  };

  useEffect(() => {
    fetchDatasets();
  }, [countryIso]);

  // mark a dataset active
  const makeActive = async (datasetId: string) => {
    await supabase
      .from("population_datasets")
      .update({ is_active: false })
      .eq("country_iso", countryIso);

    await supabase
      .from("population_datasets")
      .update({ is_active: true })
      .eq("id", datasetId);

    fetchDatasets();
  };

  const allHavePcodes = rows.length > 0 && rows.every((r) => r.pcode);
  const allHavePop = rows.length > 0 && rows.every((r) => r.population > 0);

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
            <Users className="w-5 h-5 text-blue-600" /> Dataset Versions
          </h2>
          <table className="w-full text-sm border mb-3">
            <thead className="bg-gray-100">
              <tr>
                <th className="border px-2 py-1">Title</th>
                <th className="border px-2 py-1">Year</th>
                <th className="border px-2 py-1">Dataset Date</th>
                <th className="border px-2 py-1">Source</th>
                <th className="border px-2 py-1">Active</th>
                <th className="border px-2 py-1">Actions</th>
              </tr>
            </thead>
            <tbody>
              {datasets.map((ds) => (
                <tr
                  key={ds.id}
                  className={
                    ds.id === selectedDataset?.id
                      ? "bg-blue-50"
                      : "hover:bg-gray-50"
                  }
                >
                  <td className="border px-2 py-1">{ds.title || `Dataset ${ds.year}`}</td>
                  <td className="border px-2 py-1">{ds.year}</td>
                  <td className="border px-2 py-1">{ds.dataset_date || "-"}</td>
                  <td className="border px-2 py-1">{ds.source || "-"}</td>
                  <td className="border px-2 py-1 text-center">{ds.is_active ? "✓" : ""}</td>
                  <td className="border px-2 py-1 space-x-2">
                    {selectedDataset?.id !== ds.id && (
                      <button
                        onClick={() => {
                          setSelectedDataset(ds);
                          fetchRows(ds.id);
                        }}
                        className="text-blue-600 text-xs hover:underline"
                      >
                        Select
                      </button>
                    )}
                    {!ds.is_active && (
                      <button
                        onClick={() => makeActive(ds.id)}
                        className="text-green-600 text-xs hover:underline"
                      >
                        Make Active
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {datasets.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-4 text-gray-500">
                    No datasets uploaded
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          <button
            onClick={() => setOpenUpload(true)}
            className="flex items-center text-sm text-white bg-[color:var(--gsc-red)] px-3 py-1.5 rounded hover:opacity-90"
          >
            <Upload className="w-4 h-4 mr-1" /> Add Population Data
          </button>
        </div>

        {/* Dataset Health */}
        <DatasetHealth
          totalUnits={rows.length}
          allHavePcodes={allHavePcodes}
          missingPcodes={rows.filter((r) => !r.pcode).length}
          hasPopulation={allHavePop}
        />
      </div>

      {/* Population Data */}
      <div className="border rounded-lg p-4 shadow-sm">
        <h2 className="text-lg font-semibold mb-3">
          Population Data – {selectedDataset?.title || selectedDataset?.year || "No dataset"}
        </h2>
        {rows.length > 0 ? (
          <table className="w-full text-sm border">
            <thead className="bg-gray-100">
              <tr>
                <th className="border px-2 py-1">PCode</th>
                <th className="border px-2 py-1">Name</th>
                <th className="border px-2 py-1">Population</th>
                <th className="border px-2 py-1">Year</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="border px-2 py-1">{r.pcode}</td>
                  <td className="border px-2 py-1">{r.name}</td>
                  <td className="border px-2 py-1">{r.population}</td>
                  <td className="border px-2 py-1">{r.year}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-gray-500 italic">No population data uploaded</p>
        )}
      </div>

      {/* Upload Modal */}
      <UploadPopulationModal
        open={openUpload}
        onClose={() => setOpenUpload(false)}
        countryIso={countryIso}
        onUploaded={fetchDatasets}
      />
    </SidebarLayout>
  );
}

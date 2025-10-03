"use client";

import { useEffect, useState } from "react";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import UploadPopulationModal from "@/components/country/UploadPopulationModal";
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
  dataset_id: string;
  pcode: string;
  name: string;
  population: number;
  year: number;
  level?: string;
};

type AdminUnit = {
  id: string;
  country_iso: string;
  pcode: string;
  name: string;
  level: string;
};

export default function PopulationPage({ params }: any) {
  const { id: countryIso } = params as CountryParams;

  const [country, setCountry] = useState<Country | null>(null);
  const [datasets, setDatasets] = useState<PopulationDataset[]>([]);
  const [selectedDataset, setSelectedDataset] = useState<PopulationDataset | null>(null);
  const [rows, setRows] = useState<PopulationRow[]>([]);
  const [adminUnits, setAdminUnits] = useState<AdminUnit[]>([]);
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

  // Fetch admin units (for completeness calc)
  useEffect(() => {
    const fetchAdmins = async () => {
      const { data } = await supabase
        .from("admin_units")
        .select("id,country_iso,pcode,name,level")
        .eq("country_iso", countryIso);
      if (data) setAdminUnits(data as AdminUnit[]);
    };
    fetchAdmins();
  }, [countryIso]);

  // Fetch datasets
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

  // Fetch rows for selected dataset
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

  // Set dataset active
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

  // Compute lowest admin level present (ADM0 highest → ADM5 lowest)
  const computeLowestLevel = (data: PopulationRow[]) => {
    if (!data || data.length === 0) return "None";
    const levels = new Set(data.map((r) => r.level || "ADM0"));
    if (levels.has("ADM5")) return "ADM5";
    if (levels.has("ADM4")) return "ADM4";
    if (levels.has("ADM3")) return "ADM3";
    if (levels.has("ADM2")) return "ADM2";
    if (levels.has("ADM1")) return "ADM1";
    return "ADM0";
  };

  // Compute completeness % based on lowest level
  const computeCompleteness = (data: PopulationRow[]) => {
    if (!data || data.length === 0) return 0;
    const targetLevel = computeLowestLevel(data);
    if (targetLevel === "None") return 0;

    const pcodes = new Set(data.map((r) => r.pcode));
    const targetAdmins = adminUnits.filter((a) => a.level === targetLevel);

    if (targetAdmins.length === 0) return 0;
    const covered = targetAdmins.filter((a) => pcodes.has(a.pcode)).length;
    return Math.round((covered / targetAdmins.length) * 100);
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

  const completeness = computeCompleteness(rows);
  const lowestLevel = computeLowestLevel(rows);

  return (
    <SidebarLayout headerProps={headerProps}>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Dataset Versions (2/3 width) */}
        <div className="lg:col-span-2 border rounded-lg p-4 shadow-sm overflow-x-auto">
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
                <th className="border px-2 py-1">Lowest Level</th>
                <th className="border px-2 py-1">% Complete</th>
                <th className="border px-2 py-1">Active</th>
                <th className="border px-2 py-1">Actions</th>
              </tr>
            </thead>
            <tbody>
              {datasets.map((ds) => {
                const isActive = ds.is_active;
                const isSelected = selectedDataset?.id === ds.id;
                const dsRows = isSelected ? rows : []; // compute only for selected dataset
                const comp = isSelected ? computeCompleteness(dsRows) : null;

                return (
                  <tr
                    key={ds.id}
                    className={`${isSelected ? "bg-blue-50" : ""} ${
                      isActive ? "font-semibold" : ""
                    } hover:bg-gray-50`}
                  >
                    <td className="border px-2 py-1">{ds.title || `Dataset ${ds.year}`}</td>
                    <td className="border px-2 py-1">{ds.year}</td>
                    <td className="border px-2 py-1">{ds.dataset_date || "-"}</td>
                    <td className="border px-2 py-1">{ds.source || "-"}</td>
                    <td className="border px-2 py-1">
                      {isSelected ? computeLowestLevel(dsRows) : "—"}
                    </td>
                    <td className="border px-2 py-1 text-center">
                      {comp !== null ? (
                        <span
                          className={`px-2 py-0.5 rounded text-xs ${
                            comp >= 90
                              ? "bg-green-100 text-green-700"
                              : comp >= 50
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {comp}%
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="border px-2 py-1 text-center">{isActive ? "✓" : ""}</td>
                    <td className="border px-2 py-1 space-x-2">
                      {!isSelected && (
                        <button
                          onClick={() => {
                            setSelectedDataset(ds);
                            fetchRows(ds.id);
                          }}
                          className="text-blue-600 hover:underline text-xs"
                        >
                          Select
                        </button>
                      )}
                      {!isActive && (
                        <button
                          onClick={() => makeActive(ds.id)}
                          className="text-green-600 hover:underline text-xs"
                        >
                          Make Active
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {datasets.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-4 text-gray-500">
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

        {/* Dataset Health (1/3 width) */}
        <div className="border rounded-lg p-4 shadow-sm">
          <h2 className="text-lg font-semibold mb-3">Dataset Health</h2>
          {rows.length === 0 ? (
            <p className="italic text-gray-400">No dataset selected</p>
          ) : (
            <ul className="text-sm space-y-2">
              <li>
                <strong>Total Records:</strong> {rows.length}
              </li>
              <li>
                <strong>Lowest Level:</strong> {lowestLevel}
              </li>
              <li>
                <strong>Completeness:</strong>{" "}
                <span
                  className={`px-2 py-0.5 rounded text-xs ${
                    completeness >= 90
                      ? "bg-green-100 text-green-700"
                      : completeness >= 50
                      ? "bg-yellow-100 text-yellow-700"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  {completeness}%
                </span>
              </li>
            </ul>
          )}
        </div>
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

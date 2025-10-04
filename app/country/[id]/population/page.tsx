"use client";

import { useEffect, useState } from "react";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import DatasetHealth from "@/components/country/DatasetHealth";
import UploadPopulationModal from "@/components/country/UploadPopulationModal";
import { Database, Upload, FileDown } from "lucide-react";
import type { CountryParams } from "@/app/country/types";

type Country = {
  iso_code: string;
  name: string;
};

type PopulationVersion = {
  id: string;
  title: string;
  year: number;
  dataset_date?: string;
  source?: string;
  created_at: string;
  is_active: boolean;
  notes?: string;
};

type PopulationRow = {
  id: string;
  pcode: string;
  name: string | null;
  population: number | null;
  dataset_version_id: string;
};

export default function PopulationPage({ params }: any) {
  const { id: countryIso } = params as CountryParams;

  const [country, setCountry] = useState<Country | null>(null);
  const [versions, setVersions] = useState<PopulationVersion[]>([]);
  const [activeVersion, setActiveVersion] = useState<PopulationVersion | null>(
    null
  );
  const [populationData, setPopulationData] = useState<PopulationRow[]>([]);
  const [openUpload, setOpenUpload] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 25;

  // Fetch country metadata
  useEffect(() => {
    const fetchCountry = async () => {
      const { data } = await supabase
        .from("countries")
        .select("iso_code,name")
        .eq("iso_code", countryIso)
        .single();
      if (data) setCountry(data);
    };
    fetchCountry();
  }, [countryIso]);

  const fetchVersions = async () => {
    const { data, error } = await supabase
      .from("population_dataset_versions")
      .select("*")
      .eq("country_iso", countryIso)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching versions:", error);
      return;
    }
    setVersions(data || []);
    const active = data?.find((v) => v.is_active);
    if (active) {
      setActiveVersion(active);
      fetchPopulationData(active.id);
    }
  };

  const fetchPopulationData = async (versionId: string) => {
    const { data, error } = await supabase
      .from("population_data")
      .select("*")
      .eq("country_iso", countryIso)
      .eq("dataset_version_id", versionId);

    if (error) {
      console.error("Error fetching population data:", error);
      return;
    }
    setPopulationData(data || []);
  };

  useEffect(() => {
    fetchVersions();
  }, [countryIso]);

  const handleMakeActive = async (versionId: string) => {
    await supabase
      .from("population_dataset_versions")
      .update({ is_active: false })
      .eq("country_iso", countryIso);

    await supabase
      .from("population_dataset_versions")
      .update({ is_active: true })
      .eq("id", versionId);

    fetchVersions();
  };

  const handleSelectVersion = (version: PopulationVersion) => {
    setActiveVersion(version);
    fetchPopulationData(version.id);
  };

  const downloadTemplate = () => {
    const headers = ["pcode", "name", "population"];
    const csv = headers.join(",") + "\n";
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "Country_Config_Population_Template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const headerProps = {
    title: `${country?.name ?? countryIso} – Population Dataset`,
    group: "country-config" as const,
    description: "Manage population datasets and demographics by admin level.",
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

  // Health indicators
  const missingPopulation = populationData.filter((r) => !r.population).length;
  const totalPopulation = populationData.length;
  const allHavePopulation =
    totalPopulation > 0 && missingPopulation === 0 ? true : false;

  // Pagination
  const filtered = populationData.filter(
    (r) =>
      r.name?.toLowerCase().includes(search.toLowerCase()) ||
      r.pcode.toLowerCase().includes(search.toLowerCase())
  );
  const totalPages = Math.ceil((filtered.length || 1) / pageSize);
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  return (
    <SidebarLayout headerProps={headerProps}>
      {/* Version Table */}
      <div className="border rounded-lg p-4 shadow-sm mb-6">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Database className="w-5 h-5 text-blue-600" /> Dataset Versions
          </h2>
          <button
            onClick={() => setOpenUpload(true)}
            className="flex items-center text-sm text-white bg-[color:var(--gsc-red)] px-3 py-1 rounded hover:opacity-90"
          >
            <Upload className="w-4 h-4 mr-1" /> Upload Dataset
          </button>
        </div>

        {versions.length > 0 ? (
          <table className="w-full text-sm border">
            <thead className="bg-gray-100">
              <tr>
                <th className="border px-2 py-1">Title</th>
                <th className="border px-2 py-1">Year</th>
                <th className="border px-2 py-1">Date</th>
                <th className="border px-2 py-1">Source</th>
                <th className="border px-2 py-1">Active</th>
                <th className="border px-2 py-1">Actions</th>
              </tr>
            </thead>
            <tbody>
              {versions.map((v) => (
                <tr
                  key={v.id}
                  className={`hover:bg-gray-50 ${
                    activeVersion?.id === v.id ? "bg-blue-50" : ""
                  }`}
                >
                  <td className="border px-2 py-1">{v.title}</td>
                  <td className="border px-2 py-1">{v.year}</td>
                  <td className="border px-2 py-1">{v.dataset_date || "—"}</td>
                  <td className="border px-2 py-1">{v.source || "—"}</td>
                  <td className="border px-2 py-1 text-center">
                    {v.is_active ? "✓" : ""}
                  </td>
                  <td className="border px-2 py-1 space-x-2">
                    <button
                      className="text-blue-600 hover:underline"
                      onClick={() => handleSelectVersion(v)}
                    >
                      Select
                    </button>
                    {!v.is_active && (
                      <button
                        className="text-green-600 hover:underline"
                        onClick={() => handleMakeActive(v.id)}
                      >
                        Make Active
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="italic text-gray-500">No population versions uploaded yet.</p>
        )}
      </div>

      {/* Health Card */}
      <DatasetHealth
        totalUnits={totalPopulation}
        missingPcodes={missingPopulation}
        allHavePcodes={allHavePopulation}
        hasPopulation={true}
      />

      {/* Data Table */}
      <div className="border rounded-lg p-4 shadow-sm mt-4">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-semibold">Population Data</h2>
          <button
            onClick={downloadTemplate}
            className="flex items-center text-sm border px-2 py-1 rounded hover:bg-gray-50"
          >
            <FileDown className="w-4 h-4 mr-1" /> Download Template
          </button>
        </div>

        {populationData.length > 0 ? (
          <>
            <div className="flex justify-between items-center mb-3">
              <input
                type="text"
                placeholder="Search by name or PCode..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="border px-3 py-1 rounded w-1/3 text-sm"
              />
              <span className="text-sm text-gray-500">
                Showing {paginated.length} of {filtered.length}
              </span>
            </div>

            <table className="w-full text-sm border">
              <thead className="bg-gray-100">
                <tr>
                  <th className="border px-2 py-1 text-left">Name</th>
                  <th className="border px-2 py-1 text-left">PCode</th>
                  <th className="border px-2 py-1 text-left">Population</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="border px-2 py-1">{r.name ?? "—"}</td>
                    <td className="border px-2 py-1">{r.pcode}</td>
                    <td className="border px-2 py-1">
                      {r.population?.toLocaleString() ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex justify-between items-center mt-3 text-sm">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-2 py-1 border rounded disabled:opacity-50"
              >
                Previous
              </button>
              <span>
                Page {page} of {totalPages || 1}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages || 1, p + 1))}
                disabled={page >= (totalPages || 1)}
                className="px-2 py-1 border rounded disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </>
        ) : (
          <p className="italic text-gray-500">No population data uploaded.</p>
        )}
      </div>

      <UploadPopulationModal
        open={openUpload}
        onClose={() => setOpenUpload(false)}
        countryIso={countryIso}
        onUploaded={fetchVersions}
      />
    </SidebarLayout>
  );
}

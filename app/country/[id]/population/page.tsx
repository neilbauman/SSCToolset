"use client";

import { useEffect, useState } from "react";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import EditDatasetSourceModal from "@/components/country/EditDatasetSourceModal";
import UploadPopulationModal from "@/components/country/UploadPopulationModal";
import DatasetHealth from "@/components/country/DatasetHealth";
import { Database, Pencil, Upload } from "lucide-react";
import type { CountryParams } from "@/app/country/types";

type Country = {
  iso_code: string;
  name: string;
  adm0_label: string;
  adm1_label: string;
  adm2_label: string;
  adm3_label: string;
  adm4_label: string;
  adm5_label: string;
};

type PopulationRow = {
  id: string;
  pcode: string;
  name: string;
  population: number;
  year: number;
  dataset_date: string;
  source?: { name: string; url?: string };
};

export default function PopulationPage({ params }: any) {
  const { id: countryIso } = params as CountryParams;

  const [country, setCountry] = useState<Country | null>(null);
  const [populationRows, setPopulationRows] = useState<PopulationRow[]>([]);
  const [source, setSource] = useState<{ name: string; url?: string } | null>(
    null
  );
  const [openSource, setOpenSource] = useState(false);
  const [openUpload, setOpenUpload] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 25;

  // Fetch country metadata
  useEffect(() => {
    const fetchCountry = async () => {
      const { data } = await supabase
        .from("countries")
        .select("*")
        .eq("iso_code", countryIso)
        .single();
      if (data) setCountry(data as Country);
    };
    fetchCountry();
  }, [countryIso]);

  // Fetch population data
  const fetchPopulation = async () => {
    const { data, error } = await supabase
      .from("population_data")
      .select("*")
      .eq("country_iso", countryIso);

    if (error) {
      console.error("Error fetching population_data:", error);
      return;
    }

    if (data) {
      setPopulationRows(data as PopulationRow[]);
      if (data.length > 0 && data[0].source) {
        setSource(data[0].source as { name: string; url?: string });
      }
    }
  };

  useEffect(() => {
    fetchPopulation();
  }, [countryIso]);

  // Pagination + search
  const filtered = populationRows.filter(
    (r) =>
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.pcode.toLowerCase().includes(search.toLowerCase())
  );
  const totalPages = Math.ceil((filtered.length || 1) / pageSize);
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const headerProps = {
    title: `${country?.name ?? countryIso} – Population`,
    group: "country-config" as const,
    description: "Manage and inspect uploaded population datasets.",
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

  const renderSource = (src: { name: string; url?: string } | null) => {
    if (!src) return <span className="italic text-gray-500">Empty</span>;
    return src.url ? (
      <a
        href={src.url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-600 hover:underline"
      >
        {src.name}
      </a>
    ) : (
      src.name
    );
  };

  // Health checks (stubbed for now, expand later)
  const hasPopulation = populationRows.length > 0;
  const hasYear = populationRows.every((r) => r.year);
  const allLinkedToAdmin = populationRows.every((r) => r.pcode);

  return (
    <SidebarLayout headerProps={headerProps}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Summary */}
        <div className="border rounded-lg p-4 shadow-sm">
          <h2 className="text-lg font-semibold flex items-center gap-2 mb-3">
            <Database className="w-5 h-5 text-blue-600" />
            Population Summary
            <span className="ml-2 px-2 py-0.5 text-xs rounded bg-[color:var(--gsc-red)] text-white">
              Core
            </span>
          </h2>
          <p className="text-sm text-gray-700 mb-2">
            <strong>Total Rows:</strong> {populationRows.length}
          </p>
          <p className="text-sm text-gray-700 mb-2">
            <strong>Latest Year:</strong>{" "}
            {populationRows.length > 0
              ? Math.max(...populationRows.map((r) => r.year))
              : "—"}
          </p>
          <div className="flex items-center justify-between mt-2 gap-2">
            <p className="text-sm">
              <strong>Dataset Source:</strong> {renderSource(source)}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setOpenSource(true)}
                className="flex items-center text-sm text-gray-700 border px-2 py-1 rounded hover:bg-gray-50"
              >
                <Pencil className="w-4 h-4 mr-1" /> Edit
              </button>
              <button
                onClick={() => setOpenUpload(true)}
                className="flex items-center text-sm text-white bg-[color:var(--gsc-red)] px-2 py-1 rounded hover:opacity-90"
              >
                <Upload className="w-4 h-4 mr-1" /> Replace Dataset
              </button>
            </div>
          </div>
        </div>

        {/* Data Health */}
        <DatasetHealth
          allHavePcodes={allLinkedToAdmin}
          missingPcodes={populationRows.filter((r) => !r.pcode).length}
          hasGISLink={false}
          hasPopulation={hasPopulation}
          totalUnits={populationRows.length}
        />
      </div>

      {/* Table */}
      <div className="border rounded-lg p-4 shadow-sm">
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
              <th className="border px-2 py-1 text-left">Year</th>
              <th className="border px-2 py-1 text-left">Population</th>
              <th className="border px-2 py-1 text-left">Dataset Date</th>
            </tr>
          </thead>
          <tbody>
            {paginated.map((r) => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="border px-2 py-1">{r.name}</td>
                <td className="border px-2 py-1">{r.pcode}</td>
                <td className="border px-2 py-1">{r.year}</td>
                <td className="border px-2 py-1">{r.population}</td>
                <td className="border px-2 py-1">{r.dataset_date ?? "—"}</td>
              </tr>
            ))}
            {paginated.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="text-center text-gray-500 py-6"
                >
                  No results
                </td>
              </tr>
            )}
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
      </div>

      {/* Modals */}
      <EditDatasetSourceModal
        open={openSource}
        onClose={() => setOpenSource(false)}
        source={source || undefined}
        onSave={async (newSource) => {
          await supabase
            .from("population_data")
            .update({ source: newSource })
            .eq("country_iso", countryIso);
          setSource(newSource);
        }}
      />

      <UploadPopulationModal
        open={openUpload}
        onClose={() => setOpenUpload(false)}
        countryIso={countryIso}
        onUploaded={fetchPopulation}
      />
    </SidebarLayout>
  );
}

"use client";

import { useEffect, useState } from "react";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import EditDatasetSourceModal from "@/components/country/EditDatasetSourceModal";
import DatasetHealth from "@/components/country/DatasetHealth";
import { Users, Pencil } from "lucide-react";

type Country = {
  iso: string;
  name: string;
};

type PopulationRow = {
  id: string;
  pcode: string;
  name: string;
  level: string;
  population: number;
  last_updated: string;
  source?: { name: string; url?: string };
};

export default function PopulationPage({ params }: { params: { id: string } }) {
  const countryIso = params.id;

  const [country, setCountry] = useState<Country | null>(null);
  const [population, setPopulation] = useState<PopulationRow[]>([]);
  const [source, setSource] = useState<{ name: string; url?: string } | null>(null);
  const [openSource, setOpenSource] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 25;

  useEffect(() => {
    const fetchCountry = async () => {
      const { data } = await supabase.from("countries").select("iso, name").eq("iso", countryIso).single();
      if (data) setCountry(data as Country);
    };
    fetchCountry();
  }, [countryIso]);

  useEffect(() => {
    const fetchPopulation = async () => {
      const { data } = await supabase.from("population_data").select("*").eq("country_iso", countryIso);
      if (data) setPopulation(data as PopulationRow[]);
    };
    fetchPopulation();
  }, [countryIso]);

  useEffect(() => {
    const fetchSource = async () => {
      const { data } = await supabase.from("population_data").select("source").eq("country_iso", countryIso).limit(1).maybeSingle();
      if (data?.source) setSource(data.source as any);
    };
    fetchSource();
  }, [countryIso]);

  // Health checks
  const missingPop = population.filter((p) => !p.population || p.population <= 0).length;
  const hasPopulation = population.length > 0 && missingPop === 0;
  const hasGISLink = false; // placeholder until GIS alignment
  const allHavePcodes = population.length > 0 && population.every((p) => p.pcode);
  const missingPcodes = population.filter((p) => !p.pcode).length;

  // Pagination + search
  const filtered = population.filter(
    (row) =>
      row.name.toLowerCase().includes(search.toLowerCase()) ||
      row.pcode.toLowerCase().includes(search.toLowerCase())
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

  return (
    <SidebarLayout headerProps={headerProps}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Summary */}
        <div className="border rounded-lg p-4 shadow-sm">
          <h2 className="text-lg font-semibold flex items-center gap-2 mb-3">
            <Users className="w-5 h-5 text-blue-600" />
            Population Summary
            <span className="ml-2 px-2 py-0.5 text-xs rounded bg-[color:var(--gsc-red)] text-white">
              Core
            </span>
          </h2>
          <p className="text-sm text-gray-700 mb-2">
            <strong>Total Rows:</strong> {population.length}
          </p>
          <p className="text-sm text-gray-700 mb-2">
            <strong>Last Updated:</strong>{" "}
            {population.length > 0 ? population[0].last_updated : "N/A"}
          </p>
          <div className="flex items-center justify-between mt-2">
            <p className="text-sm">
              <strong>Dataset Source:</strong>{" "}
              {source ? (
                source.url ? (
                  <a href={source.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                    {source.name}
                  </a>
                ) : (
                  source.name
                )
              ) : (
                <span className="italic text-gray-500">Empty</span>
              )}
            </p>
            <button
              onClick={() => setOpenSource(true)}
              className="flex items-center text-sm text-gray-700 border px-2 py-1 rounded hover:bg-gray-50"
            >
              <Pencil className="w-4 h-4 mr-1" /> Edit
            </button>
          </div>
        </div>

        {/* Data Health */}
        <DatasetHealth
          allHavePcodes={allHavePcodes}
          missingPcodes={missingPcodes}
          hasGISLink={hasGISLink}
          hasPopulation={hasPopulation}
          totalUnits={population.length}
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
              <th className="border px-2 py-1 text-left">Level</th>
              <th className="border px-2 py-1 text-left">Population</th>
              <th className="border px-2 py-1 text-left">Last Updated</th>
            </tr>
          </thead>
          <tbody>
            {paginated.map((row) => (
              <tr key={row.id} className="hover:bg-gray-50">
                <td className="border px-2 py-1">{row.name}</td>
                <td className="border px-2 py-1">{row.pcode}</td>
                <td className="border px-2 py-1">{row.level}</td>
                <td className="border px-2 py-1">{row.population}</td>
                <td className="border px-2 py-1">{row.last_updated}</td>
              </tr>
            ))}
            {paginated.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center text-gray-500 py-6">
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

      <EditDatasetSourceModal
        open={openSource}
        onClose={() => setOpenSource(false)}
        source={source || undefined}
        onSave={async (newSource) => {
          await supabase.from("population_data").update({ source: newSource }).eq("country_iso", countryIso);
          setSource(newSource);
        }}
      />
    </SidebarLayout>
  );
}

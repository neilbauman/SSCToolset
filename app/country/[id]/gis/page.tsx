"use client";

import { useEffect, useState } from "react";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import EditDatasetSourceModal from "@/components/country/EditDatasetSourceModal";
import DatasetHealth from "@/components/country/DatasetHealth";
import { Map, Pencil } from "lucide-react";
import type { CountryParams } from "@/app/country/types";

type Country = {
  iso: string;
  name: string;
};

type GISRow = {
  id: string;
  name: string;
  level: string;
  pcode: string;
  geometry_available: boolean;
  last_updated: string;
  source?: { name: string; url?: string };
};

export default function GISPage({ params }: any) {
  const { id: countryIso } = params as CountryParams;

  const [country, setCountry] = useState<Country | null>(null);
  const [gisData, setGisData] = useState<GISRow[]>([]);
  const [source, setSource] = useState<{ name: string; url?: string } | null>(
    null
  );
  const [openSource, setOpenSource] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 25;

  useEffect(() => {
    const fetchCountry = async () => {
      const { data } = await supabase
        .from("countries")
        .select("iso, name")
        .eq("iso", countryIso)
        .single();
      if (data) setCountry(data as Country);
    };
    fetchCountry();
  }, [countryIso]);

  useEffect(() => {
    const fetchGIS = async () => {
      const { data } = await supabase
        .from("gis_data")
        .select("*")
        .eq("country_iso", countryIso);
      if (data) setGisData(data as GISRow[]);
    };
    fetchGIS();
  }, [countryIso]);

  useEffect(() => {
    const fetchSource = async () => {
      const { data } = await supabase
        .from("gis_data")
        .select("source")
        .eq("country_iso", countryIso)
        .limit(1)
        .maybeSingle();
      if (data?.source) setSource(data.source as any);
    };
    fetchSource();
  }, [countryIso]);

  const hasGeometries =
    gisData.length > 0 && gisData.every((g) => g.geometry_available);
  const allHavePcodes = gisData.length > 0 && gisData.every((g) => g.pcode);
  const missingPcodes = gisData.filter((g) => !g.pcode).length;
  const hasPopulationLink = false;

  const filtered = gisData.filter(
    (row) =>
      row.name.toLowerCase().includes(search.toLowerCase()) ||
      row.pcode.toLowerCase().includes(search.toLowerCase())
  );
  const totalPages = Math.ceil((filtered.length || 1) / pageSize);
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const headerProps = {
    title: `${country?.name ?? countryIso} – GIS Data`,
    group: "country-config" as const,
    description: "Manage and inspect uploaded GIS / boundary datasets.",
    breadcrumbs: (
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Country Configuration", href: "/country" },
          { label: country?.name ?? countryIso, href: `/country/${countryIso}` },
          { label: "GIS" },
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
            <Map className="w-5 h-5 text-blue-600" />
            GIS Summary
            <span className="ml-2 px-2 py-0.5 text-xs rounded bg-[color:var(--gsc-red)] text-white">
              Core
            </span>
          </h2>
          <p className="text-sm text-gray-700 mb-2">
            <strong>Total Records:</strong> {gisData.length}
          </p>
          <p className="text-sm text-gray-700 mb-2">
            <strong>Last Updated:</strong>{" "}
            {gisData.length > 0 ? gisData[0].last_updated : "N/A"}
          </p>
          <div className="flex items-center justify-between mt-2">
            <p className="text-sm">
              <strong>Dataset Source:</strong>{" "}
              {source ? (
                source.url ? (
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
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
          hasGISLink={hasGeometries}
          hasPopulation={hasPopulationLink}
          totalUnits={gisData.length}
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
              <th className="border px-2 py-1 text-left">Geometry</th>
              <th className="border px-2 py-1 text-left">Last Updated</th>
            </tr>
          </thead>
          <tbody>
            {paginated.map((row) => (
              <tr key={row.id} className="hover:bg-gray-50">
                <td className="border px-2 py-1">{row.name}</td>
                <td className="border px-2 py-1">{row.pcode}</td>
                <td className="border px-2 py-1">{row.level}</td>
                <td className="border px-2 py-1">
                  {row.geometry_available ? "Yes" : "No"}
                </td>
                <td className="border px-2 py-1">{row.last_updated}</td>
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

      <EditDatasetSourceModal
        open={openSource}
        onClose={() => setOpenSource(false)}
        source={source || undefined}
        onSave={async (newSource) => {
          await supabase
            .from("gis_data")
            .update({ source: newSource })
            .eq("country_iso", countryIso);
          setSource(newSource);
        }}
      />
    </SidebarLayout>
  );
}

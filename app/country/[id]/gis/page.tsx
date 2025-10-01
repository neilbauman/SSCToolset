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
  iso_code: string;
  name: string;
};

type GISRow = {
  id: string;
  layer_name: string;
  format: string;
  feature_count: number;
  crs: string;
  source?: { name: string; url?: string };
  created_at: string;
};

export default function GISPage({ params }: { params: CountryParams }) {
  const countryIso = params.id;

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
        .select("iso_code, name")
        .eq("iso_code", countryIso)
        .single();
      if (data) setCountry(data as Country);
    };
    fetchCountry();
  }, [countryIso]);

  useEffect(() => {
    const fetchGIS = async () => {
      const { data } = await supabase
        .from("gis_layers")
        .select("*")
        .eq("country_iso", countryIso);
      if (data) setGisData(data as GISRow[]);
    };
    fetchGIS();
  }, [countryIso]);

  useEffect(() => {
    const fetchSource = async () => {
      const { data } = await supabase
        .from("gis_layers")
        .select("source")
        .eq("country_iso", countryIso)
        .limit(1)
        .maybeSingle();
      if (data?.source) setSource(data.source as any);
    };
    fetchSource();
  }, [countryIso]);

  // Health checks
  const allHaveFeatures =
    gisData.length > 0 && gisData.every((g) => g.feature_count > 0);
  const missingFeatures = gisData.filter((g) => !g.feature_count).length;
  const allHaveCRS = gisData.length > 0 && gisData.every((g) => g.crs);
  const missingCRS = gisData.filter((g) => !g.crs).length;

  // Pagination + search
  const filtered = gisData.filter(
    (row) =>
      row.layer_name.toLowerCase().includes(search.toLowerCase()) ||
      row.format.toLowerCase().includes(search.toLowerCase())
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
          <h2 className="text-base font-semibold flex items-center gap-2 mb-3">
            <Map className="w-5 h-5 text-blue-600" />
            GIS Summary
            <span className="ml-2 px-2 py-0.5 text-xs rounded bg-[color:var(--gsc-red)] text-white">
              Core
            </span>
          </h2>
          <div className="pl-2 text-sm space-y-1">
            <p><strong>Total Layers:</strong> {gisData.length}</p>
            <p><strong>Last Updated:</strong> {gisData.length > 0 ? gisData[0].created_at : "N/A"}</p>
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
        </div>

        {/* Data Health */}
        <DatasetHealth
          allHavePcodes={allHaveCRS}
          missingPcodes={missingCRS}
          hasGISLink={allHaveFeatures}
          hasPopulation={false}
          totalUnits={gisData.length}
        />
      </div>

      {/* Table */}
      <div className="border rounded-lg p-4 shadow-sm">
        <div className="flex justify-between items-center mb-3">
          <input
            type="text"
            placeholder="Search by name or format..."
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
          <thead className="bg-gray-100 text-sm font-semibold text-gray-700">
            <tr>
              <th className="border px-2 py-1 text-left">Layer Name</th>
              <th className="border px-2 py-1 text-left">Format</th>
              <th className="border px-2 py-1 text-left">Features</th>
              <th className="border px-2 py-1 text-left">CRS</th>
              <th className="border px-2 py-1 text-left">Created At</th>
            </tr>
          </thead>
          <tbody>
            {paginated.map((row) => (
              <tr key={row.id} className="hover:bg-gray-50 text-sm">
                <td className="border px-2 py-1">{row.layer_name}</td>
                <td className="border px-2 py-1">{row.format}</td>
                <td className="border px-2 py-1">{row.feature_count}</td>
                <td className="border px-2 py-1">{row.crs || "N/A"}</td>
                <td className="border px-2 py-1">{row.created_at}</td>
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
          await supabase
            .from("gis_layers")
            .update({ source: newSource })
            .eq("country_iso", countryIso);
          setSource(newSource);
        }}
      />
    </SidebarLayout>
  );
}

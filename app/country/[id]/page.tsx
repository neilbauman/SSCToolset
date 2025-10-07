"use client";

import { useEffect, useState } from "react";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { MapPinned, Layers, Users, Globe2, Edit3 } from "lucide-react";
import type { CountryParams } from "@/app/country/types";

type Country = {
  iso_code: string;
  name: string;
  population?: number | null;
  area_km2?: number | null;
  adm0_label?: string;
  adm1_label?: string;
  adm2_label?: string;
  adm3_label?: string;
  adm4_label?: string;
  adm5_label?: string;
};

type DatasetSummary = {
  population_versions: number;
  gis_versions: number;
  last_update?: string | null;
};

export default function CountryPage({ params }: { params: CountryParams }) {
  const { id } = params;
  const [country, setCountry] = useState<Country | null>(null);
  const [summary, setSummary] = useState<DatasetSummary | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch country + summary
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const { data: ctry } = await supabase
          .from("countries")
          .select("*")
          .eq("iso_code", id)
          .single();

        const { data: popVers } = await supabase
          .from("population_dataset_versions")
          .select("id, created_at")
          .eq("country_iso", id);

        const { data: gisVers } = await supabase
          .from("gis_dataset_versions")
          .select("id, created_at")
          .eq("country_iso", id);

        const latest = [...(popVers ?? []), ...(gisVers ?? [])]
          .map((v) => v.created_at)
          .sort()
          .pop();

        setCountry(ctry as Country);
        setSummary({
          population_versions: popVers?.length ?? 0,
          gis_versions: gisVers?.length ?? 0,
          last_update: latest ?? null,
        });
      } catch (e) {
        console.error("Failed to fetch country page data:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const headerProps = {
    title: `${country?.name ?? id}`,
    group: "country-config" as const,
    description: "Country configuration overview and data management dashboard.",
    breadcrumbs: (
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Country Configuration", href: "/country" },
          { label: country?.name ?? id },
        ]}
      />
    ),
  };

  if (loading)
    return (
      <SidebarLayout headerProps={headerProps}>
        <p className="italic text-gray-500">Loading country details…</p>
      </SidebarLayout>
    );

  if (!country)
    return (
      <SidebarLayout headerProps={headerProps}>
        <p className="italic text-red-600">Country not found.</p>
      </SidebarLayout>
    );

  return (
    <SidebarLayout headerProps={headerProps}>
      {/* --- Summary Cards --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="border rounded-lg p-4 shadow-sm flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-gray-500">Population Datasets</h3>
            <p className="text-xl font-semibold">{summary?.population_versions ?? 0}</p>
          </div>
          <Users className="w-6 h-6 text-[color:var(--gsc-blue)]" />
        </div>

        <div className="border rounded-lg p-4 shadow-sm flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-gray-500">GIS Versions</h3>
            <p className="text-xl font-semibold">{summary?.gis_versions ?? 0}</p>
          </div>
          <Layers className="w-6 h-6 text-green-700" />
        </div>

        <div className="border rounded-lg p-4 shadow-sm flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-gray-500">Last Update</h3>
            <p className="text-lg font-semibold">
              {summary?.last_update
                ? new Date(summary.last_update).toLocaleDateString()
                : "—"}
            </p>
          </div>
          <Globe2 className="w-6 h-6 text-[color:var(--gsc-red)]" />
        </div>
      </div>

      {/* --- Country Metadata --- */}
      <div className="border rounded-lg p-4 shadow-sm mb-6">
        <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
          <MapPinned className="w-5 h-5 text-[color:var(--gsc-blue)]" /> Administrative Labels
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
          <p>
            <span className="font-medium">ADM0:</span> {country.adm0_label ?? "—"}
          </p>
          <p>
            <span className="font-medium">ADM1:</span> {country.adm1_label ?? "—"}
          </p>
          <p>
            <span className="font-medium">ADM2:</span> {country.adm2_label ?? "—"}
          </p>
          <p>
            <span className="font-medium">ADM3:</span> {country.adm3_label ?? "—"}
          </p>
          <p>
            <span className="font-medium">ADM4:</span> {country.adm4_label ?? "—"}
          </p>
          <p>
            <span className="font-medium">ADM5:</span> {country.adm5_label ?? "—"}
          </p>
        </div>
      </div>

      {/* --- Navigation to Configuration Sections --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <a
          href={`/country/${id}/population`}
          className="block border rounded-lg p-4 shadow-sm hover:shadow-md transition bg-white"
        >
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-5 h-5 text-[color:var(--gsc-blue)]" />
            <h3 className="font-semibold text-[color:var(--gsc-blue)]">Population</h3>
          </div>
          <p className="text-sm text-gray-600">
            Manage population datasets and review uploaded population data per administrative
            level.
          </p>
        </a>

        <a
          href={`/country/${id}/gis`}
          className="block border rounded-lg p-4 shadow-sm hover:shadow-md transition bg-white"
        >
          <div className="flex items-center gap-2 mb-2">
            <Layers className="w-5 h-5 text-green-700" />
            <h3 className="font-semibold text-green-700">GIS Layers</h3>
          </div>
          <p className="text-sm text-gray-600">
            Upload and manage administrative boundary layers. Visualize and validate GeoJSON or
            shapefile data for this country.
          </p>
        </a>

        <a
          href={`/country/${id}/framework`}
          className="block border rounded-lg p-4 shadow-sm hover:shadow-md transition bg-white"
        >
          <div className="flex items-center gap-2 mb-2">
            <Edit3 className="w-5 h-5 text-[color:var(--gsc-red)]" />
            <h3 className="font-semibold text-[color:var(--gsc-red)]">Framework</h3>
          </div>
          <p className="text-sm text-gray-600">
            Define severity classification frameworks, categories, and indicators for this country.
          </p>
        </a>
      </div>
    </SidebarLayout>
  );
}

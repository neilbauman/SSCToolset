"use client";

import { useEffect, useMemo, useState } from "react";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { Database, FolderOpen, Map, Users } from "lucide-react";
import CountryMetadataCard from "@/components/country/CountryMetadataCard";
import ManageJoinsCard from "@/components/country/ManageJoinsCard";
import type { CountryParams } from "@/app/country/types";

type Country = {
  iso_code: string;
  name: string;
  adm0_label: string | null;
  adm1_label: string | null;
  adm2_label: string | null;
  adm3_label: string | null;
  adm4_label: string | null;
  adm5_label: string | null;
};

export default function CountryOverviewPage({ params }: any) {
  const { id: countryIso } = params as CountryParams;

  const [country, setCountry] = useState<Country | null>(null);

  // very light summaries; we just need “is anything uploaded?” for the chips
  const [adminVersions, setAdminVersions] = useState<number>(0);
  const [popVersions, setPopVersions] = useState<number>(0);
  const [gisVersions, setGisVersions] = useState<number>(0);

  useEffect(() => {
    const load = async () => {
      const { data: c } = await supabase
        .from("countries")
        .select(
          "iso_code,name,adm0_label,adm1_label,adm2_label,adm3_label,adm4_label,adm5_label"
        )
        .eq("iso_code", countryIso)
        .single();
      if (c) setCountry(c as Country);

      // admin dataset versions (new handler table)
      const { count: aCount } = await supabase
        .from("admin_datasets")
        .select("*", { count: "exact", head: true })
        .eq("country_iso", countryIso);

      // population versions (handler table)
      const { count: pCount } = await supabase
        .from("population_versions")
        .select("*", { count: "exact", head: true })
        .eq("country_iso", countryIso);

      // gis handler table
      const { count: gCount } = await supabase
        .from("gis_datasets")
        .select("*", { count: "exact", head: true })
        .eq("country_iso", countryIso);

      setAdminVersions(aCount ?? 0);
      setPopVersions(pCount ?? 0);
      setGisVersions(gCount ?? 0);
    };
    load();
  }, [countryIso]);

  const headerProps = useMemo(
    () => ({
      title: `${country?.name ?? countryIso} – Country Configuration`,
      group: "country-config" as const,
      description: "Manage core datasets and joins used by SSC analyses.",
      breadcrumbs: (
        <Breadcrumbs
          items={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Country Configuration", href: "/country" },
            { label: country?.name ?? countryIso, href: `/country/${countryIso}` },
          ]}
        />
      ),
    }),
    [country, countryIso]
  );

  const chip = (ok: boolean, labelIfOk = "uploaded", labelIfMissing = "missing") => (
    <span
      className={`ml-2 text-xs px-2 py-0.5 rounded ${
        ok ? "bg-green-100 text-green-800" : "bg-rose-100 text-rose-700"
      }`}
    >
      {ok ? labelIfOk : labelIfMissing}
    </span>
  );

  return (
    <SidebarLayout headerProps={headerProps}>
      {/* 2-column layout: left = dataset area, right = sticky metadata */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT: dataset cards + joins */}
        <div className="lg:col-span-2 space-y-6">
          {/* Top grid: Admins / Population / GIS / Other Datasets */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
            {/* Admins */}
            <section className="border rounded-lg p-4 shadow-sm">
              <h3 className="text-lg font-semibold flex items-center gap-2 mb-1">
                <FolderOpen className="w-5 h-5 text-emerald-600" />
                Places / Admin Units
                {chip(adminVersions > 0)}
              </h3>
              <p className="text-sm text-gray-700 mb-3">
                Administrative boundaries and place codes.
              </p>
              <p className="text-xs text-gray-500 mb-4">
                {adminVersions > 0 ? "Data uploaded" : "No data uploaded yet"}
              </p>
              <div className="flex gap-2">
                <a
                  href={`/country/${countryIso}/admins/template`}
                  className="border px-3 py-1.5 text-sm rounded hover:bg-gray-50"
                >
                  Download Template
                </a>
                <a
                  href={`/country/${countryIso}/admins`}
                  className="bg-green-600 text-white px-3 py-1.5 text-sm rounded hover:opacity-90"
                >
                  Upload Data
                </a>
                <a
                  href={`/country/${countryIso}/admins`}
                  className="bg-blue-700 text-white px-3 py-1.5 text-sm rounded hover:opacity-90"
                >
                  View
                </a>
              </div>
            </section>

            {/* Population */}
            <section className="border rounded-lg p-4 shadow-sm">
              <h3 className="text-lg font-semibold flex items-center gap-2 mb-1">
                <Users className="w-5 h-5 text-indigo-600" />
                Populations / Demographics
                {chip(popVersions > 0)}
              </h3>
              <p className="text-sm text-gray-700 mb-3">
                Census population and demographic indicators.
              </p>
              <p className="text-xs text-gray-500 mb-4">
                {popVersions > 0 ? "Data uploaded" : "No data uploaded yet"}
              </p>
              <div className="flex gap-2">
                <a
                  href={`/country/${countryIso}/population/template`}
                  className="border px-3 py-1.5 text-sm rounded hover:bg-gray-50"
                >
                  Download Template
                </a>
                <a
                  href={`/country/${countryIso}/population`}
                  className="bg-green-600 text-white px-3 py-1.5 text-sm rounded hover:opacity-90"
                >
                  Upload Data
                </a>
                <a
                  href={`/country/${countryIso}/population`}
                  className="bg-blue-700 text-white px-3 py-1.5 text-sm rounded hover:opacity-90"
                >
                  View
                </a>
              </div>
            </section>

            {/* GIS */}
            <section className="border rounded-lg p-4 shadow-sm">
              <h3 className="text-lg font-semibold flex items-center gap-2 mb-1">
                <Map className="w-5 h-5 text-amber-600" />
                GIS / Mapping
                {chip(gisVersions > 0)}
              </h3>
              <p className="text-sm text-gray-700 mb-3">
                Geospatial boundary data and mapping layers.
              </p>
              <p className="text-xs text-gray-500 mb-4">
                {gisVersions > 0 ? "Data uploaded" : "No data uploaded yet"}
              </p>
              <div className="flex gap-2">
                <a
                  href={`/country/${countryIso}/gis/template`}
                  className="border px-3 py-1.5 text-sm rounded hover:bg-gray-50"
                >
                  Download Template
                </a>
                <a
                  href={`/country/${countryIso}/gis`}
                  className="bg-green-600 text-white px-3 py-1.5 text-sm rounded hover:opacity-90"
                >
                  Upload Data
                </a>
                <a
                  href={`/country/${countryIso}/gis`}
                  className="bg-blue-700 text-white px-3 py-1.5 text-sm rounded hover:opacity-90"
                >
                  View
                </a>
              </div>
            </section>

            {/* Other Datasets (kept simple / flexible) */}
            <section className="border rounded-lg p-4 shadow-sm">
              <h3 className="text-lg font-semibold flex items-center gap-2 mb-1">
                <Database className="w-5 h-5 text-sky-600" />
                Other Datasets
                <span className="ml-2 text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-700">
                  Flexible
                </span>
              </h3>
              <p className="text-sm text-gray-700 mb-3">
                Additional country-specific datasets that extend the baseline.
              </p>
              <p className="text-xs text-gray-500 mb-4 italic">
                To be implemented.
              </p>
              <div className="flex gap-2">
                <a
                  href={`/country/${countryIso}/other-datasets`}
                  className="border px-3 py-1.5 text-sm rounded hover:bg-gray-50"
                >
                  Explore
                </a>
              </div>
            </section>
          </div>

          {/* Manage Joins (below the four cards) */}
          <ManageJoinsCard countryIso={countryIso} className="w-full" />
        </div>

        {/* RIGHT: Country metadata (sticky so it doesn't get cut off) */}
        <aside className="lg:col-span-1">
          <div className="lg:sticky lg:top-4">
            <CountryMetadataCard countryIso={countryIso} />
          </div>
        </aside>
      </div>
    </SidebarLayout>
  );
}

"use client";

import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import Link from "next/link";
import { Map as MapIcon, Users, Database } from "lucide-react";
import { MapContainer, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { useState, useEffect } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";

interface CountryRecord {
  iso_code: string;
  name: string;
  adm0_label: string;
  adm1_label: string;
  adm2_label: string;
  adm3_label: string;
  adm4_label: string;
  adm5_label: string;
  boundaries_source?: string;
  population_source?: string;
  dataset_sources?: { name: string; url?: string }[];
  extra_metadata?: Record<string, string>;
}

export default function CountryPage({ params }: any) {
  const countryIso = params.id;
  const [country, setCountry] = useState<CountryRecord | null>(null);

  useEffect(() => {
    const fetchCountry = async () => {
      const { data, error } = await supabase
        .from("countries")
        .select("*")
        .eq("iso_code", countryIso)
        .single();
      if (!error) setCountry(data as CountryRecord);
    };
    fetchCountry();
  }, [countryIso]);

  const headerProps = {
    title: `Country Dashboard: ${countryIso}`,
    group: "country-config" as const,
    description:
      "Overview of baseline datasets and configuration for this country.",
    breadcrumbs: (
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Country Configuration", href: "/country" },
          { label: countryIso },
        ]}
      />
    ),
  };

  return (
    <SidebarLayout headerProps={headerProps}>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map Overview */}
        <div className="lg:col-span-2 border rounded-lg p-4 shadow-sm bg-white">
          <h2 className="text-lg font-semibold mb-3">Map Overview</h2>
          <MapContainer
            center={[12.8797, 121.774]} // Default Philippines center
            zoom={5}
            style={{ height: "400px", width: "100%" }}
            className="rounded-md"
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution="&copy; OpenStreetMap contributors"
            />
          </MapContainer>
        </div>

        {/* Metadata */}
        <div className="border rounded-lg p-4 shadow-sm bg-white">
          <h2 className="text-lg font-semibold mb-3">Country Metadata</h2>

          {country ? (
            <>
              <h3 className="text-[color:var(--gsc-red)] font-medium mb-1">
                Core Metadata
              </h3>
              <ul className="text-sm mb-3">
                <li><strong>ISO:</strong> {country.iso_code}</li>
                <li><strong>Name:</strong> {country.name}</li>
                <li><strong>ADM0 Label:</strong> {country.adm0_label}</li>
                <li><strong>ADM1 Label:</strong> {country.adm1_label}</li>
                <li><strong>ADM2 Label:</strong> {country.adm2_label}</li>
                <li><strong>ADM3 Label:</strong> {country.adm3_label}</li>
                <li><strong>ADM4 Label:</strong> {country.adm4_label}</li>
                <li><strong>ADM5 Label:</strong> {country.adm5_label}</li>
              </ul>

              {country.dataset_sources && (
                <div className="mb-3">
                  <h4 className="font-medium">Sources:</h4>
                  <ul className="list-disc pl-4 text-sm text-blue-600">
                    {country.dataset_sources.map((s, i) => (
                      <li key={i}>
                        {s.url ? (
                          <a href={s.url} target="_blank" rel="noreferrer">
                            {s.name}
                          </a>
                        ) : (
                          s.name
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {country.extra_metadata && (
                <>
                  <h3 className="text-[color:var(--gsc-red)] font-medium mb-1">
                    Extra Metadata
                  </h3>
                  <ul className="text-sm">
                    {Object.entries(country.extra_metadata).map(([k, v]) => (
                      <li key={k}>
                        <strong>{k}:</strong> {v}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </>
          ) : (
            <p className="text-sm text-gray-500 italic">Loading metadata...</p>
          )}
        </div>
      </div>

      {/* Dataset Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        {/* Admin Units */}
        <Link
          href={`/country/${countryIso}/admins`}
          className="border rounded-lg p-4 shadow-sm hover:shadow-md transition flex items-center gap-3 bg-white"
        >
          <Database className="w-6 h-6 text-[color:var(--gsc-green)]" />
          <div>
            <h3 className="font-semibold text-lg">Places / Admin Units</h3>
            <p className="text-sm text-gray-600">
              Upload and manage administrative boundaries.
            </p>
          </div>
        </Link>

        {/* Population */}
        <Link
          href={`/country/${countryIso}/population`}
          className="border rounded-lg p-4 shadow-sm hover:shadow-md transition flex items-center gap-3 bg-white"
        >
          <Users className="w-6 h-6 text-[color:var(--gsc-blue)]" />
          <div>
            <h3 className="font-semibold text-lg">
              Population &amp; Demographics
            </h3>
            <p className="text-sm text-gray-600">
              Upload and manage population datasets by admin unit.
            </p>
          </div>
        </Link>

        {/* GIS */}
        <div className="border rounded-lg p-4 shadow-sm bg-gray-50 flex items-center gap-3">
          <MapIcon className="w-6 h-6 text-[color:var(--gsc-orange)]" />
          <div>
            <h3 className="font-semibold text-lg">GIS &amp; Mapping</h3>
            <p className="text-sm text-gray-600">
              Coming soon: Upload shapefiles and visualize datasets.
            </p>
          </div>
        </div>
      </div>
    </SidebarLayout>
  );
}

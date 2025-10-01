"use client";

import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { Map, Users, Database, AlertCircle, Pencil } from "lucide-react";
import dynamic from "next/dynamic";
import "leaflet/dist/leaflet.css";
import Link from "next/link";
import { useState, useEffect } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import EditMetadataModal from "@/components/country/EditMetadataModal";
import type { CountryParams } from "@/app/country/types";

// SSR-safe Leaflet
const MapContainer = dynamic(
  () => import("react-leaflet").then((m) => m.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import("react-leaflet").then((m) => m.TileLayer),
  { ssr: false }
);

function SoftButton({
  children,
  color = "gray",
  href,
  onClick,
}: {
  children: React.ReactNode;
  color?: "gray" | "green" | "blue" | "red";
  href?: string;
  onClick?: () => void;
}) {
  const base =
    "px-3 py-1.5 text-sm rounded-md font-medium shadow-sm transition-colors";
  const colors: Record<string, string> = {
    gray: "bg-gray-100 text-gray-800 hover:bg-gray-200",
    green: "bg-[color:var(--gsc-green)] text-white hover:opacity-90",
    blue: "bg-[color:var(--gsc-blue)] text-white hover:opacity-90",
    red: "bg-[color:var(--gsc-red)] text-white hover:opacity-90",
  };

  if (href) {
    return (
      <Link href={href} className={`${base} ${colors[color]}`}>
        {children}
      </Link>
    );
  }
  return (
    <button onClick={onClick} className={`${base} ${colors[color]}`}>
      {children}
    </button>
  );
}

function renderExtraEntry(entry: { label: string; value: string; url?: string }) {
  return entry.url ? (
    <a
      href={entry.url}
      target="_blank"
      rel="noopener noreferrer"
      className="text-blue-700 hover:underline"
    >
      {entry.value}
    </a>
  ) : (
    <span>{entry.value}</span>
  );
}

function StatusBadge({ status }: { status: "uploaded" | "partial" | "missing" | "empty" }) {
  const styles: Record<string, string> = {
    uploaded: "bg-green-100 text-green-700",
    partial: "bg-yellow-100 text-yellow-700",
    missing: "bg-red-100 text-red-700",
    empty: "bg-gray-100 text-gray-700",
  };
  return (
    <span className={`px-2 py-1 text-xs rounded ${styles[status]}`}>
      {status}
    </span>
  );
}

export default function CountryConfigLandingPage({ params }: any) {
  const { id } = params as CountryParams;

  const [country, setCountry] = useState<any>(null);
  const [adminCount, setAdminCount] = useState(0);
  const [popCount, setPopCount] = useState(0);
  const [gisCount, setGisCount] = useState(0);
  const [statusData, setStatusData] = useState<any>(null);
  const [openMeta, setOpenMeta] = useState(false);

  useEffect(() => {
    const fetchCountry = async () => {
      const { data } = await supabase
        .from("countries")
        .select("*")
        .eq("iso_code", id)
        .single();
      if (data) setCountry(data);
    };
    fetchCountry();
  }, [id]);

  useEffect(() => {
    const fetchStatuses = async () => {
      const { data: admins } = await supabase
        .from("admin_units")
        .select("level")
        .eq("country_iso", id);

      const { data: pop } = await supabase
        .from("population_data")
        .select("pcode, population")
        .eq("country_iso", id);

      const { data: gis } = await supabase
        .from("gis_layers")
        .select("geometry_available")
        .eq("country_iso", id);

      setAdminCount(admins?.length || 0);
      setPopCount(pop?.length || 0);
      setGisCount(gis?.length || 0);
      setStatusData({ admins, pop, gis });
    };
    fetchStatuses();
  }, [id]);

  const computeStatus = (key: string) => {
    if (key === "admins") {
      const admins = statusData?.admins || [];
      if (admins.length === 0) return "missing";
      const levels = new Set(admins.map((a: any) => a.level));
      const required = ["ADM0", "ADM1", "ADM2"];
      const hasAll = required.every((lvl) => levels.has(lvl));
      return hasAll ? "uploaded" : "partial";
    }
    if (key === "population") {
      const pop = statusData?.pop || [];
      if (pop.length === 0) return "missing";
      const invalid = pop.some(
        (p: any) => !p.pcode || !p.population || p.population <= 0
      );
      return invalid ? "partial" : "uploaded";
    }
    if (key === "gis") {
      const gis = statusData?.gis || [];
      if (gis.length === 0) return "missing";
      const invalid = gis.some((g: any) => g.geometry_available === false);
      return invalid ? "partial" : "uploaded";
    }
    return "empty";
  };

  const datasets = [
    {
      key: "admins",
      title: "Places / Admin Units",
      description: "Administrative boundaries and place codes.",
      count: adminCount,
      status: computeStatus("admins"),
      icon: <Map className="w-6 h-6 text-green-600" />,
      href: `/country/${id}/admins`,
    },
    {
      key: "population",
      title: "Populations / Demographics",
      description: "Census population and demographic indicators.",
      count: popCount,
      status: computeStatus("population"),
      icon: <Users className="w-6 h-6 text-gray-500" />,
      href: `/country/${id}/population`,
    },
    {
      key: "gis",
      title: "GIS / Mapping",
      description: "Geospatial boundary data and mapping layers.",
      count: gisCount,
      status: computeStatus("gis"),
      icon: <Database className="w-6 h-6 text-yellow-600" />,
      href: `/country/${id}/gis`,
    },
  ] as const;

  const headerProps = {
    title: `${country?.name ?? id} – Country Configuration`,
    group: "country-config" as const,
    description: "Manage baseline datasets and metadata for this country.",
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

  return (
    <SidebarLayout headerProps={headerProps}>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map */}
        <div className="lg:col-span-2 border rounded-lg p-4 shadow-sm">
          <h2 className="text-lg font-semibold mb-3">Map Overview</h2>
          <MapContainer
            center={[12.8797, 121.774]}
            zoom={5}
            style={{ height: "500px", width: "100%" }}
            className="rounded-md z-0"
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution="&copy; OpenStreetMap contributors"
            />
          </MapContainer>
        </div>

        {/* Metadata */}
        <div className="border rounded-lg p-4 shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-semibold mb-3">Country Metadata</h2>
            {country ? (
              <>
                {/* Core */}
                <h3 className="text-base font-semibold text-[color:var(--gsc-red)] mb-2">
                  Core Metadata
                </h3>
                <div className="pl-2 text-sm space-y-1">
                  <p><strong>ISO:</strong> {country.iso_code}</p>
                  <p><strong>Name:</strong> {country.name}</p>
                  <p><strong>ADM0 Label:</strong> {country.adm0_label}</p>
                  <p><strong>ADM1 Label:</strong> {country.adm1_label}</p>
                  <p><strong>ADM2 Label:</strong> {country.adm2_label}</p>
                  <p><strong>ADM3 Label:</strong> {country.adm3_label}</p>
                  <p><strong>ADM4 Label:</strong> {country.adm4_label}</p>
                  <p><strong>ADM5 Label:</strong> {country.adm5_label}</p>

                  <div className="mt-2">
                    <p className="font-medium">Sources:</p>
                    {country.dataset_sources?.length > 0 ? (
                      <ul className="list-disc pl-6 text-blue-700">
                        {country.dataset_sources.map((src: any, idx: number) => (
                          <li key={idx}>
                            {src?.url ? (
                              <a
                                href={src.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:underline"
                              >
                                {src.name}
                              </a>
                            ) : (
                              <span>{src?.name ?? "Unknown source"}</span>
                            )}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="italic text-gray-400">No sources provided</p>
                    )}
                  </div>
                </div>

                {/* Extra */}
                <h3 className="text-base font-semibold text-[color:var(--gsc-red)] mt-4 mb-2">
                  Extra Metadata
                </h3>
                <div className="pl-2 text-sm space-y-1">
                  {country.extra_metadata && Object.keys(country.extra_metadata).length > 0 ? (
                    Object.entries(country.extra_metadata).map(([k, v]) => {
                      const entry = v as { label: string; value: string; url?: string };
                      return (
                        <p key={k}>
                          <strong>{entry.label}:</strong>{" "}
                          {renderExtraEntry(entry)}
                        </p>
                      );
                    })
                  ) : (
                    <p className="italic text-gray-400">None</p>
                  )}
                </div>
              </>
            ) : (
              <p className="text-gray-500">Loading metadata...</p>
            )}
          </div>
          <SoftButton color="gray" onClick={() => setOpenMeta(true)}>
            <Pencil className="inline w-4 h-4 mr-1" /> Edit Metadata
          </SoftButton>
        </div>
      </div>

      {/* Dataset cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        {datasets.map((d) => (
          <div key={d.key} className="border rounded-lg p-5 shadow-sm hover:shadow-md transition">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                {d.icon}
                <Link href={d.href}>
                  <h3 className="text-lg font-semibold hover:underline">{d.title}</h3>
                </Link>
              </div>
              <StatusBadge status={d.status} />
            </div>
            <p className="text-sm text-gray-600 mb-2">{d.description}</p>
            {d.count > 0 ? (
              <p className="text-sm text-gray-500 mb-3">📊 Total: {d.count}</p>
            ) : (
              <p className="italic text-gray-400 mb-3">No data uploaded yet</p>
            )}
            <div className="flex gap-2">
              <SoftButton color="gray">Download Template</SoftButton>
              <SoftButton color="green">Upload Data</SoftButton>
              <SoftButton color="blue" href={d.href}>View</SoftButton>
            </div>
          </div>
        ))}

        {/* Other datasets */}
        <div className="border rounded-lg p-5 shadow-sm hover:shadow-md transition col-span-1 md:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-6 h-6 text-blue-600" />
              <h3 className="text-lg font-semibold">Other Datasets</h3>
            </div>
            <span className="px-2 py-1 text-xs rounded bg-blue-100 text-blue-700">
              Flexible
            </span>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            Additional country-specific datasets that extend the baseline.
          </p>
          <p className="italic text-gray-500">🚧 To be implemented.</p>
        </div>
      </div>

      {/* Edit Metadata Modal */}
      {country && (
        <EditMetadataModal
          open={openMeta}
          onClose={() => setOpenMeta(false)}
          metadata={{
            iso_code: country.iso_code,
            name: country.name,
            admLabels: {
              adm0: country.adm0_label,
              adm1: country.adm1_label,
              adm2: country.adm2_label,
              adm3: country.adm3_label,
              adm4: country.adm4_label,
              adm5: country.adm5_label,
            },
            datasetSources: country.dataset_sources || [],
            extra: country.extra_metadata || {},
          }}
          onSave={async (updated) => {
            await supabase.from("countries").upsert({
              iso_code: updated.iso_code,
              name: updated.name,
              adm0_label: updated.admLabels.adm0,
              adm1_label: updated.admLabels.adm1,
              adm2_label: updated.admLabels.adm2,
              adm3_label: updated.admLabels.adm3,
              adm4_label: updated.admLabels.adm4,
              adm5_label: updated.admLabels.adm5,
              dataset_sources: updated.datasetSources,
              extra_metadata: updated.extra ?? {},
            });
            setCountry({
              ...country,
              ...updated,
              adm0_label: updated.admLabels.adm0,
              adm1_label: updated.admLabels.adm1,
              adm2_label: updated.admLabels.adm2,
              adm3_label: updated.admLabels.adm3,
              adm4_label: updated.admLabels.adm4,
              adm5_label: updated.admLabels.adm5,
              dataset_sources: updated.datasetSources,
              extra_metadata: updated.extra ?? {},
            });
          }}
        />
      )}
    </SidebarLayout>
  );
}

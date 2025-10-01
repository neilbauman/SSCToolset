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

function renderMetaValue(value: string) {
  if (!value || value.trim() === "") {
    return (
      <span className="px-2 py-0.5 rounded bg-red-100 text-red-700 text-xs">
        Empty
      </span>
    );
  }
  if (value === "N/A") {
    return <span className="italic text-gray-400">Not applicable</span>;
  }
  return value;
}

// --- Helpers for human-friendly extra metadata rendering ---
const isPlainObject = (v: unknown): v is Record<string, any> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

const humanizeKey = (key: string) => {
  // snake_case / kebab-case / camelCase -> Title Case
  const spaced = key
    .replace(/[_-]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .toLowerCase();
  return spaced.replace(/\b\w/g, (c) => c.toUpperCase());
};

function renderExtraValue(v: unknown) {
  // strings / numbers / booleans straight through
  if (
    typeof v === "string" ||
    typeof v === "number" ||
    typeof v === "boolean"
  ) {
    return String(v);
  }

  // arrays → bullet list
  if (Array.isArray(v)) {
    if (v.length === 0) return <span className="italic text-gray-400">Empty</span>;
    return (
      <ul className="list-disc pl-5">
        {v.map((item, idx) => (
          <li key={idx}>{renderExtraValue(item)}</li>
        ))}
      </ul>
    );
  }

  // objects with { label|value, url? } → linked label/value
  if (isPlainObject(v)) {
    const labelish = (v.label ?? v.value) as string | undefined;
    if (labelish) {
      const url = typeof v.url === "string" ? v.url : undefined;
      return url ? (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-700 hover:underline"
        >
          {labelish}
        </a>
      ) : (
        <span>{labelish}</span>
      );
    }
    // Otherwise pretty-print as compact JSON
    try {
      return (
        <code className="text-xs bg-gray-50 px-1 py-0.5 rounded">
          {JSON.stringify(v)}
        </code>
      );
    } catch {
      return <span className="italic text-gray-400">Unsupported value</span>;
    }
  }

  // fallback
  return <span className="italic text-gray-400">Unsupported value</span>;
}

export default function CountryConfigLandingPage({ params }: any) {
  const { id } = params as CountryParams;

  const [country, setCountry] = useState<any>(null);
  const [adminCount, setAdminCount] = useState(0);
  const [popCount, setPopCount] = useState(0);
  const [gisCount, setGisCount] = useState(0);
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
    const fetchCounts = async () => {
      const { count: adminCnt } = await supabase
        .from("admin_units")
        .select("*", { count: "exact", head: true })
        .eq("country_iso", id);
      setAdminCount(adminCnt || 0);

      const { count: popCnt } = await supabase
        .from("population_data")
        .select("*", { count: "exact", head: true })
        .eq("country_iso", id);
      setPopCount(popCnt || 0);

      const { count: gisCnt } = await supabase
        .from("gis_layers")
        .select("*", { count: "exact", head: true })
        .eq("country_iso", id);
      setGisCount(gisCnt || 0);
    };
    fetchCounts();
  }, [id]);

  const datasets = [
    {
      key: "admins",
      title: "Places / Admin Units",
      description: "Administrative boundaries and place codes.",
      count: adminCount,
      icon: <Map className="w-6 h-6 text-green-600" />,
      href: `/country/${id}/admins`,
    },
    {
      key: "population",
      title: "Populations / Demographics",
      description: "Census population and demographic indicators.",
      count: popCount,
      icon: <Users className="w-6 h-6 text-gray-500" />,
      href: `/country/${id}/population`,
    },
    {
      key: "gis",
      title: "GIS / Mapping",
      description: "Geospatial boundary data and mapping layers.",
      count: gisCount,
      icon: <Database className="w-6 h-6 text-yellow-600" />,
      href: `/country/${id}/gis`,
    },
  ];

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
                <h3 className="text-sm font-semibold text-[color:var(--gsc-red)] mb-2">
                  Core Metadata
                </h3>
                <p><strong>ISO:</strong> {renderMetaValue(country.iso_code)}</p>
                <p><strong>Name:</strong> {renderMetaValue(country.name)}</p>
                <p><strong>ADM0 Label:</strong> {renderMetaValue(country.adm0_label)}</p>
                <p><strong>ADM1 Label:</strong> {renderMetaValue(country.adm1_label)}</p>
                <p><strong>ADM2 Label:</strong> {renderMetaValue(country.adm2_label)}</p>
                <p><strong>ADM3 Label:</strong> {renderMetaValue(country.adm3_label)}</p>
                <p><strong>ADM4 Label:</strong> {renderMetaValue(country.adm4_label)}</p>
                <p><strong>ADM5 Label:</strong> {renderMetaValue(country.adm5_label)}</p>

                <p className="mt-2 font-medium">Sources:</p>
                {country.dataset_sources?.length > 0 ? (
                  <ul className="list-disc pl-6 text-sm text-blue-700">
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

                {/* Extra */}
                <h3 className="text-sm font-semibold text-[color:var(--gsc-red)] mt-4 mb-2">
                  Extra Metadata
                </h3>
                {country.extra_metadata && Object.keys(country.extra_metadata).length > 0 ? (
                  <div className="space-y-1">
                    {Object.entries(country.extra_metadata).map(([k, v]) => (
                      <p key={k}>
                        <strong>{humanizeKey(k)}:</strong>{" "}
                        {renderExtraValue(v)}
                      </p>
                    ))}
                  </div>
                ) : (
                  <p className="italic text-gray-400">None</p>
                )}
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

      {/* Dataset cards below */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        {datasets.map((d) => (
          <div key={d.key} className="border rounded-lg p-5 shadow-sm hover:shadow-md transition">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                {d.icon}
                <h3 className="text-lg font-semibold">{d.title}</h3>
              </div>
              <span className="px-2 py-1 text-xs rounded bg-gray-100 text-gray-700">
                {d.count > 0 ? `${d.count} records` : "empty"}
              </span>
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
            // preserve any existing complex shapes in extra_metadata
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

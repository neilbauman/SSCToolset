"use client";

import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { Map, Users, Database, AlertCircle, Pencil, Link as LinkIcon } from "lucide-react";
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

  // Integration health counts
  const [popLinked, setPopLinked] = useState(0);
  const [gisWithCRS, setGisWithCRS] = useState(0);

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
        .select("pcode, level")
        .eq("country_iso", id);

      const { data: pop } = await supabase
        .from("population_data")
        .select("pcode, population")
        .eq("country_iso", id);

      const { data: gis } = await supabase
        .from("gis_layers")
        .select("crs")
        .eq("country_iso", id);

      setAdminCount(admins?.length || 0);
      setPopCount(pop?.length || 0);
      setGisCount(gis?.length || 0);

      // Linked population rows (valid PCode)
      const adminSet = new Set(admins?.map((a) => a.pcode));
      setPopLinked(pop?.filter((r) => adminSet.has(r.pcode)).length || 0);

      // GIS layers with CRS
      setGisWithCRS(gis?.filter((g) => g.crs && g.crs.startsWith("EPSG:")).length || 0);

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
      const invalid = gis.some((g: any) => !g.crs || !g.crs.startsWith("EPSG:"));
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

  const badge = (value: number, total: number) => {
    if (total === 0) return <span className="ml-2 text-xs px-2 py-0.5 rounded border bg-gray-100 text-gray-700">0</span>;
    const ratio = `${value}/${total}`;
    let color = "bg-green-100 text-green-800 border-green-300";
    if (value === 0) color = "bg-red-100 text-red-800 border-red-300";
    else if (value < total) color = "bg-yellow-100 text-yellow-700 border-yellow-300";
    return <span className={`ml-2 text-xs px-2 py-0.5 rounded border ${color}`}>{ratio}</span>;
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
          {/* existing metadata block unchanged */}
          {/* ... */}
        </div>
      </div>

      {/* Dataset cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        {datasets.map((d) => (
          <div key={d.key} className="border rounded-lg p-5 shadow-sm hover:shadow-md transition">
            {/* existing dataset card unchanged */}
          </div>
        ))}

        {/* Integration Health Card */}
        <div className="border rounded-lg p-5 shadow-sm hover:shadow-md transition col-span-1 md:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <LinkIcon className="w-6 h-6 text-blue-600" />
              <h3 className="text-lg font-semibold">Dataset Integration Health</h3>
            </div>
            <SoftButton color="blue" href={`/country/${id}/joins`}>
              Manage Joins
            </SoftButton>
          </div>
          <ul className="text-sm space-y-2">
            <li>
              Population rows linked to Admin Units
              {badge(popLinked, popCount)}
            </li>
            <li>
              GIS layers with CRS
              {badge(gisWithCRS, gisCount)}
            </li>
          </ul>
        </div>
      </div>

      {/* Edit Metadata Modal (unchanged) */}
      {/* ... */}
    </SidebarLayout>
  );
}

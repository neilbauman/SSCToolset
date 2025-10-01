"use client";

import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { Map, Users, Database, AlertCircle, Pencil } from "lucide-react";
import { MapContainer, TileLayer } from "react-leaflet";
import { LatLngExpression } from "leaflet";
import "leaflet/dist/leaflet.css";
import Link from "next/link";
import { useState, useEffect } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import EditMetadataModal from "@/components/country/EditMetadataModal";
import type { CountryParams } from "@/app/country/types";

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

export default function CountryConfigLandingPage({
  params,
}: {
  params: CountryParams;
}) {
  const id = params.id;

  const [country, setCountry] = useState<any>(null);
  const [adminStats, setAdminStats] = useState<Record<string, number>>({});
  const [adminStatus, setAdminStatus] = useState<
    "uploaded" | "partial" | "missing"
  >("missing");
  const [openMeta, setOpenMeta] = useState(false);

  const center: LatLngExpression = [12.8797, 121.774];

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
    const fetchAdminStats = async () => {
      const { data } = await supabase
        .from("admin_units")
        .select("level, pcode")
        .eq("country_iso", id);
      if (!data || data.length === 0) {
        setAdminStatus("missing");
        return;
      }
      const counts: Record<string, number> = {};
      data.forEach((row) => {
        counts[row.level] = (counts[row.level] || 0) + 1;
      });
      setAdminStats(counts);
      if (Object.keys(counts).length >= 3) setAdminStatus("uploaded");
      else setAdminStatus("partial");
    };
    fetchAdminStats();
  }, [id]);

  const datasets = [
    {
      key: "admins",
      title: "Places / Admin Units",
      description: "Administrative boundaries and place codes.",
      status: adminStatus,
      stats: Object.entries(adminStats)
        .map(([lvl, cnt]) => `${lvl}: ${cnt}`)
        .join(", "),
      icon: <Map className="w-6 h-6 text-green-600" />,
      href: `/country/${id}/admins`,
    },
    {
      key: "population",
      title: "Populations / Demographics",
      description: "Census population and demographic indicators.",
      status: "missing",
      stats: "",
      icon: <Users className="w-6 h-6 text-gray-500" />,
      href: `/country/${id}/population`,
    },
    {
      key: "gis",
      title: "GIS / Mapping",
      description: "Geospatial boundary data and mapping layers.",
      status: "partial",
      stats: "ADM1 & ADM2 uploaded, ADM3 missing",
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
      {/* everything else unchanged — map, metadata, dataset cards, modal */}
    </SidebarLayout>
  );
}

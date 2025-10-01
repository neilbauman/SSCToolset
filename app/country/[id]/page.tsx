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

export default function CountryConfigLandingPage({ params }: any) {
  const id = params?.id ?? "unknown";

  const [country, setCountry] = useState<any>(null);
  const [adminStats, setAdminStats] = useState<Record<string, number>>({});
  const [adminStatus, setAdminStatus] = useState<
    "uploaded" | "partial" | "missing"
  >("missing");
  const [openMeta, setOpenMeta] = useState(false);

  const center: LatLngExpression = [12.8797, 121.774];

  useEffect(() => {
    const fetchCountry = async () => {
      const { data, error } = await supabase
        .from("countries")
        .select("*")
        .eq("iso", id)
        .single();

      if (!error && data) {
        setCountry(data);
      }
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

      const levels = Object.keys(counts);
      if (levels.length >= 3) setAdminStatus("uploaded");
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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map */}
        <div className="lg:col-span-2 border rounded-lg p-4 shadow-sm">
          <h2 className="text-lg font-semibold mb-3">Map Overview</h2>
          <MapContainer
            center={center}
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
                <h3 className="text-md font-medium mb-2">Core Metadata</h3>
                <p><strong>ISO:</strong> {renderMetaValue(country.iso)}</p>
                <p><strong>Name:</strong> {renderMetaValue(country.name)}</p>
                <p><strong>ADM0 Label:</strong> {renderMetaValue(country.adm0_label)}</p>
                <p><strong>ADM1 Label:</strong> {renderMetaValue(country.adm1_label)}</p>
                <p><strong>ADM2 Label:</strong> {renderMetaValue(country.adm2_label)}</p>
                <p><strong>ADM3 Label:</strong> {renderMetaValue(country.adm3_label)}</p>
                <p><strong>ADM4 Label:</strong> {renderMetaValue(country.adm4_label)}</p>
                <p><strong>ADM5 Label:</strong> {renderMetaValue(country.adm5_label)}</p>

                <p className="mt-2 font-medium">Sources:</p>
                {country.dataset_sources && country.dataset_sources.length > 0 ? (
                  <ul className="list-disc pl-6 text-sm text-blue-700">
                    {country.dataset_sources.map((src: any, idx: number) => (
                      <li key={idx}>
                        <a
                          href={src.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:underline"
                        >
                          {src.name}
                        </a>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="italic text-gray-400">No sources provided</p>
                )}

                {/* Extra */}
                <h3 className="text-md font-medium mt-4 mb-2">Extra Metadata</h3>
                {country.extra_metadata &&
                  Object.entries(country.extra_metadata).map(([k, v]) => (
                    <p key={k}>
                      <strong>{k}:</strong> {String(v)}
                    </p>
                  ))}
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
    </SidebarLayout>
  );
}

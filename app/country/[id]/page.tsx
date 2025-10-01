"use client";

import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { Map, Users, Database, AlertCircle } from "lucide-react";
import { MapContainer, TileLayer } from "react-leaflet";
import { LatLngExpression } from "leaflet";
import "leaflet/dist/leaflet.css";
import Link from "next/link";
import { useState } from "react";

// Reusable soft button (branded colors)
function SoftButton({
  children,
  color = "gray",
  href,
}: {
  children: React.ReactNode;
  color?: "gray" | "green" | "blue" | "red";
  href?: string;
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
  return <button className={`${base} ${colors[color]}`}>{children}</button>;
}

export default function CountryConfigLandingPage({ params }: any) {
  const id = params?.id ?? "unknown";

  // Mock metadata (replace with Supabase later)
  const country = {
    iso: id,
    name: id === "PHL" ? "Philippines" : id === "NPL" ? "Nepal" : "Honduras",
    admLabels: { adm1: "Region", adm2: "Province", adm3: "Municipality" },
    sources: {
      boundaries: "HDX COD 2024",
      population: "Philippines 2020 Census",
    },
  };

  const center: LatLngExpression = [12.8797, 121.774]; // Philippines

  // Mock dataset status
  const datasets = [
    {
      key: "admins",
      title: "Places / Admin Units",
      description: "Administrative boundaries and place codes.",
      status: "uploaded",
      stats: "4 levels, 38 units",
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

  const [otherDatasets] = useState([
    {
      key: "housing",
      title: "Housing Conditions",
      description: "Shelter type, damage, and habitability data.",
      status: "uploaded",
      stats: "Census 2020 dataset",
    },
  ]);

  const headerProps = {
    title: `${country.name} – Country Configuration`,
    group: "country-config" as const,
    description: "Manage baseline datasets and metadata for this country.",
    breadcrumbs: (
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Country Configuration", href: "/country" },
          { label: country.name },
        ]}
      />
    ),
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "uploaded":
        return (
          <span className="px-2 py-1 text-xs rounded bg-green-100 text-green-700">
            ✅ Uploaded
          </span>
        );
      case "partial":
        return (
          <span className="px-2 py-1 text-xs rounded bg-yellow-100 text-yellow-700">
            ⚠️ Partial
          </span>
        );
      case "missing":
      default:
        return (
          <span className="px-2 py-1 text-xs rounded bg-red-100 text-red-700">
            ❌ Missing
          </span>
        );
    }
  };

  return (
    <SidebarLayout headerProps={headerProps}>
      {/* Map */}
      <div className="border rounded-lg p-4 shadow-sm mb-6">
        <h2 className="text-lg font-semibold mb-3">Map Overview</h2>
        <MapContainer
          center={center}
          zoom={5}
          style={{ height: "300px", width: "100%" }}
          className="rounded-md"
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="&copy; OpenStreetMap contributors"
          />
        </MapContainer>
      </div>

      {/* Metadata */}
      <div className="border rounded-lg p-4 shadow-sm mb-6">
        <h2 className="text-lg font-semibold mb-3">Country Metadata</h2>
        <p>
          <strong>ADM1:</strong> {country.admLabels.adm1}
        </p>
        <p>
          <strong>ADM2:</strong> {country.admLabels.adm2}
        </p>
        <p>
          <strong>ADM3:</strong> {country.admLabels.adm3}
        </p>
        <p>
          <strong>Boundaries Source:</strong> {country.sources.boundaries}
        </p>
        <p>
          <strong>Population Source:</strong> {country.sources.population}
        </p>
      </div>

      {/* Dataset cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {datasets.map((d) => (
          <div
            key={d.key}
            className="border rounded-lg p-5 shadow-sm hover:shadow-md transition"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                {d.icon}
                <h3 className="text-lg font-semibold">{d.title}</h3>
              </div>
              {statusBadge(d.status)}
            </div>
            <p className="text-sm text-gray-600 mb-2">{d.description}</p>
            {d.stats && (
              <p className="text-sm text-gray-500 mb-3">📊 {d.stats}</p>
            )}
            <div className="flex gap-2">
              <SoftButton color="gray">Download Template</SoftButton>
              <SoftButton color="green">Upload Data</SoftButton>
              <SoftButton color="blue" href={d.href}>
                View
              </SoftButton>
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
          {otherDatasets.length === 0 ? (
            <p className="italic text-gray-500">No extra datasets added yet.</p>
          ) : (
            <ul className="list-disc pl-6 text-sm text-gray-700 mb-4">
              {otherDatasets.map((ds) => (
                <li key={ds.key}>
                  <strong>{ds.title}</strong> – {ds.description} (
                  {statusBadge(ds.status)})
                </li>
              ))}
            </ul>
          )}
          <SoftButton color="gray">Add Dataset</SoftButton>
        </div>
      </div>
    </SidebarLayout>
  );
}

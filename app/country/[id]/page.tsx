"use client";

import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { Map, Users, Database, AlertCircle } from "lucide-react";
import dynamic from "next/dynamic";
import "leaflet/dist/leaflet.css";
import Link from "next/link";
import { useState, useEffect } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import EditMetadataModal from "@/components/country/EditMetadataModal";
import CountryMetadataCard from "@/components/country/CountryMetadataCard";
import ManageJoinsCard from "@/components/country/ManageJoinsCard";
import UploadAdminUnitsModal from "@/components/country/UploadAdminUnitsModal";
import UploadPopulationModal from "@/components/country/UploadPopulationModal";
import UploadGISModal from "@/components/country/UploadGISModal";
import ActiveJoinSummaryCard from "@/components/country/ActiveJoinSummaryCard";
import type { CountryParams } from "@/app/country/types";

// ✅ Dynamically import Leaflet (no SSR)
const MapContainer = dynamic(
  () => import("react-leaflet").then((m) => m.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import("react-leaflet").then((m) => m.TileLayer),
  { ssr: false }
);

// ✅ Safe reload function
function reloadPage() {
  if (typeof window !== "undefined") {
    window.location.reload();
  }
}

function StatusBadge({
  status,
}: {
  status: "uploaded" | "partial" | "missing" | "empty";
}) {
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

  const [activeJoin, setActiveJoin] = useState<any>(null);
  const [allJoins, setAllJoins] = useState<any[]>([]);

  const [openMeta, setOpenMeta] = useState(false);
  const [openAdminUpload, setOpenAdminUpload] = useState(false);
  const [openPopUpload, setOpenPopUpload] = useState(false);
  const [openGISUpload, setOpenGISUpload] = useState(false);

  // ✅ Fetch country metadata
  useEffect(() => {
    const fetchCountry = async () => {
      const { data, error } = await supabase
        .from("countries")
        .select("*")
        .eq("iso_code", id)
        .single();
      if (error) console.error("Country fetch failed:", error);
      if (data) setCountry(data);
    };
    fetchCountry();
  }, [id]);

  // ✅ Fetch dataset counts and statuses
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
        .select("crs")
        .eq("country_iso", id);

      setAdminCount(admins?.length || 0);
      setPopCount(pop?.length || 0);
      setGisCount(gis?.length || 0);
      setStatusData({ admins, pop, gis });
    };
    fetchStatuses();
  }, [id]);

  // ✅ Fetch joins
  useEffect(() => {
    const fetchJoins = async () => {
      const { data, error } = await supabase
        .from("dataset_joins")
        .select("*")
        .eq("country_iso", id);
      if (error) console.error("Join fetch failed:", error);
      if (data) {
        setAllJoins(data);
        const active = data.find((j: any) => j.is_active);
        setActiveJoin(active || null);
      }
    };
    fetchJoins();
  }, [id]);

  // ✅ Compute status safely
  const computeStatus = (key: string) => {
    if (!statusData) return "empty";
    if (key === "admins") {
      const admins = statusData.admins || [];
      if (admins.length === 0) return "missing";
      const levels = new Set(admins.map((a: any) => a.level));
      const required = ["ADM0", "ADM1", "ADM2"];
      const hasAll = required.every((lvl) => levels.has(lvl));
      return hasAll ? "uploaded" : "partial";
    }
    if (key === "population") {
      const pop = statusData.pop || [];
      if (pop.length === 0) return "missing";
      const invalid = pop.some(
        (p: any) => !p.pcode || !p.population || p.population <= 0
      );
      return invalid ? "partial" : "uploaded";
    }
    if (key === "gis") {
      const gis = statusData.gis || [];
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
      onUpload: () => setOpenAdminUpload(true),
      href: `/country/${id}/admins`,
    },
    {
      key: "population",
      title: "Populations / Demographics",
      description: "Census population and demographic indicators.",
      count: popCount,
      status: computeStatus("population"),
      icon: <Users className="w-6 h-6 text-gray-500" />,
      onUpload: () => setOpenPopUpload(true),
      href: `/country/${id}/population`,
    },
    {
      key: "gis",
      title: "GIS / Mapping",
      description: "Geospatial boundary data and mapping layers.",
      count: gisCount,
      status: computeStatus("gis"),
      icon: <Database className="w-6 h-6 text-yellow-600" />,
      onUpload: () => setOpenGISUpload(true),
      href: `/country/${id}/gis`,
    },
    {
      key: "other",
      title: "Other Datasets",
      description:
        "Additional country-specific datasets that extend the baseline.",
      count: 0,
      status: "empty" as const,
      icon: <AlertCircle className="w-6 h-6 text-blue-600" />,
      onUpload: undefined,
      href: "#",
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
      {/* Top row: Map + Metadata */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 border rounded-lg p-4 shadow-sm">
          <h2 className="text-lg font-semibold mb-3">Map Overview</h2>
          {/* ✅ Only render map client-side */}
          {typeof window !== "undefined" && (
            <MapContainer
              center={[12.8797, 121.774]}
              zoom={5}
              style={{ height: "400px", width: "100%" }}
              className="rounded-md z-0"
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org">OSM</a>'
              />
            </MapContainer>
          )}
        </div>
        <CountryMetadataCard
          country={country}
          onEdit={() => setOpenMeta(true)}
        />
      </div>

      <ActiveJoinSummaryCard
        countryIso={id}
        activeJoin={activeJoin}
        statusData={statusData}
      />

      {/* Dataset Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6 mt-6">
        {datasets.map((d) => {
          let activeInfo: string | null = null;
          if (activeJoin?.datasets) {
            const found = activeJoin.datasets.find((x: any) => x.type === d.key);
            if (found)
              activeInfo = `${found.title ?? d.key} ${
                found.year ? `(${found.year})` : ""
              }`;
          }
          return (
            <div
              key={d.key}
              className="border rounded-lg p-5 shadow-sm hover:shadow-md transition"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  {d.icon}
                  <Link href={d.href}>
                    <h3 className="text-lg font-semibold hover:underline">
                      {d.title}
                    </h3>
                  </Link>
                </div>
                <StatusBadge status={d.status} />
              </div>
              <p className="text-sm text-gray-600 mb-2">{d.description}</p>
              {d.count > 0 ? (
                <p className="text-sm text-gray-500 mb-1">📊 Total: {d.count}</p>
              ) : (
                <p className="italic text-gray-400 mb-1">
                  No data uploaded yet
                </p>
              )}
              <p className="text-xs text-gray-600 mb-3">
                <strong>Active Join:</strong> {activeInfo || "—"}
              </p>
              <div className="flex gap-2">
                <button className="px-2 py-1 text-sm border rounded">
                  Download Template
                </button>
                {d.onUpload && (
                  <button
                    onClick={d.onUpload}
                    className="px-2 py-1 text-sm bg-green-600 text-white rounded hover:opacity-90"
                  >
                    Upload Data
                  </button>
                )}
                <Link
                  href={d.href}
                  className="px-2 py-1 text-sm bg-blue-600 text-white rounded hover:opacity-90"
                >
                  View
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      {/* Manage Joins card */}
      <div className="mt-6">
        <ManageJoinsCard countryIso={id} joins={allJoins} />
      </div>

      {/* Modals */}
      <UploadAdminUnitsModal
        open={openAdminUpload}
        onClose={() => setOpenAdminUpload(false)}
        countryIso={id}
        onUploaded={reloadPage}
      />
      <UploadPopulationModal
        open={openPopUpload}
        onClose={() => setOpenPopUpload(false)}
        countryIso={id}
        onUploaded={reloadPage}
      />
      {openGISUpload && (
        <UploadGISModal
          open={openGISUpload}                    // ✅ added
          datasetVersionId={""}                   // ✅ placeholder
          countryIso={id}
          onClose={() => setOpenGISUpload(false)}
          onUploaded={reloadPage}
        />
      )}
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
              dataset_sources: updated.datasetSources,
              extra_metadata: updated.extra ?? {},
            });
          }}
        />
      )}
    </SidebarLayout>
  );
}

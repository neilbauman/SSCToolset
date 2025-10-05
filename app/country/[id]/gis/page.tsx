"use client";

import { useState, useEffect } from "react";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import UploadGISModal from "@/components/country/UploadGISModal";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { Layers, Upload, Check } from "lucide-react";
import type { CountryParams } from "@/app/country/types";
import dynamic from "next/dynamic";

// ✅ Import Leaflet dynamically (prevents SSR issues)
const MapContainer = dynamic(
  () => import("react-leaflet").then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import("react-leaflet").then((mod) => mod.TileLayer),
  { ssr: false }
);
const GeoJSON = dynamic(
  () => import("react-leaflet").then((mod) => mod.GeoJSON),
  { ssr: false }
);

type Country = {
  iso_code: string;
  name: string;
};

type GISDatasetVersion = {
  id: string;
  country_iso: string;
  title: string;
  source: string | null;
  year: number | null;
  dataset_date: string | null;
  is_active: boolean;
  created_at: string;
};

type GISLayer = {
  id: string;
  country_iso: string;
  layer_name: string;
  format: string;
  source: { path: string };
  dataset_version_id: string;
};

export default function GISPage({ params }: any) {
  const { id: countryIso } = params as CountryParams;
  const [country, setCountry] = useState<Country | null>(null);
  const [versions, setVersions] = useState<GISDatasetVersion[]>([]);
  const [activeLayer, setActiveLayer] = useState<GISLayer | null>(null);
  const [layersMap, setLayersMap] = useState<Record<string, number>>({});
  const [openUpload, setOpenUpload] = useState(false);
  const [geoData, setGeoData] = useState<any>(null);

  // ---- Load Country ----
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("countries")
        .select("iso_code, name")
        .eq("iso_code", countryIso)
        .single();
      if (data) setCountry(data);
    })();
  }, [countryIso]);

  // ---- Load Versions ----
  const fetchVersions = async () => {
    const { data, error } = await supabase
      .from("gis_dataset_versions")
      .select("*")
      .eq("country_iso", countryIso)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading GIS versions:", error);
      return;
    }

    const list = (data || []) as GISDatasetVersion[];
    setVersions(list);

    const active = list.find((v) => v.is_active);
    if (active) {
      await fetchActiveLayer(active.id);
    }
  };

  // ---- Load Active Layer ----
  const fetchActiveLayer = async (versionId: string) => {
    const { data, error } = await supabase
      .from("gis_layers")
      .select("*, source")
      .eq("dataset_version_id", versionId)
      .single();

    if (error) {
      console.error("Error loading active GIS layer:", error);
      return;
    }

    setActiveLayer(data);
  };

  // ---- Fetch GeoJSON file from Supabase ----
  useEffect(() => {
    const fetchGeoJSON = async () => {
      if (!activeLayer?.source?.path) return;
      const { data } = supabase.storage.from("gis").getPublicUrl(activeLayer.source.path);
      if (!data?.publicUrl) return;
      const res = await fetch(data.publicUrl);
      const geo = await res.json();
      setGeoData(geo);
    };
    fetchGeoJSON();
  }, [activeLayer]);

  // ---- Header ----
  const headerProps = {
    title: `${country?.name ?? countryIso} – GIS Layers`,
    group: "country-config" as const,
    description:
      "Manage and inspect uploaded GIS datasets (aligned to administrative boundaries).",
    breadcrumbs: (
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Country Configuration", href: "/country" },
          { label: country?.name ?? countryIso, href: `/country/${countryIso}` },
          { label: "GIS" },
        ]}
      />
    ),
  };

  useEffect(() => {
    fetchVersions();
  }, [countryIso]);

  return (
    <SidebarLayout headerProps={headerProps}>
      {/* Dataset Versions */}
      <div className="border rounded-lg p-4 shadow-sm mb-6">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Layers className="w-5 h-5 text-green-600" />
            GIS Dataset Versions
          </h2>
          <button
            onClick={() => setOpenUpload(true)}
            className="flex items-center text-sm text-white bg-[color:var(--gsc-red)] px-3 py-1 rounded hover:opacity-90"
          >
            <Upload className="w-4 h-4 mr-1" /> Upload Dataset
          </button>
        </div>

        {versions.length > 0 ? (
          <table className="w-full text-sm border">
            <thead className="bg-gray-100">
              <tr>
                <th className="border px-2 py-1 text-left">Title</th>
                <th className="border px-2 py-1 text-left">Source</th>
                <th className="border px-2 py-1 text-left">Created</th>
                <th className="border px-2 py-1 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {versions.map((v) => (
                <tr key={v.id} className="hover:bg-gray-50">
                  <td className="border px-2 py-1">{v.title}</td>
                  <td className="border px-2 py-1">{v.source || "—"}</td>
                  <td className="border px-2 py-1">
                    {new Date(v.created_at).toLocaleDateString()}
                  </td>
                  <td className="border px-2 py-1">
                    {v.is_active ? (
                      <span className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs bg-green-600 text-white">
                        <Check className="w-3 h-3" /> Active
                      </span>
                    ) : (
                      <span className="inline-block rounded px-2 py-0.5 text-xs bg-gray-200">
                        —
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="italic text-gray-500">No GIS versions uploaded yet.</p>
        )}
      </div>

      {/* 🗺️ Map Viewer */}
      <div className="border rounded-lg p-4 shadow-sm mb-6 h-[600px]">
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Layers className="w-5 h-5 text-blue-600" /> Active Map
        </h2>

        {geoData ? (
          <MapContainer
            center={[12.8797, 121.774]} // default to Philippines center
            zoom={6}
            className="w-full h-full rounded-lg z-0"
          >
            <TileLayer
              attribution='&copy; <a href="https://osm.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <GeoJSON
              data={geoData}
              style={{
                color: "#006400",
                weight: 1,
                fillColor: "#228B22",
                fillOpacity: 0.3,
              }}
            />
          </MapContainer>
        ) : (
          <p className="italic text-gray-500">No active map to display.</p>
        )}
      </div>

      {/* Upload Modal */}
      <UploadGISModal
        open={openUpload}
        onClose={() => setOpenUpload(false)}
        countryIso={countryIso}
        onUploaded={async () => {
          await fetchVersions();
        }}
      />
    </SidebarLayout>
  );
}

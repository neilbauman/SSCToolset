"use client";

import { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import SidebarLayout from "@/components/layout/SidebarLayout";
import UploadGISModal from "@/components/country/UploadGISModal";
import GISDataHealthPanel from "@/components/country/GISDataHealthPanel";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { Layers, Upload } from "lucide-react";
import type { CountryParams, GISLayer, GISDatasetVersion } from "@/types";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Lazy-load Leaflet components for SSR safety
const MapContainer = dynamic(
  () => import("react-leaflet").then((m) => m.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import("react-leaflet").then((m) => m.TileLayer),
  { ssr: false }
);
const GeoJSON = dynamic(
  () => import("react-leaflet").then((m) => m.GeoJSON),
  { ssr: false }
);

export default function GISPage({ params }: { params: CountryParams }) {
  const { id } = params;
  const [layers, setLayers] = useState<GISLayer[]>([]);
  const [versions, setVersions] = useState<GISDatasetVersion[]>([]);
  const [activeVersion, setActiveVersion] = useState<GISDatasetVersion | null>(
    null
  );
  const [showUploadModal, setShowUploadModal] = useState(false);
  const mapRef = useRef<L.Map | null>(null);

  // Fetch versions
  useEffect(() => {
    const fetchVersions = async () => {
      const { data, error } = await supabase
        .from("gis_dataset_versions")
        .select("*")
        .eq("country_iso", id)
        .order("created_at", { ascending: false });

      if (!error && data) {
        setVersions(data);
        const active = data.find((v) => v.is_active);
        setActiveVersion(active || null);
      }
    };
    fetchVersions();
  }, [id]);

  // Fetch active layers
  useEffect(() => {
    const fetchLayers = async () => {
      const { data, error } = await supabase
        .from("gis_layers")
        .select("*")
        .eq("country_iso", id)
        .eq("is_active", true);

      if (!error && data) setLayers(data);
    };
    fetchLayers();
  }, [id]);

  const headerProps = {
    title: `${id} – GIS Configuration`,
    group: "country-config" as const,
    description: "Manage and visualize GIS layers for this country.",
    breadcrumbs: (
      <Breadcrumbs
        items={[
          { label: "Countries", href: "/country" },
          { label: id, href: `/country/${id}` },
          { label: "GIS" },
        ]}
      />
    ),
  };

  return (
    <SidebarLayout headerProps={headerProps}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-lg font-semibold flex items-center gap-2">
            <Layers className="w-5 h-5 text-[color:var(--gsc-blue)]" />
            GIS Dataset Version
          </h1>
          <p className="text-sm text-gray-600">
            {activeVersion
              ? `${activeVersion.title} (${activeVersion.year || "n/a"})`
              : "No active version"}
          </p>
        </div>
        <button
          onClick={() => setShowUploadModal(true)}
          className="flex items-center gap-2 bg-[color:var(--gsc-red)] text-white px-3 py-2 rounded hover:opacity-90"
        >
          <Upload className="w-4 h-4" />
          Upload GIS
        </button>
      </div>

      {/* Data Health Summary */}
      <GISDataHealthPanel layers={layers} />

      {/* Table of Layers */}
      <div className="overflow-x-auto mb-4 border rounded-lg bg-white shadow-sm">
        <table className="min-w-full text-sm text-left">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 font-medium">Level</th>
              <th className="px-3 py-2 font-medium">Layer</th>
              <th className="px-3 py-2 font-medium">Features</th>
              <th className="px-3 py-2 font-medium">CRS</th>
              <th className="px-3 py-2 font-medium">Format</th>
            </tr>
          </thead>
          <tbody>
            {layers.map((l) => (
              <tr key={l.id} className="border-t hover:bg-gray-50">
                <td className="px-3 py-2">{l.admin_level}</td>
                <td className="px-3 py-2">{l.layer_name}</td>
                <td className="px-3 py-2">{l.feature_count || "—"}</td>
                <td className="px-3 py-2">{l.crs || "—"}</td>
                <td className="px-3 py-2">{l.format || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Map */}
      <div className="border rounded-lg overflow-hidden shadow-sm">
        <MapContainer
          center={[12.8797, 121.774]}
          zoom={5}
          style={{ height: "600px", width: "100%" }}
          whenReady={(mapEvent) => {
            mapRef.current = mapEvent.target;
          }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors'
          />
          {layers.map((layer) => (
            <GeoJSON
              key={layer.id}
              data={undefined as any} // placeholder until JSON is fetched from storage
              style={{
                color: "#C72B2B",
                weight: 1,
                fillOpacity: 0.2,
              }}
            />
          ))}
        </MapContainer>
      </div>

      {showUploadModal && (
        <UploadGISModal
          countryIso={id}
          onClose={() => setShowUploadModal(false)}
          onUploaded={async () => window.location.reload()}
        />
      )}
    </SidebarLayout>
  );
}

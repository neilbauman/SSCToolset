"use client";

import { useRef, useState, useEffect } from "react";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { Map, Upload, Layers } from "lucide-react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import dynamic from "next/dynamic";
import "leaflet/dist/leaflet.css";

import UploadGISModal from "@/components/country/UploadGISModal";
import GISDataHealthPanel from "@/components/country/GISDataHealthPanel";
import { useGeoJSONLayers } from "@/lib/hooks/useGeoJSONLayers";

import type { CountryParams, GISLayer } from "@/types";

// Leaflet components (dynamically loaded for SSR safety)
const MapContainer = dynamic(() => import("react-leaflet").then((m) => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import("react-leaflet").then((m) => m.TileLayer), { ssr: false });
const GeoJSON = dynamic(() => import("react-leaflet").then((m) => m.GeoJSON), { ssr: false });

export default function GISPage({ params }: { params: CountryParams }) {
  const { id } = params;
  const mapRef = useRef<L.Map | null>(null);

  const [layers, setLayers] = useState<GISLayer[]>([]);
  const [openUpload, setOpenUpload] = useState(false);
  const [loading, setLoading] = useState(true);

  // ✅ Fetch GIS layers from Supabase
  useEffect(() => {
    const fetchLayers = async () => {
      const { data, error } = await supabase
        .from("gis_layers")
        .select("*")
        .eq("country_iso", id)
        .eq("is_active", true)
        .order("admin_level_int", { ascending: true });

      if (error) console.error("Error fetching GIS layers:", error);
      else if (data) setLayers(data as GISLayer[]);
      setLoading(false);
    };

    fetchLayers();
  }, [id]);

  // ✅ Load layers onto the map
  const { geoJsonLayers } = useGeoJSONLayers(supabase, layers, mapRef);

  const headerProps = {
    title: `${id.toUpperCase()} – GIS Layers`,
    group: "country-config" as const, // ✅ Consistent group type
    description: "Manage and visualize GIS boundary datasets for this country.",
    breadcrumbs: (
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Country Configuration", href: "/country" },
          { label: id.toUpperCase(), href: `/country/${id}` },
          { label: "GIS Layers" },
        ]}
      />
    ),
  };

  return (
    <SidebarLayout headerProps={headerProps}>
      {/* Toolbar */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-[color:var(--gsc-blue)] flex items-center gap-2">
          <Layers className="w-5 h-5 text-[color:var(--gsc-red)]" />
          GIS Layers
        </h2>
        <button
          onClick={() => setOpenUpload(true)}
          className="flex items-center gap-2 px-3 py-1.5 text-sm bg-[color:var(--gsc-red)] text-white rounded hover:opacity-90 transition"
        >
          <Upload className="w-4 h-4" />
          Upload New Layer
        </button>
      </div>

      {/* Health summary */}
      <GISDataHealthPanel layers={layers} />

      {/* Map Visualization */}
      <div className="border rounded-lg shadow-sm overflow-hidden mb-6">
        <MapContainer
          center={[12.8797, 121.774]}
          zoom={5}
          style={{ height: "600px", width: "100%" }}
          whenReady={(event) => {
            mapRef.current = event.target;
          }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="&copy; OpenStreetMap contributors"
          />

          {/* Render valid GeoJSON layers */}
          {geoJsonLayers.map((layer, idx) => (
            <GeoJSON
              key={layer.id ?? idx}
              data={layer.data}
              style={{
                color: "#C72B2B",
                weight: 1,
                opacity: 0.8,
              }}
              onEachFeature={(feature, leafletLayer) => {
                leafletLayer.bindPopup(
                  `<strong>${layer.layer_name}</strong><br/>Features: ${layer.feature_count ?? "?"}`
                );
              }}
            />
          ))}
        </MapContainer>
      </div>

      {/* Layers table */}
      <div className="overflow-x-auto mb-4 border rounded-lg bg-white shadow-sm">
        <table className="min-w-full text-sm text-left">
          <thead className="bg-gray-50 text-gray-700 uppercase text-xs border-b">
            <tr>
              <th className="px-3 py-2">Layer Name</th>
              <th className="px-3 py-2">Admin Level</th>
              <th className="px-3 py-2">Format</th>
              <th className="px-3 py-2">CRS</th>
              <th className="px-3 py-2 text-right">Features</th>
            </tr>
          </thead>
          <tbody>
            {layers.map((l) => (
              <tr key={l.id} className="border-t hover:bg-gray-50">
                <td className="px-3 py-2">{l.layer_name}</td>
                <td className="px-3 py-2">{l.admin_level || "—"}</td>
                <td className="px-3 py-2">{l.format || "—"}</td>
                <td className="px-3 py-2">{l.crs || "—"}</td>
                <td className="px-3 py-2 text-right">{l.feature_count ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Upload modal */}
      <UploadGISModal
        open={openUpload}
        onClose={() => setOpenUpload(false)}
        countryIso={id}
        onUploaded={async () => window.location.reload()}
      />
    </SidebarLayout>
  );
}

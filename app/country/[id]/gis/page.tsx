"use client";

import { useState, useEffect, useRef } from "react";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { Layers, Upload } from "lucide-react";
import dynamic from "next/dynamic";
import "leaflet/dist/leaflet.css";
import { GISDataHealthPanel } from "@/components/country/GISDataHealthPanel";
import UploadGISModal from "@/components/country/UploadGISModal";
import type { CountryParams, GISLayer, GISDatasetVersion } from "@/types";
import { useGeoJSONLayers } from "@/lib/hooks/useGeoJSONLayers";

// Safe dynamic Leaflet components
const MapContainer = dynamic(() => import("react-leaflet").then(m => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import("react-leaflet").then(m => m.TileLayer), { ssr: false });
const GeoJSON = dynamic(() => import("react-leaflet").then(m => m.GeoJSON), { ssr: false });

export default function GISPage({ params }: { params: CountryParams }) {
  const { id: countryIso } = params;
  const [versions, setVersions] = useState<GISDatasetVersion[]>([]);
  const [activeVersion, setActiveVersion] = useState<GISDatasetVersion | null>(null);
  const [layers, setLayers] = useState<GISLayer[]>([]);
  const [openUpload, setOpenUpload] = useState(false);
  const mapRef = useRef<L.Map | null>(null);

  // Load dataset versions
  useEffect(() => {
    const loadVersions = async () => {
      const { data, error } = await supabase
        .from("gis_dataset_versions")
        .select("*")
        .eq("country_iso", countryIso)
        .order("created_at", { ascending: false });
      if (error) console.error(error);
      setVersions(data || []);
      const active = data?.find(v => v.is_active) || null;
      setActiveVersion(active);
    };
    loadVersions();
  }, [countryIso]);

  // Load active GIS layers
  useEffect(() => {
    const loadLayers = async () => {
      const { data, error } = await supabase
        .from("gis_layers")
        .select("*")
        .eq("country_iso", countryIso)
        .eq("is_active", true)
        .order("admin_level_int", { ascending: true });
      if (error) console.error(error);
      setLayers(data || []);
    };
    loadLayers();
  }, [countryIso]);

  // Load GeoJSONs for visible layers
  const { geoJsonLayers } = useGeoJSONLayers({ supabase, layers, mapRef });

  return (
    <SidebarLayout
      headerProps={{
        title: "GIS Datasets",
        group: "country-config",
        description: "Manage and visualize GIS layers for the selected country.",
        breadcrumbs: (
          <Breadcrumbs
            items={[
              { label: "Countries", href: "/country" },
              { label: countryIso.toUpperCase(), href: `/country/${countryIso}` },
              { label: "GIS" },
            ]}
          />
        ),
      }}
    >
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div className="border rounded-lg p-4 bg-white shadow-sm">
          <p className="text-xs text-gray-500 uppercase font-semibold">Dataset Version</p>
          <div className="flex items-center justify-between">
            <p className="font-medium">
              {activeVersion ? activeVersion.title : "No active version"}
            </p>
            <button
              onClick={() => setOpenUpload(true)}
              className="flex items-center gap-1 text-white text-sm px-3 py-1 rounded-md"
              style={{ backgroundColor: "var(--gsc-red)" }}
            >
              <Upload className="w-4 h-4" /> Upload GIS
            </button>
          </div>
        </div>

        <div className="border rounded-lg p-4 bg-white shadow-sm">
          <p className="text-xs text-gray-500 uppercase font-semibold">Active Layers</p>
          <p className="font-medium">{layers.length}</p>
          <p className="text-xs text-gray-500">ADM0–ADM5 supported</p>
        </div>

        <div className="border rounded-lg p-4 bg-white shadow-sm">
          <p className="text-xs text-gray-500 uppercase font-semibold">Country</p>
          <p className="font-medium">{countryIso}</p>
          <p className="text-xs text-gray-500">SSC GIS</p>
        </div>
      </div>

      {/* Data Health Summary */}
      <GISDataHealthPanel layers={layers} />

      {/* Layers Table */}
      <div className="overflow-x-auto mb-4 border rounded-lg bg-white shadow-sm">
        <table className="min-w-full text-sm text-left">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="p-2 font-medium">Level</th>
              <th className="p-2 font-medium">Layer</th>
              <th className="p-2 font-medium">Features</th>
              <th className="p-2 font-medium">CRS</th>
              <th className="p-2 font-medium">Format</th>
            </tr>
          </thead>
          <tbody>
            {layers.map(layer => (
              <tr key={layer.id} className="border-t">
                <td className="p-2">{layer.admin_level}</td>
                <td className="p-2">{layer.layer_name}</td>
                <td className="p-2">{layer.feature_count || "—"}</td>
                <td className="p-2">{layer.crs || "—"}</td>
                <td className="p-2">{layer.format}</td>
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
          whenReady={(event) => {
            mapRef.current = event.target;
          }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="&copy; OpenStreetMap contributors"
          />
          {geoJsonLayers}
        </MapContainer>
      </div>

      {/* Upload Modal */}
      {openUpload && (
        <UploadGISModal
          countryIso={countryIso}
          onClose={() => setOpenUpload(false)}
          onUploaded={() => window.location.reload()}
        />
      )}
    </SidebarLayout>
  );
}

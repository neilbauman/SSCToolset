"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { MapContainer, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { Layers, Upload } from "lucide-react";
import useGeoJSONLayers from "@/lib/hooks/useGeoJSONLayers";
import GISDataHealthPanel from "@/components/country/GISDataHealthPanel";
import UploadGISModal from "@/components/country/UploadGISModal";
import type { CountryParams } from "@/app/country/types";

export default function GISPage({ params }: { params: CountryParams }) {
  const countryIso = String(params.id);
  const mapRef = useRef<L.Map | null>(null);
  const [layers, setLayers] = useState<any[]>([]);
  const [openUpload, setOpenUpload] = useState(false);

  // ✅ Fetch GIS layers
  const fetchLayers = useCallback(async () => {
    const { data, error } = await supabase
      .from("gis_layers")
      .select("*")
      .eq("country_iso", countryIso)
      .eq("is_active", true);
    if (!error && data) setLayers(data);
  }, [countryIso]);

  useEffect(() => {
    fetchLayers();
  }, [fetchLayers]);

  // ✅ Hook for rendering layers
  const { geoJsonLayers } = useGeoJSONLayers({
    supabase,
    layers,
    mapRef,
  });

  // ✅ Header configuration
  const headerProps = {
    title: `${countryIso.toUpperCase()} – GIS Layers`,
    group: "country-config" as const, // ✅ fixed key
    description: "Manage and visualize geospatial boundary datasets.",
    breadcrumbs: (
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Country Config", href: "/country" },
          { label: countryIso.toUpperCase() },
          { label: "GIS" },
        ]}
      />
    ),
  };

  return (
    <SidebarLayout headerProps={headerProps}>
      {/* --- Top actions --- */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-[color:var(--gsc-blue)] flex items-center gap-2">
          <Layers className="w-5 h-5" /> GIS Layers
        </h2>
        <button
          onClick={() => setOpenUpload(true)}
          className="flex items-center gap-2 bg-[color:var(--gsc-red)] text-white px-3 py-1.5 rounded hover:opacity-90 text-sm"
        >
          <Upload className="w-4 h-4" /> Upload GIS Layer
        </button>
      </div>

      {/* --- Data health panel --- */}
      <GISDataHealthPanel layers={layers} />

      {/* --- Map container --- */}
      <div className="border rounded-lg overflow-hidden shadow-sm">
        <MapContainer
          center={[12.8797, 121.774]}
          zoom={5}
          style={{ height: "600px", width: "100%" }}
          whenCreated={(mapInstance) => {
            mapRef.current = mapInstance;
          }}
          className="rounded-md z-0"
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="&copy; OpenStreetMap contributors"
          />
          {geoJsonLayers}
        </MapContainer>
      </div>

      {/* --- Upload modal --- */}
      <UploadGISModal
        open={openUpload}
        onClose={() => setOpenUpload(false)}
        countryIso={countryIso}
        onUploaded={fetchLayers}
      />
    </SidebarLayout>
  );
}

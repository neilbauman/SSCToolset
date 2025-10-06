"use client";

import { useRef, useState, useEffect } from "react";
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
  const { id } = params;
  const mapRef = useRef<L.Map | null>(null);
  const [layers, setLayers] = useState<any[]>([]);
  const [openUpload, setOpenUpload] = useState(false);

  // ✅ Fetch GIS layers
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

  // ✅ Hook for rendering layers
  const { geoJsonLayers } = useGeoJSONLayers({
    supabase,
    layers,
    mapRef,
  });

  const headerProps = {
    title: `${id.toUpperCase()} – GIS Layers`,
    group: "country-config" as const,
    description: "Manage and visualize geospatial boundary datasets.",
    breadcrumbs: (
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Country Config", href: "/country" },
          { label: id.toUpperCase() },
          { label: "GIS" },
        ]}
      />
    ),
  };

  return (
    <SidebarLayout headerProps={headerProps}>
      {/* Top actions */}
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

      {/* Data health */}
      <GISDataHealthPanel layers={layers} />

      {/* Map container */}
      <MapContainer
        center={[12.8797, 121.774]}
        zoom={5}
        style={{ height: "600px", width: "100%" }}
        ref={mapRef as any} // ✅ direct ref instead of whenReady
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; OpenStreetMap contributors"
        />
        {geoJsonLayers}
      </MapContainer>

      {/* Upload modal */}
      {openUpload && (
        <UploadGISModal
          open={openUpload}
          onClose={() => setOpenUpload(false)}
          countryIso={id}
          onUploaded={() => window.location.reload()}
        />
      )}
    </SidebarLayout>
  );
}

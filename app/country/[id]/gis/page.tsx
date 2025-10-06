"use client";

import { useState, useEffect, useRef } from "react";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { MapContainer, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { Upload } from "lucide-react";
import UploadGISModal from "@/components/country/UploadGISModal";
import GISDataHealthPanel from "@/components/country/GISDataHealthPanel";
import type { GISLayer, CountryParams } from "@/types";

interface PageProps {
  params: Promise<CountryParams> | CountryParams;
}

export default function GISPage({ params }: PageProps) {
  const { id } = params as CountryParams;
  const [layers, setLayers] = useState<GISLayer[]>([]);
  const [openUpload, setOpenUpload] = useState(false);
  const mapRef = useRef<L.Map | null>(null);

  // ✅ Fetch GIS layers
  useEffect(() => {
    const loadLayers = async () => {
      const { data, error } = await supabase
        .from("gis_layers")
        .select("*")
        .eq("country_iso", id)
        .eq("is_active", true)
        .order("admin_level_int", { ascending: true });

      if (!error && data) setLayers(data);
      else console.error("Error fetching GIS layers:", error);
    };
    loadLayers();
  }, [id]);

  const headerProps = {
    title: "GIS Datasets",
    group: "country-config" as const,
    description: "Visualize and manage GIS layers for the selected country.",
    breadcrumbs: (
      <Breadcrumbs
        items={[
          { label: "Country Configuration", href: "/country" },
          { label: id, href: `/country/${id}` },
          { label: "GIS" },
        ]}
      />
    ),
  };

  return (
    <SidebarLayout headerProps={headerProps}>
      {/* Upload button */}
      <div className="flex justify-end mb-4">
        <button
          onClick={() => setOpenUpload(true)}
          className="flex items-center gap-2 bg-[color:var(--gsc-red)] text-white px-4 py-2 rounded shadow-sm hover:opacity-90 transition"
        >
          <Upload className="w-4 h-4" />
          Upload GIS
        </button>
      </div>

      {/* GIS health summary */}
      <GISDataHealthPanel layers={layers} />

      {/* Map section */}
      <div className="border rounded-lg shadow-sm overflow-hidden">
        <MapContainer
          center={[12.8797, 121.774]}
          zoom={5}
          style={{ height: "600px", width: "100%" }}
          whenReady={(mapEvent: any) => {
            mapRef.current = mapEvent.target;
          }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="&copy; OpenStreetMap contributors"
          />
        </MapContainer>
      </div>

      {/* Upload modal */}
      {openUpload && (
        <UploadGISModal
          countryIso={id}
          onClose={() => setOpenUpload(false)}
          onUploaded={async () => {
            window.location.reload();
          }}
        />
      )}
    </SidebarLayout>
  );
}

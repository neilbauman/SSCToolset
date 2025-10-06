"use client";

import { useEffect, useState, useRef } from "react";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import UploadGISModal from "@/components/country/UploadGISModal";
import GISDataHealthPanel from "@/components/country/GISDataHealthPanel";
import type { CountryParams, GISLayer } from "@/types";
import dynamic from "next/dynamic";
import "leaflet/dist/leaflet.css";

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

const GSC_RED = "#630710";
const GSC_BLUE = "#004b87";

export default function GISPage({ params }: { params: CountryParams }) {
  const { id } = params;
  const [layers, setLayers] = useState<GISLayer[]>([]);
  const [geojsonData, setGeojsonData] = useState<Record<string, any>>({});
  const [openUpload, setOpenUpload] = useState(false);
  const mapRef = useRef<any>(null);

  // Fetch active GIS layers
  useEffect(() => {
    const fetchLayers = async () => {
      const { data, error } = await supabase
        .from("gis_layers")
        .select("*")
        .eq("country_iso", id)
        .eq("is_active", true);

      if (!error && data) {
        setLayers(data);
      } else {
        console.error("Error loading GIS layers:", error);
      }
    };
    fetchLayers();
  }, [id]);

  // Fetch GeoJSON for each layer
  useEffect(() => {
    const fetchGeoJSONs = async () => {
      for (const layer of layers) {
        if (!layer.source?.path) continue;

        const url = `https://ergsggprgtlsrrsmwtkf.supabase.co/storage/v1/object/public/gis_raw/${layer.source.path}`;
        try {
          const res = await fetch(url);
          if (!res.ok) throw new Error(`Fetch failed for ${layer.layer_name}`);
          const json = await res.json();

          // Validate minimal GeoJSON structure
          if (json.type && json.features) {
            setGeojsonData((prev) => ({ ...prev, [layer.id]: json }));
          } else {
            console.warn("Invalid GeoJSON structure:", layer.layer_name);
          }
        } catch (err) {
          console.error("Error parsing GeoJSON:", layer.layer_name, err);
        }
      }
    };

    if (layers.length) fetchGeoJSONs();
  }, [layers]);

  const headerProps = {
    title: `GIS Layers – ${id}`,
    group: "gis-config",
    description: "Manage and visualize GIS boundary datasets for this country.",
    breadcrumbs: (
      <Breadcrumbs
        items={[
          { label: "Countries", href: "/country" },
          { label: id.toUpperCase(), href: `/country/${id}` },
          { label: "GIS" },
        ]}
      />
    ),
  };

  return (
    <SidebarLayout headerProps={headerProps}>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-[color:var(--gsc-blue)]">
          GIS Layers
        </h2>
        <button
          onClick={() => setOpenUpload(true)}
          className="px-3 py-2 rounded-md text-sm text-white"
          style={{ backgroundColor: GSC_RED }}
        >
          Upload GIS
        </button>
      </div>

      {/* Data health summary */}
      <GISDataHealthPanel layers={layers} />

      {/* Map */}
      <div className="rounded-lg overflow-hidden border shadow-sm">
        <MapContainer
          center={[12.8797, 121.774]}
          zoom={5}
          style={{ height: "600px", width: "100%" }}
          whenReady={(e) => {
            mapRef.current = e.target;
          }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="© OpenStreetMap contributors"
          />
          {layers.map(
            (l) =>
              geojsonData[l.id] && (
                <GeoJSON
                  key={l.id}
                  data={geojsonData[l.id]}
                  style={{
                    color: GSC_RED,
                    weight: 1,
                    fillOpacity: 0.2,
                  }}
                />
              )
          )}
        </MapContainer>
      </div>

      {/* Upload modal */}
      {openUpload && (
        <UploadGISModal
          onClose={() => setOpenUpload(false)}
          countryIso={id}
          onUploaded={() => window.location.reload()}
        />
      )}
    </SidebarLayout>
  );
}

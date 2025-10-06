"use client";

import React, { useState, useRef } from "react";
import dynamic from "next/dynamic";
import { useParams } from "next/navigation";
import Sidebar from "@/components/ui/Sidebar";
import PageHeader from "@/components/ui/PageHeader";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { Button } from "@/components/ui/Button";
import { Plus } from "lucide-react";

// ✅ Lazy-load Leaflet (for Next.js 15)
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

export default function GISPage() {
  const { id } = useParams();
  const mapRef = useRef<L.Map | null>(null);

  // Layer toggles (ADM0–ADM5)
  const [layers, setLayers] = useState({
    ADM0: false,
    ADM1: false,
    ADM2: false,
    ADM3: false,
    ADM4: false,
    ADM5: false,
  });

  // Handle toggle click
  const toggleLayer = (layer: keyof typeof layers) => {
    setLayers((prev) => ({ ...prev, [layer]: !prev[layer] }));
  };

  // Placeholder GeoJSON (future: load from Supabase or /api)
  const dummyGeoJson = {
    type: "FeatureCollection",
    features: [],
  };

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-gray-50 overflow-y-auto">
        <Sidebar />
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        <PageHeader
          title={`GIS Layers for ${Array.isArray(id) ? id[0] : id?.toUpperCase()}`}
          group="country-config"
          description="Manage and visualize uploaded administrative boundary layers."
          breadcrumbs={
            <Breadcrumbs
              items={[
                { label: "Home", href: "/" },
                { label: "Country Configuration", href: "/country" },
                {
                  label: `${Array.isArray(id) ? id[0].toUpperCase() : id?.toUpperCase()}`,
                  href: `/country/${id}`,
                },
                { label: "GIS Layers" },
              ]}
            />
          }
        />

        <div className="flex-1 flex flex-row p-4 gap-4">
          {/* Layer Control Panel */}
          <div className="w-72 border rounded-lg bg-white shadow-sm p-4">
            <h3 className="font-semibold text-gray-800 mb-3">
              Layers (toggle to show)
            </h3>
            <div className="space-y-2">
              {Object.keys(layers).map((layer) => (
                <label
                  key={layer}
                  className="flex items-center justify-between text-sm"
                >
                  <span>{layer}</span>
                  <input
                    type="checkbox"
                    checked={layers[layer as keyof typeof layers]}
                    onChange={() => toggleLayer(layer as keyof typeof layers)}
                  />
                </label>
              ))}
            </div>

            <hr className="my-4" />
            <Button className="w-full flex items-center justify-center gap-2">
              <Plus className="w-4 h-4" />
              Upload GIS Dataset
            </Button>
          </div>

          {/* Map Display */}
          <div className="flex-1 border rounded-lg overflow-hidden">
            <MapContainer
              center={[12.8797, 121.774]}
              zoom={6}
              style={{ height: "100%", width: "100%" }}
              whenReady={(event) => {
                mapRef.current = event.target;
              }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {/* Render toggled layers */}
              {Object.entries(layers).map(([key, active]) =>
                active ? (
                  <GeoJSON
                    key={key}
                    data={dummyGeoJson}
                    style={{
                      color: "#630710",
                      weight: 1,
                      fillOpacity: 0.05,
                    }}
                  />
                ) : null
              )}
            </MapContainer>
          </div>
        </div>
      </main>
    </div>
  );
}

"use client";

import React, { useState, useRef } from "react";
import dynamic from "next/dynamic";
import { useParams } from "next/navigation";
import Sidebar from "@/components/ui/Sidebar";
import PageHeader from "@/components/ui/PageHeader";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { Button } from "@/components/ui/Button";
import { Plus } from "lucide-react";
import type { FeatureCollection, Geometry } from "geojson";

// ✅ Dynamically import Leaflet parts (Next.js 15 compatible)
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

export default function GISPage() {
  const { id } = useParams();
  const mapRef = useRef<L.Map | null>(null);

  const [layers, setLayers] = useState({
    ADM0: false,
    ADM1: false,
    ADM2: false,
    ADM3: false,
    ADM4: false,
    ADM5: false,
  });

  const toggleLayer = (layer: keyof typeof layers) =>
    setLayers((prev) => ({ ...prev, [layer]: !prev[layer] }));

  // ✅ Type-safe empty GeoJSON (no more TS errors)
  const dummyGeoJson: FeatureCollection<Geometry> = {
    type: "FeatureCollection",
    features: [],
  };

  const countryCode =
    typeof id === "string" ? id.toUpperCase() : Array.isArray(id) ? id[0].toUpperCase() : "N/A";

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-gray-50 overflow-y-auto">
        <Sidebar />
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col">
        <PageHeader
          title={`GIS Layers for ${countryCode}`}
          group="country-config"
          description="Manage and visualize uploaded administrative boundary layers."
          breadcrumbs={
            <Breadcrumbs
              items={[
                { label: "Home", href: "/" },
                { label: "Country Configuration", href: "/country" },
                { label: countryCode, href: `/country/${id}` },
                { label: "GIS Layers" },
              ]}
            />
          }
        />

        <div className="flex-1 flex flex-row p-4 gap-4">
          {/* Left Controls */}
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

          {/* Map */}
          <div className="flex-1 border rounded-lg overflow-hidden">
            <MapContainer
              center={[12.8797, 121.774]}
              zoom={6}
              style={{ height: "100%", width: "100%" }}
              ref={mapRef}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
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

"use client";

import { useState, useRef } from "react";
import dynamic from "next/dynamic";
import PageHeader from "@/components/layout/PageHeader";
import Sidebar from "@/components/layout/Sidebar";
import Breadcrumbs from "@/components/layout/Breadcrumbs";
import { Button } from "@/components/ui/Button";

// Leaflet dynamic import (prevents SSR issues)
const MapContainer = dynamic(() => import("react-leaflet").then((mod) => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import("react-leaflet").then((mod) => mod.TileLayer), { ssr: false });
const GeoJSON = dynamic(() => import("react-leaflet").then((mod) => mod.GeoJSON), { ssr: false });

export default function GISPage({ params }: { params: { id: string } }) {
  const countryIso = params.id?.toUpperCase() || "UNK";
  const [activeLayers, setActiveLayers] = useState<string[]>([]);
  const mapRef = useRef<any>(null);

  const handleToggle = (layer: string) => {
    setActiveLayers((prev) =>
      prev.includes(layer) ? prev.filter((l) => l !== layer) : [...prev, layer]
    );
  };

  // Placeholder minimal GeoJSON for safe rendering (no remote fetch)
  const placeholderGeoJSON = {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [121.0, 14.0],
              [122.0, 14.0],
              [122.0, 15.0],
              [121.0, 15.0],
              [121.0, 14.0],
            ],
          ],
        },
        properties: { name: "Example Layer" },
      },
    ],
  };

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-white">
        <Sidebar />
      </aside>

      {/* Main content area */}
      <main className="flex-1 flex flex-col">
        <PageHeader
          title={`GIS Layers for ${countryIso}`}
          group="country-config"
          description="Manage and visualize uploaded administrative boundary layers."
          breadcrumbs={
            <Breadcrumbs
              items={[
                { label: "Countries", href: "/country" },
                { label: countryIso, href: `/country/${countryIso.toLowerCase()}` },
                { label: "GIS Layers" },
              ]}
            />
          }
        />

        <div className="flex flex-1 gap-4 px-6 pb-6">
          {/* Left panel */}
          <div className="w-80 border rounded-lg bg-white p-4 flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-semibold mb-2">Layers (toggle to show)</h3>
              {["ADM0", "ADM1", "ADM2", "ADM3", "ADM4", "ADM5"].map((adm) => (
                <label key={adm} className="flex items-center gap-2 text-sm mb-1">
                  <input
                    type="checkbox"
                    checked={activeLayers.includes(adm)}
                    onChange={() => handleToggle(adm)}
                  />
                  {adm}
                </label>
              ))}

              <div className="mt-4">
                <h4 className="text-sm font-semibold">Available Datasets</h4>
                <p className="text-xs text-gray-600 mt-1">
                  {countryIso} (2023) <span className="text-green-600 font-semibold">● Active</span>
                </p>
              </div>
            </div>

            <Button className="bg-red-600 hover:bg-red-700 text-white w-full mt-4">
              Upload GIS Dataset
            </Button>
          </div>

          {/* Map section */}
          <div className="flex-1 border rounded-lg overflow-hidden">
            <MapContainer
              center={[12.8797, 121.774]} // Center on the Philippines by default
              zoom={6}
              style={{ height: "100%", width: "100%" }}
              whenReady={() => {
                // Safe type callback (no arguments)
                if (mapRef.current) return;
              }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {/* Show placeholder GeoJSON when any layer is active */}
              {activeLayers.length > 0 && (
                <GeoJSON
                  key={activeLayers.join("-")}
                  data={placeholderGeoJSON as any}
                  style={() => ({
                    color: "#2b6cb0",
                    weight: 1.2,
                    fillOpacity: 0.1,
                  })}
                />
              )}
            </MapContainer>
          </div>
        </div>
      </main>
    </div>
  );
}

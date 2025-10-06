"use client";

import { useState, useRef } from "react";
import { useParams } from "next/navigation";
import dynamic from "next/dynamic";
import Sidebar from "@/components/layout/Sidebar";
import PageHeader from "@/components/layout/PageHeader";
import Breadcrumbs from "@/components/layout/Breadcrumbs";

// Leaflet must be loaded dynamically (Next.js SSR-safe)
const MapContainer = dynamic(
  () => import("react-leaflet").then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import("react-leaflet").then((mod) => mod.TileLayer),
  { ssr: false }
);

export default function GISPage() {
  const { id } = useParams();
  const mapRef = useRef<any>(null);

  // Layer toggle state for ADM levels
  const [layers, setLayers] = useState({
    adm0: false,
    adm1: false,
    adm2: false,
    adm3: false,
    adm4: false,
    adm5: false,
  });

  const toggleLayer = (key: keyof typeof layers) =>
    setLayers((prev) => ({ ...prev, [key]: !prev[key] }));

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-gray-50">
        <Sidebar />
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <PageHeader
          title={`GIS Layers for ${Array.isArray(id) ? id[0].toUpperCase() : id?.toUpperCase()}`}
          group="country-config"
          description="Manage and visualize uploaded administrative boundary layers."
          breadcrumbs={
            <Breadcrumbs
              items={[
                { label: "Country Configuration", href: "/country" },
                { label: `${Array.isArray(id) ? id[0].toUpperCase() : id?.toUpperCase()}` },
                { label: "GIS Layers" },
              ]}
            />
          }
        />

        {/* Layout: Left Panel (Layer Toggles) + Map */}
        <div className="flex flex-1 overflow-hidden">
          {/* Layer Controls */}
          <div className="w-64 border-r p-4 bg-white overflow-y-auto">
            <h3 className="font-semibold text-gray-700 mb-3">Layer Visibility</h3>
            <div className="space-y-2">
              {Object.entries(layers).map(([key, value]) => (
                <label
                  key={key}
                  className="flex items-center justify-between text-sm cursor-pointer"
                >
                  <span className="capitalize">{key.toUpperCase()}</span>
                  <input
                    type="checkbox"
                    checked={value}
                    onChange={() => toggleLayer(key as keyof typeof layers)}
                  />
                </label>
              ))}
            </div>
          </div>

          {/* Map Section */}
          <div className="flex-1 relative bg-gray-100">
            <MapContainer
              center={[12.8797, 121.774]}
              zoom={6}
              style={{ height: "100%", width: "100%" }}
              whenReady={(event) => {
                mapRef.current = event.target; // ✅ fixed type-safe handler
              }}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors'
              />
              {/* Future: Add vector layers for ADM0–ADM5 here */}
            </MapContainer>
          </div>
        </div>
      </main>
    </div>
  );
}

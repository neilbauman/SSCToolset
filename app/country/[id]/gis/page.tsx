"use client";

import { useState, useRef } from "react";
import dynamic from "next/dynamic";
import { useParams } from "next/navigation";
import PageHeader from "@/components/ui/PageHeader";
import Sidebar from "@/components/ui/Sidebar";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { Button } from "@/components/ui/Button";

// ✅ Lazy-load React Leaflet to avoid SSR issues
const MapContainer = dynamic(
  () => import("react-leaflet").then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import("react-leaflet").then((mod) => mod.TileLayer),
  { ssr: false }
);

export default function GISPage() {
  const params = useParams();
  const idParam = params?.id;
  const id = Array.isArray(idParam) ? idParam[0] : idParam;

  const mapRef = useRef<L.Map | null>(null);
  const [layers, setLayers] = useState<Record<string, boolean>>({
    ADM0: false,
    ADM1: false,
    ADM2: false,
    ADM3: false,
    ADM4: false,
    ADM5: false,
  });

  const handleToggle = (key: string) =>
    setLayers((prev) => ({ ...prev, [key]: !prev[key] }));

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-white">
        <Sidebar />
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        <PageHeader
          title={`GIS Layers for ${id?.toUpperCase() || "Country"}`}
          group="country-config"
          description="Manage and visualize uploaded administrative boundary layers."
          breadcrumbs={
            <Breadcrumbs
              items={[
                { label: "Country Configurations", href: "/country" },
                { label: id?.toUpperCase() ?? "Country" },
                { label: "GIS Layers" },
              ]}
            />
          }
        />

        <div className="flex flex-1 px-6 pb-6 gap-4">
          {/* Left panel: layer controls */}
          <div className="w-80 bg-white rounded-lg border p-4 shadow-sm">
            <h3 className="font-semibold mb-3 text-sm">Layers (toggle to show)</h3>
            <div className="space-y-2">
              {Object.entries(layers).map(([key, value]) => (
                <label
                  key={key}
                  className="flex items-center gap-2 text-sm cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={value}
                    onChange={() => handleToggle(key)}
                  />
                  {key}
                </label>
              ))}
            </div>

            <div className="mt-6 border-t pt-3 text-xs text-gray-500">
              <p>Available Datasets</p>
              <p className="mt-1 text-green-600">Philippines (2023) • Active</p>
            </div>

            <div className="mt-6">
              <Button className="w-full">Upload GIS Dataset</Button>
            </div>
          </div>

          {/* Map */}
          <div className="flex-1 rounded-lg overflow-hidden border bg-white shadow-sm">
            <MapContainer
              center={[12.8797, 121.774]} // 🇵🇭 Center of Philippines
              zoom={6}
              style={{ height: "100%", width: "100%" }}
              whenReady={(map) => {
                mapRef.current = map.target; // ✅ use whenReady instead of whenCreated
              }}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution="&copy; OpenStreetMap contributors"
              />
            </MapContainer>
          </div>
        </div>
      </main>
    </div>
  );
}

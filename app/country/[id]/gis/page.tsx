"use client";

import { useState, useEffect, useRef } from "react";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

type GISDatasetVersion = {
  id: string;
  country_iso: string;
  title: string;
  source: string | null;
  created_at: string;
  is_active: boolean;
};

type GISLayer = {
  id: string;
  layer_name: string;
  admin_level: string | null;
  dataset_version_id: string;
  source: { path: string };
};

export default function GISPage({ params }: any) {
  const { id: countryIso } = params;
  const [versions, setVersions] = useState<GISDatasetVersion[]>([]);
  const [layers, setLayers] = useState<GISLayer[]>([]);
  const [mapVisible, setMapVisible] = useState(true);
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  // ---- Fetch dataset versions ----
  useEffect(() => {
    const fetchVersions = async () => {
      const { data, error } = await supabase
        .from("gis_dataset_versions")
        .select("*")
        .eq("country_iso", countryIso)
        .order("created_at", { ascending: false });
      if (!error && data) setVersions(data);
    };
    fetchVersions();
  }, [countryIso]);

  // ---- Fetch layers ----
  useEffect(() => {
    const fetchLayers = async () => {
      const { data, error } = await supabase
        .from("gis_layers")
        .select("id, layer_name, admin_level, dataset_version_id, source");
      if (!error && data) setLayers(data);
    };
    fetchLayers();
  }, []);

  // ---- Initialize map ----
  useEffect(() => {
    if (!mapVisible || !mapContainerRef.current) return;

    // Destroy old map before creating a new one
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    const map = L.map(mapContainerRef.current).setView([12.8797, 121.774], 5);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
    }).addTo(map);
    mapRef.current = map;

    // ---- Load and render GeoJSON layers ----
    const loadLayers = async () => {
      for (const layer of layers) {
        const path = layer.source?.path;
        if (!path) continue;
        const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${path}`;

        try {
          const res = await fetch(url);
          if (!res.ok) continue;
          const geojson = await res.json();
          const gjLayer = L.geoJSON(geojson, {
            style: {
              color: "#ff0000",
              weight: 1,
              fillOpacity: 0.2,
            },
          }).addTo(map);
          map.fitBounds(gjLayer.getBounds(), { padding: [20, 20] });
        } catch (err) {
          console.error("Layer load error:", err);
        }
      }
    };

    loadLayers();

    // Cleanup when map is hidden
    return () => {
      map.remove();
    };
  }, [mapVisible, layers]);

  // ---- Page header ----
  const headerProps = {
    title: `${countryIso} – GIS Layers`,
    group: "country-config" as const,
    description: "Manage and preview GIS dataset layers for this country.",
    breadcrumbs: (
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Country Configuration", href: "/country" },
          { label: countryIso, href: `/country/${countryIso}` },
          { label: "GIS" },
        ]}
      />
    ),
  };

  return (
    <SidebarLayout headerProps={headerProps}>
      {/* Dataset Versions */}
      <div className="border rounded-lg p-4 shadow-sm mb-6">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            GIS Dataset Versions
          </h2>
          <button
            onClick={() => setMapVisible((v) => !v)}
            className="text-sm border rounded px-3 py-1 hover:bg-gray-100"
          >
            {mapVisible ? "Hide Map" : "Show Map"}
          </button>
        </div>

        <table className="w-full text-sm border">
          <thead className="bg-gray-100">
            <tr>
              <th className="border px-2 py-1 text-left">Title</th>
              <th className="border px-2 py-1 text-left">Source</th>
              <th className="border px-2 py-1 text-left">Created</th>
              <th className="border px-2 py-1 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {versions.map((v) => (
              <tr key={v.id} className="hover:bg-gray-50">
                <td className="border px-2 py-1">{v.title}</td>
                <td className="border px-2 py-1">{v.source || "—"}</td>
                <td className="border px-2 py-1">
                  {new Date(v.created_at).toLocaleDateString()}
                </td>
                <td className="border px-2 py-1">
                  {v.is_active ? (
                    <span className="text-green-700 font-semibold">● Active</span>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Map */}
      {mapVisible && (
        <div
          className="relative w-full border rounded-lg shadow overflow-hidden"
          style={{ height: "600px", minHeight: "500px" }}
        >
          <div
            ref={mapContainerRef}
            id="map-container"
            className="absolute inset-0"
            style={{ zIndex: 0 }}
          />
        </div>
      )}

      {/* Layers Table */}
      <div className="border rounded-lg mt-6 p-4 shadow-sm">
        <h3 className="text-md font-semibold mb-2">Layers</h3>
        <table className="w-full text-sm border">
          <thead className="bg-gray-100">
            <tr>
              <th className="border px-2 py-1 text-left">Layer Name</th>
              <th className="border px-2 py-1 text-left">Admin Level</th>
              <th className="border px-2 py-1 text-left">Visible</th>
            </tr>
          </thead>
          <tbody>
            {layers.map((l) => (
              <tr key={l.id} className="hover:bg-gray-50">
                <td className="border px-2 py-1">{l.layer_name}</td>
                <td className="border px-2 py-1">{l.admin_level || "—"}</td>
                <td className="border px-2 py-1 text-center">
                  <input type="checkbox" checked readOnly />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SidebarLayout>
  );
}

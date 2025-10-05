"use client";

import { useState, useEffect } from "react";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { Layers } from "lucide-react";
import dynamic from "next/dynamic";

// Load Leaflet dynamically (prevents SSR errors)
const L = typeof window !== "undefined" ? require("leaflet") : null;

type Country = {
  iso_code: string;
  name: string;
};

type GISLayer = {
  id: string;
  layer_name: string;
  admin_level: string | null;
  source: { path: string };
  dataset_version_id: string;
  is_active?: boolean;
};

export default function GISPage({ params }: any) {
  const { id: countryIso } = params;

  const [country, setCountry] = useState<Country | null>(null);
  const [layers, setLayers] = useState<GISLayer[]>([]);
  const [visibleLayers, setVisibleLayers] = useState<Record<string, boolean>>({});
  const [mapVisible, setMapVisible] = useState(true);
  const [mapInstance, setMapInstance] = useState<L.Map | null>(null);
  const [geoLayers, setGeoLayers] = useState<Record<string, L.GeoJSON<any>>>({});

  // ---- Load country metadata ----
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("countries")
        .select("iso_code, name")
        .eq("iso_code", countryIso)
        .single();
      if (data) setCountry(data);
    })();
  }, [countryIso]);

  // ---- Load all GIS layers ----
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("gis_layers")
        .select("*")
        .eq("country_iso", countryIso);
      if (!error && data) {
        setLayers(data);
        const defaults: Record<string, boolean> = {};
        data.forEach((l: GISLayer) => (defaults[l.id] = true));
        setVisibleLayers(defaults);
      }
    })();
  }, [countryIso]);

  // ---- Initialize Leaflet map ----
  useEffect(() => {
    if (!mapVisible || typeof window === "undefined") return;

    const container = L.DomUtil.get("map-container");
    if (container && (container as any)._leaflet_id) {
      L.DomUtil.remove(container);
      const newDiv = document.createElement("div");
      newDiv.id = "map-container";
      newDiv.style.height = "600px";
      container.parentNode?.appendChild(newDiv);
    }

    const map = L.map("map-container").setView([12.8797, 121.774], 6);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18,
      attribution: "© OSM",
    }).addTo(map);

    setMapInstance(map);
    return () => {
      map.remove();
    };
  }, [mapVisible]);

  // ---- Load and render layers ----
  useEffect(() => {
    if (!mapInstance) return;

    (async () => {
      // Remove previous GeoJSONs
      Object.values(geoLayers).forEach((gl) => gl.remove());
      const newGeoLayers: Record<string, L.GeoJSON<any>> = {};

      for (const layer of layers) {
        if (!visibleLayers[layer.id]) continue;

        const path = layer.source?.path;
        if (!path) continue;

        // Detect correct bucket
        const bucket = path.startsWith("gis_raw/") ? "gis_raw" : "gis";
        const relativePath = path.replace(/^gis_raw\//, "").replace(/^gis\//, "");
        console.log("Loading from:", bucket, relativePath);

        const { data, error } = await supabase.storage.from(bucket).download(relativePath);
        if (error || !data) {
          console.warn("Failed to fetch layer:", layer.layer_name, error);
          continue;
        }

        try {
          const text = await data.text();
          const geojson = JSON.parse(text);

          const colorMap: Record<string, string> = {
            ADM0: "#003f5c",
            ADM1: "#58508d",
            ADM2: "#bc5090",
            ADM3: "#ff6361",
            ADM4: "#ffa600",
          };

          const geoLayer = L.geoJSON(geojson, {
            style: {
              color: colorMap[layer.admin_level || "ADM2"] || "#ff0000",
              weight: 1,
              fillOpacity: 0.1,
            },
          }).addTo(mapInstance);

          newGeoLayers[layer.id] = geoLayer;
        } catch (err) {
          console.error("Invalid GeoJSON:", layer.layer_name, err);
        }
      }

      setGeoLayers(newGeoLayers);

      // Fit bounds to all active layers
      const allBounds = Object.values(newGeoLayers)
        .map((gl) => gl.getBounds())
        .filter((b) => b && b.isValid());

      if (allBounds.length > 0) {
        const combined = allBounds[0];
        allBounds.slice(1).forEach((b) => combined.extend(b));
        mapInstance.fitBounds(combined);
      }
    })();
  }, [layers, visibleLayers, mapInstance]);

  // ---- Header ----
  const headerProps = {
    title: `${country?.name ?? countryIso} – GIS Layers`,
    group: "country-config" as const,
    description: "Manage uploaded GIS boundary layers and preview them on the map.",
    breadcrumbs: (
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Country Configuration", href: "/country" },
          { label: country?.name ?? countryIso, href: `/country/${countryIso}` },
          { label: "GIS" },
        ]}
      />
    ),
  };

  // ---- Toggle visibility ----
  const toggleLayer = (id: string) => {
    setVisibleLayers((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <SidebarLayout headerProps={headerProps}>
      <div className="border rounded-lg p-4 shadow-sm mb-6">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Layers className="w-5 h-5 text-green-600" />
            GIS Dataset Versions
          </h2>
          <button
            onClick={() => setMapVisible(!mapVisible)}
            className="text-sm border rounded px-2 py-1 hover:bg-gray-100"
          >
            {mapVisible ? "Hide Map" : "Show Map"}
          </button>
        </div>
      </div>

      {/* Map Container */}
      {mapVisible && (
        <div
          id="map-container"
          style={{ height: "600px" }}
          className="rounded-lg shadow-sm mb-6 z-10"
        />
      )}

      {/* Layers Table */}
      <div className="border rounded-lg p-4 shadow-sm">
        <h3 className="font-semibold text-base mb-2 flex items-center gap-2">
          <Layers className="w-4 h-4 text-blue-500" /> Layers
        </h3>
        <table className="w-full text-sm border">
          <thead className="bg-gray-100">
            <tr>
              <th className="border px-2 py-1 text-left">Layer Name</th>
              <th className="border px-2 py-1 text-left">Admin Level</th>
              <th className="border px-2 py-1 text-center">Visible</th>
            </tr>
          </thead>
          <tbody>
            {layers.map((l) => (
              <tr key={l.id} className="hover:bg-gray-50">
                <td className="border px-2 py-1">{l.layer_name}</td>
                <td className="border px-2 py-1">{l.admin_level || "—"}</td>
                <td className="border px-2 py-1 text-center">
                  <input
                    type="checkbox"
                    checked={visibleLayers[l.id] ?? false}
                    onChange={() => toggleLayer(l.id)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SidebarLayout>
  );
}

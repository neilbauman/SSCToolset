"use client";

import { useState, useEffect, useRef } from "react";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { Layers, Upload, Check } from "lucide-react";

const L = typeof window !== "undefined" ? require("leaflet") : null;

type Country = { iso_code: string; name: string };
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
  source: { path: string };
  dataset_version_id: string;
};

export default function GISPage({ params }: any) {
  const { id: countryIso } = params;
  const [country, setCountry] = useState<Country | null>(null);
  const [versions, setVersions] = useState<GISDatasetVersion[]>([]);
  const [layers, setLayers] = useState<GISLayer[]>([]);
  const [visibleLayers, setVisibleLayers] = useState<Record<string, boolean>>({});
  const [mapVisible, setMapVisible] = useState(true);

  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const geoLayersRef = useRef<Record<string, L.GeoJSON<any>>>({});

  // ---- Load Country ----
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

  // ---- Load Versions ----
  const fetchVersions = async () => {
    const { data, error } = await supabase
      .from("gis_dataset_versions")
      .select("*")
      .eq("country_iso", countryIso)
      .order("created_at", { ascending: false });
    if (!error && data) setVersions(data);
  };

  // ---- Load Layers ----
  const fetchLayers = async () => {
    const { data, error } = await supabase
      .from("gis_layers")
      .select("*")
      .eq("country_iso", countryIso);
    if (!error && data) {
      setLayers(data);
      const defaults: Record<string, boolean> = {};
      data.forEach((l) => (defaults[l.id] = true));
      setVisibleLayers(defaults);
    }
  };

  useEffect(() => {
    fetchVersions();
    fetchLayers();
  }, [countryIso]);

  // ---- Initialize Map ----
  useEffect(() => {
    if (!mapVisible || typeof window === "undefined" || !L) return;
    const container = mapContainerRef.current;
    if (!container) return;

    // Remove ghost map instances
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }
    container.innerHTML = "";

    const map = L.map(container, {
      zoomControl: true,
      preferCanvas: true,
    }).setView([12.8797, 121.774], 6);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18,
      attribution: "© OpenStreetMap contributors",
    }).addTo(map);

    mapRef.current = map;
    setTimeout(() => map.invalidateSize(), 400);

    const resizeObserver = new ResizeObserver(() => map.invalidateSize());
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      map.remove();
    };
  }, [mapVisible]);

  // ---- Render GIS layers ----
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    Object.values(geoLayersRef.current).forEach((gl) => gl.remove());
    geoLayersRef.current = {};

    (async () => {
      const colorMap: Record<string, string> = {
        ADM0: "#003f5c",
        ADM1: "#58508d",
        ADM2: "#bc5090",
        ADM3: "#ff6361",
        ADM4: "#ffa600",
        ADM5: "#8884d8",
      };

      for (const layer of layers) {
        if (!visibleLayers[layer.id]) continue;
        const path = layer.source?.path;
        if (!path) continue;
        const bucket = path.startsWith("gis_raw/") ? "gis_raw" : "gis";
        const relativePath = path.replace(/^gis_raw\//, "").replace(/^gis\//, "");

        const { data, error } = await supabase.storage.from(bucket).download(relativePath);
        if (error || !data) continue;

        try {
          const geojson = JSON.parse(await data.text());
          const geoLayer = L.geoJSON(geojson, {
            style: {
              color: colorMap[layer.admin_level || "ADM2"],
              weight: 1,
              fillOpacity: 0.15,
            },
          }).addTo(map);
          geoLayersRef.current[layer.id] = geoLayer;
        } catch (err) {
          console.error("Invalid GeoJSON:", err);
        }
      }

      const bounds = Object.values(geoLayersRef.current)
        .map((gl) => gl.getBounds())
        .filter((b) => b.isValid());
      if (bounds.length > 0) {
        const merged = bounds[0];
        bounds.slice(1).forEach((b) => merged.extend(b));
        map.fitBounds(merged);
      }
    })();
  }, [layers, visibleLayers]);

  const toggleLayer = (id: string) => {
    setVisibleLayers((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const headerProps = {
    title: `${country?.name ?? countryIso} – GIS Layers`,
    group: "country-config" as const,
    description: "Manage and visualize uploaded GIS datasets for this country.",
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

  return (
    <SidebarLayout headerProps={headerProps}>
      {/* ---- Versions ---- */}
      <div className="border rounded-lg p-4 shadow-sm mb-6">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Layers className="w-5 h-5 text-green-600" />
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
              <tr key={v.id}>
                <td className="border px-2 py-1">{v.title}</td>
                <td className="border px-2 py-1">{v.source || "—"}</td>
                <td className="border px-2 py-1">
                  {new Date(v.created_at).toLocaleDateString()}
                </td>
                <td className="border px-2 py-1">
                  {v.is_active ? (
                    <span className="inline-flex items-center gap-1 text-xs bg-green-600 text-white px-2 py-0.5 rounded">
                      <Check className="w-3 h-3" /> Active
                    </span>
                  ) : (
                    <span className="text-xs text-gray-500">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ---- Map ---- */}
      {mapVisible && (
        <div
          className="relative w-full border rounded-lg shadow-sm overflow-hidden"
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

      {/* ---- Layers ---- */}
      <div className="border rounded-lg p-4 shadow-sm mt-6">
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
              <tr key={l.id}>
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

"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { Trash2, Plus, RefreshCw, X } from "lucide-react";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import type { CountryParams } from "@/app/country/types";
import type { GISLayer } from "@/types/gis";
import type { FeatureCollection, Geometry } from "geojson";
import type { Map as LeafletMap } from "leaflet";
import UploadGISModal from "@/components/country/UploadGISModal";

// Lazy-loaded Leaflet components
const MapContainer = dynamic(() => import("react-leaflet").then(m => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import("react-leaflet").then(m => m.TileLayer), { ssr: false });
const GeoJSON = dynamic(() => import("react-leaflet").then(m => m.GeoJSON), { ssr: false });

export default function GISPage({ params }: { params: CountryParams }) {
  const countryIso = params.id.toUpperCase();
  const [layers, setLayers] = useState<GISLayer[]>([]);
  const [geojsonById, setGeojsonById] = useState<Record<string, FeatureCollection>>({});
  const [visible, setVisible] = useState<Record<string, boolean>>({});
  const [openUpload, setOpenUpload] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const mapRef = useRef<LeafletMap | null>(null);
  const [mapKey, setMapKey] = useState(0);
  const [toasts, setToasts] = useState<{ id: number; msg: string }[]>([]);

  // Toast helper
  const showToast = (msg: string) => {
    const id = Date.now();
    setToasts(t => [...t, { id, msg }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4000);
  };

  // Color palette by ADM level
  const levelColors: Record<string, string> = {
    ADM0: "#8B0000",
    ADM1: "#B22222",
    ADM2: "#DC143C",
    ADM3: "#E36C0A",
    ADM4: "#E3B60A",
    ADM5: "#A8D603",
  };
  const colorByLevel = (level?: string) => levelColors[level || ""] || "#640811";

  // Simplify coordinates
  const simplifyCoords = (coords: any, tolerance = 0.01): any => {
    if (!Array.isArray(coords)) return coords;
    if (typeof coords[0] === "number") return coords.map(n => +(+n).toFixed(5));
    return coords.map(c => simplifyCoords(c, tolerance));
  };

  // Fetch GIS layers
  const fetchLayers = useCallback(async () => {
    const { data, error } = await supabase
      .from("gis_layers")
      .select("id, country_iso, layer_name, admin_level, feature_count, avg_area_sqkm, source")
      .eq("country_iso", countryIso)
      .order("admin_level", { ascending: true });

    if (error) {
      console.error("❌ Error fetching layers:", error.message);
      showToast("❌ Failed to load GIS layers");
    } else setLayers(data || []);
  }, [countryIso]);

  // Toggle visibility and load GeoJSON
  const toggleLayer = async (layer: GISLayer) => {
    const id = layer.id;
    const isVisible = !visible[id];
    setVisible(prev => ({ ...prev, [id]: isVisible }));

    if (isVisible && !geojsonById[id]) {
      try {
        const bucket = layer.source?.bucket || "gis_raw";
        const path =
          layer.source?.path ||
          layer.source?.url?.split("/storage/v1/object/public/")[1] ||
          layer.layer_name;
        const { data: file, error } = await supabase.storage.from(bucket).download(path);
        if (error || !file) throw new Error(error?.message || "No data found");
        const text = await file.text();
        const json = JSON.parse(text) as FeatureCollection<Geometry>;

        // Clean geometry
        const cleaned = {
          ...json,
          features: json.features.map(f => ({
            ...f,
            geometry:
              f.geometry && "coordinates" in f.geometry
                ? {
                    ...f.geometry,
                    coordinates: simplifyCoords((f.geometry as any).coordinates, 0.01),
                  }
                : f.geometry,
          })),
        };

        setGeojsonById(prev => ({ ...prev, [id]: cleaned }));
        fitToLayer(cleaned);
        showToast(`✅ Loaded ${layer.layer_name}`);
      } catch (err) {
        console.error("⚠️ Failed loading GeoJSON:", err);
        showToast(`⚠️ Failed to load ${layer.layer_name}`);
      }
    } else if (isVisible && geojsonById[id]) {
      fitToLayer(geojsonById[id]);
    }
  };

  // Fit map bounds
  const fitToLayer = (geojson: FeatureCollection) => {
    const map = mapRef.current;
    if (!map || !geojson.features?.length) return;

    const coords = geojson.features.flatMap(f =>
      f.geometry?.type === "Polygon" || f.geometry?.type === "MultiPolygon"
        ? (f.geometry.coordinates.flat(2) as number[][])
        : []
    );
    const valid = coords.filter(c => Array.isArray(c) && c.length === 2);
    if (valid.length > 0) {
      const lats = valid.map(c => c[1]);
      const lngs = valid.map(c => c[0]);
      const bounds: [[number, number], [number, number]] = [
        [Math.min(...lats), Math.min(...lngs)],
        [Math.max(...lats), Math.max(...lngs)],
      ];
      map.fitBounds(bounds, { padding: [20, 20] });
    }
  };

  // Delete layer (cascade)
  const handleDeleteLayer = async (layer: GISLayer) => {
    if (!confirm(`Delete layer "${layer.layer_name}" and all its features?`)) return;
    try {
      const bucket = layer.source?.bucket || "gis_raw";
      const path = layer.source?.path || layer.layer_name;
      await supabase.storage.from(bucket).remove([path]);
      await supabase.rpc("delete_gis_layer_cascade", { p_id: layer.id });
      await fetchLayers();
      showToast(`🗑️ Deleted ${layer.layer_name}`);
    } catch (err: any) {
      showToast("❌ Delete failed: " + err.message);
    }
  };

  // Refresh metrics
  const refreshMetrics = async () => {
    setRefreshing(true);
    try {
      const { error } = await supabase.functions.invoke("compute-gis-metrics", {
        body: { country_iso: countryIso },
      });
      if (error) throw error;
      await fetchLayers();
      showToast("📊 Metrics refreshed");
    } catch (err: any) {
      showToast("❌ Metrics refresh failed: " + err.message);
    } finally {
      setRefreshing(false);
    }
  };

  // Realtime listener
  useEffect(() => {
    const channel = supabase
      .channel("gis_layers_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "gis_layers" }, () =>
        fetchLayers()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchLayers]);

  // Initial load
  useEffect(() => {
    fetchLayers();
  }, [fetchLayers]);

  // Force map refresh
  useEffect(() => {
    const timer = setTimeout(() => setMapKey(k => k + 1), 200);
    return () => clearTimeout(timer);
  }, []);

  // ────────────────────────────────
  // Render
  // ────────────────────────────────
  return (
    <SidebarLayout
      headerProps={{
        title: `${countryIso} – GIS Layers`,
        group: "country-config",
        breadcrumbs: (
          <Breadcrumbs
            items={[
              { label: "Dashboard", href: "/" },
              { label: "Country Configuration", href: "/country" },
              { label: countryIso, href: `/country/${countryIso}` },
              { label: "GIS", href: "#" },
            ]}
          />
        ),
      }}
    >
      <div className="p-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">GIS Layers</h2>
          <div className="flex gap-2">
            <button
              onClick={() => setOpenUpload(true)}
              className="flex items-center gap-1 px-3 py-1.5 text-sm rounded bg-[#640811] text-white hover:opacity-90"
            >
              <Plus className="w-4 h-4" /> Upload
            </button>
            <button
              onClick={refreshMetrics}
              disabled={refreshing}
              className="flex items-center gap-1 px-3 py-1.5 text-sm rounded bg-[#640811] text-white hover:opacity-90"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} /> Refresh
            </button>
          </div>
        </div>

        {/* Layers Table */}
        <div className="bg-white border rounded-md overflow-hidden text-sm shadow">
          <table className="min-w-full border-collapse">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Name</th>
                <th className="px-3 py-2 text-left font-medium">Admin</th>
                <th className="px-3 py-2 text-right font-medium">Features</th>
                <th className="px-3 py-2 text-right font-medium">Avg Area (km²)</th>
                <th className="px-3 py-2 text-center font-medium">Visible</th>
                <th className="px-3 py-2 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {layers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center italic text-gray-500 py-3">
                    No GIS layers found.
                  </td>
                </tr>
              ) : (
                layers.map(l => (
                  <tr key={l.id} className="border-b hover:bg-gray-50">
                    <td className="px-3 py-2 break-words text-[#640811]">{l.layer_name}</td>
                    <td className="px-3 py-2">{l.admin_level || "—"}</td>
                    <td className="px-3 py-2 text-right">{l.feature_count ?? "—"}</td>
                    <td className="px-3 py-2 text-right">
                      {l.avg_area_sqkm ? l.avg_area_sqkm.toLocaleString() : "—"}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <input
                        type="checkbox"
                        checked={!!visible[l.id]}
                        onChange={() => toggleLayer(l)}
                        className="cursor-pointer"
                      />
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button
                        onClick={() => handleDeleteLayer(l)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="w-4 h-4 inline" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Map */}
        <div className="relative h-[500px] w-full rounded-md overflow-hidden border z-0">
          <MapContainer
            key={mapKey}
            center={[12.8797, 121.774]}
            zoom={5}
            style={{ height: "100%", width: "100%" }}
            ref={mapRef}
          >
            <TileLayer
              attribution='&copy; <a href="https://osm.org">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {Object.entries(geojsonById).map(([id, gj]) =>
              visible[id] ? (
                <GeoJSON
                  key={id}
                  data={gj as any}
                  style={{
                    color: colorByLevel(layers.find(l => l.id === id)?.admin_level || "ADM3"),
                    weight: 1,
                    fillOpacity: 0.25,
                  }}
                />
              ) : null
            )}
          </MapContainer>

          {/* Floating Legend */}
          <div className="absolute bottom-3 left-3 bg-white bg-opacity-95 rounded-md shadow-lg px-3 py-2 text-xs border z-[1000]">
            <div className="font-semibold mb-1 text-gray-800">Legend</div>
            {Object.entries(levelColors).map(([lvl, color]) => {
              const isActive = layers.some(
                l => l.admin_level === lvl && visible[l.id]
              );
              return (
                <div
                  key={lvl}
                  className={`flex items-center gap-2 mb-0.5 transition-opacity ${
                    isActive ? "opacity-100 text-gray-900 font-semibold" : "opacity-50 text-gray-500"
                  }`}
                >
                  <div
                    className="w-3 h-3 rounded-sm border"
                    style={{ backgroundColor: color }}
                  ></div>
                  <span>{lvl}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Upload Modal */}
        {openUpload && (
          <UploadGISModal
            open={openUpload}
            onClose={() => setOpenUpload(false)}
            countryIso={countryIso}
            onUploaded={fetchLayers}
          />
        )}

        {/* Toasts */}
        <div className="fixed bottom-4 right-4 space-y-2 z-[9999]">
          {toasts.map(t => (
            <div
              key={t.id}
              className="flex items-center gap-2 bg-[#640811] text-white px-4 py-2 rounded shadow-md animate-fadeIn"
            >
              <span>{t.msg}</span>
              <button onClick={() => setToasts(ts => ts.filter(x => x.id !== t.id))}>
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </SidebarLayout>
  );
}

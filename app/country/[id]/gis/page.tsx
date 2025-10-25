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
import type { Map as LeafletMap, LatLngBoundsExpression } from "leaflet";
import UploadGISModal from "@/components/country/UploadGISModal";

// Lazy-load Leaflet components
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
  const [simplifyLevel, setSimplifyLevel] = useState<"None" | "Low" | "Medium" | "High">("Medium");
  const [mapKey, setMapKey] = useState(0);
  const mapRef = useRef<LeafletMap | null>(null);

  // Toast notifications
  const [toasts, setToasts] = useState<{ id: number; msg: string }[]>([]);
  const showToast = (msg: string) => {
    const id = Date.now();
    setToasts(t => [...t, { id, msg }]);
    setTimeout(() => setToasts(t => t.filter(toast => toast.id !== id)), 4000);
  };

  // ────────────────────────────────
  // Fetch GIS layers
  // ────────────────────────────────
  const fetchLayers = useCallback(async () => {
    const { data, error } = await supabase
      .from("gis_layers")
      .select("id, country_iso, layer_name, admin_level, feature_count, avg_area_sqkm, source")
      .eq("country_iso", countryIso)
      .order("admin_level", { ascending: true });

    if (error) console.error("❌ Error fetching layers:", error.message);
    else setLayers(data || []);
  }, [countryIso]);

  // ────────────────────────────────
  // Simplify GeoJSON geometry
  // ────────────────────────────────
  const simplifyCoords = (coords: any, tolerance = 0.01): any => {
    if (!Array.isArray(coords)) return coords;
    if (typeof coords[0] === "number") return coords.map(n => +n.toFixed(5));
    return coords.map(inner => simplifyCoords(inner, tolerance));
  };

  const simplifyGeoJSON = (json: FeatureCollection): FeatureCollection => {
    try {
      return {
        ...json,
        features: json.features.map(f => {
          const geom = f.geometry;
          // Only simplify geometries that have coordinates
          if ("coordinates" in geom) {
            return {
              ...f,
              geometry: {
                ...geom,
                coordinates: simplifyCoords(geom.coordinates, 0.01),
              },
            };
          }
          return f; // GeometryCollection or invalid type
        }),
      };
    } catch (err) {
      console.error("⚠️ Simplification failed:", err);
      return json;
    }
  };

  // ────────────────────────────────
  // Fit map to GeoJSON bounds
  // ────────────────────────────────
  const fitToLayer = (geojson: FeatureCollection) => {
    const map = mapRef.current;
    if (!map || !geojson?.features?.length) return;

    const coords = geojson.features.flatMap(f => {
      if (f.geometry?.type === "Polygon")
        return (f.geometry.coordinates.flat(1) as number[][]).filter(c => Array.isArray(c) && c.length === 2);
      if (f.geometry?.type === "MultiPolygon")
        return (f.geometry.coordinates.flat(2) as number[][]).filter(c => Array.isArray(c) && c.length === 2);
      return [];
    });

    if (coords.length > 0) {
      const lats = coords.map(c => c[1]);
      const lngs = coords.map(c => c[0]);
      const bounds: LatLngBoundsExpression = [
        [Math.min(...lats), Math.min(...lngs)],
        [Math.max(...lats), Math.max(...lngs)],
      ];
      map.fitBounds(bounds, { padding: [20, 20] });
    }
  };

  // ────────────────────────────────
  // Toggle layer visibility
  // ────────────────────────────────
  const toggleLayer = async (layer: GISLayer) => {
    const id = layer.id;
    const isVisible = !visible[id];
    setVisible(prev => ({ ...prev, [id]: isVisible }));

    if (isVisible && !geojsonById[id]) {
      try {
        const bucket = layer.source?.bucket || "gis_raw";
        const path = layer.source?.path || layer.layer_name;
        const { data, error } = await supabase.storage.from(bucket).download(path);
        if (error || !data) throw error || new Error("No data returned");

        const text = await data.text();
        const json = JSON.parse(text) as FeatureCollection<Geometry>;
        const simplified = simplifyGeoJSON(json);

        setGeojsonById(prev => ({ ...prev, [id]: simplified }));
        fitToLayer(simplified);
      } catch (err) {
        console.error("⚠️ Failed loading GeoJSON:", err);
        showToast(`Failed to load ${layer.layer_name}`);
      }
    } else if (isVisible && geojsonById[id]) {
      fitToLayer(geojsonById[id]);
    }
  };

  // ────────────────────────────────
  // Delete layer (Supabase DB + Storage)
  // ────────────────────────────────
  const handleDeleteLayer = async (layer: GISLayer) => {
    if (!confirm(`Delete layer "${layer.layer_name}"?`)) return;
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

  // ────────────────────────────────
  // Refresh metrics
  // ────────────────────────────────
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

  // ────────────────────────────────
  // Realtime listener (safe cleanup)
  // ────────────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel("gis_layers_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "gis_layers" }, () => fetchLayers())
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [fetchLayers]);

  // ────────────────────────────────
  // Load layers on mount
  // ────────────────────────────────
  useEffect(() => {
    fetchLayers();
  }, [fetchLayers]);

  // ────────────────────────────────
  // Force map re-render
  // ────────────────────────────────
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
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">GIS Layers</h2>
            <label className="text-sm text-gray-600">
              Simplification:
              <select
                className="ml-1 border rounded px-2 py-1 text-sm"
                value={simplifyLevel}
                onChange={e => setSimplifyLevel(e.target.value as any)}
              >
                <option>None</option>
                <option>Low</option>
                <option>Medium</option>
                <option>High</option>
              </select>
            </label>
          </div>
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

        {/* Table */}
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
                    <td className="px-3 py-2">
                      <Link href="#" className="text-[#640811] hover:underline break-words">
                        {l.layer_name}
                      </Link>
                    </td>
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
        <div className="h-[500px] w-full rounded-md overflow-hidden border relative z-0">
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
              visible[id] ? <GeoJSON key={id} data={gj as any} style={{ color: "#640811", weight: 1 }} /> : null
            )}
          </MapContainer>
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
        <div className="fixed bottom-4 right-4 space-y-2 z-50">
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

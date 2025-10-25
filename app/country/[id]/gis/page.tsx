"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { Trash2, Plus, RefreshCw, X } from "lucide-react";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import UploadGISModal from "@/components/country/UploadGISModal";
import type { CountryParams } from "@/app/country/types";
import type { FeatureCollection, Geometry } from "geojson";
import type { Map as LeafletMap } from "leaflet";

// Lazy-load Leaflet
const MapContainer = dynamic(() => import("react-leaflet").then(m => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import("react-leaflet").then(m => m.TileLayer), { ssr: false });
const GeoJSON = dynamic(() => import("react-leaflet").then(m => m.GeoJSON), { ssr: false });

interface GISLayer {
  id: string;
  layer_name: string;
  admin_level: string | null;
  feature_count: number | null;
  avg_area_sqkm: number | null;
  total_area_sqkm: number | null;
  matched_features: number | null;
  unmatched_features: number | null;
  health_score: number | null;
  source?: any;
}

export default function GISPage({ params }: { params: CountryParams }) {
  const countryIso = params.id;
  const [layers, setLayers] = useState<GISLayer[]>([]);
  const [geojsonById, setGeojsonById] = useState<Record<string, FeatureCollection>>({});
  const [visible, setVisible] = useState<Record<string, boolean>>({});
  const [openUpload, setOpenUpload] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const mapRef = useRef<LeafletMap | null>(null);
  const [mapKey, setMapKey] = useState(0);

  // Toasts
  const [toasts, setToasts] = useState<{ id: number; msg: string }[]>([]);
  const showToast = (msg: string) => {
    const id = Date.now();
    setToasts(t => [...t, { id, msg }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4000);
  };

  // ────────────────────────────────
  // Load GIS layers
  // ────────────────────────────────
  const fetchLayers = useCallback(async () => {
    const { data, error } = await supabase
      .from("gis_layers")
      .select(
        "id, layer_name, admin_level, feature_count, avg_area_sqkm, total_area_sqkm, matched_features, unmatched_features, health_score, source"
      )
      .eq("country_iso", countryIso)
      .order("admin_level", { ascending: true });

    if (error) console.error("❌ Error fetching layers:", error);
    else setLayers(data || []);
  }, [countryIso]);

  // ────────────────────────────────
  // Fit bounds to GeoJSON
  // ────────────────────────────────
  const fitToLayer = (geojson: FeatureCollection) => {
    const map = mapRef.current;
    if (!map || !geojson.features?.length) return;
    const coords: number[][] = geojson.features.flatMap(f =>
      f.geometry?.type === "Polygon" || f.geometry?.type === "MultiPolygon"
        ? (f.geometry.coordinates.flat(2) as number[][])
        : []
    );
    const valid = coords.filter(c => Array.isArray(c) && c.length === 2);
    if (!valid.length) return;
    const lats = valid.map(c => c[1]);
    const lngs = valid.map(c => c[0]);
    map.fitBounds(
      [
        [Math.min(...lats), Math.min(...lngs)],
        [Math.max(...lats), Math.max(...lngs)],
      ],
      { padding: [20, 20] }
    );
  };

  // ────────────────────────────────
  // Toggle visibility
  // ────────────────────────────────
  const toggleLayer = async (layer: GISLayer) => {
    const id = layer.id;
    const isVisible = !visible[id];
    setVisible(v => ({ ...v, [id]: isVisible }));

    if (isVisible && !geojsonById[id]) {
      try {
        const bucket = layer.source?.bucket || "gis_raw";
        const path = layer.source?.path || layer.layer_name;
        const { data } = await supabase.storage.from(bucket).download(path);
        if (!data) return;
        const json = JSON.parse(await data.text()) as FeatureCollection<Geometry>;
        setGeojsonById(g => ({ ...g, [id]: json }));
        fitToLayer(json);
      } catch (e) {
        console.error("⚠️ GeoJSON load failed:", e);
        showToast("⚠️ Failed to load GeoJSON");
      }
    } else if (isVisible && geojsonById[id]) {
      fitToLayer(geojsonById[id]);
    }
  };

  // ────────────────────────────────
  // Delete layer
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
    } catch (e: any) {
      showToast(`❌ Delete failed: ${e.message}`);
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
    } catch (e: any) {
      showToast(`❌ Metrics refresh failed: ${e.message}`);
    } finally {
      setRefreshing(false);
    }
  };

  // ────────────────────────────────
  // Lifecycle
  // ────────────────────────────────
  useEffect(() => {
    fetchLayers();
  }, [fetchLayers]);

  useEffect(() => {
    const timer = setTimeout(() => setMapKey(k => k + 1), 150);
    return () => clearTimeout(timer);
  }, []);

  // ────────────────────────────────
  // Helpers
  // ────────────────────────────────
  const healthClass = (s: number | null) =>
    s == null
      ? "text-gray-500"
      : s >= 90
      ? "text-green-600 font-medium"
      : s >= 70
      ? "text-yellow-600 font-medium"
      : "text-red-600 font-medium";

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
      <div className="p-6 space-y-4 relative">
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

        {/* Table */}
        <div className="bg-white border rounded-md overflow-hidden text-sm shadow">
          <table className="min-w-full border-collapse">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Name</th>
                <th className="px-3 py-2 text-left font-medium">Admin</th>
                <th className="px-3 py-2 text-right font-medium">Features</th>
                <th className="px-3 py-2 text-right font-medium">Avg Area (km²)</th>
                <th className="px-3 py-2 text-right font-medium">Total Area (km²)</th>
                <th className="px-3 py-2 text-right font-medium">Matched</th>
                <th className="px-3 py-2 text-right font-medium">Unmatched</th>
                <th className="px-3 py-2 text-right font-medium">Health (%)</th>
                <th className="px-3 py-2 text-center font-medium">Visible</th>
                <th className="px-3 py-2 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {layers.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center italic text-gray-500 py-3">
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
                    <td className="px-3 py-2">{l.admin_level ?? "—"}</td>
                    <td className="px-3 py-2 text-right">{l.feature_count ?? "—"}</td>
                    <td className="px-3 py-2 text-right">
                      {l.avg_area_sqkm ? l.avg_area_sqkm.toLocaleString() : "—"}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {l.total_area_sqkm ? l.total_area_sqkm.toLocaleString() : "—"}
                    </td>
                    <td className="px-3 py-2 text-right">{l.matched_features ?? "—"}</td>
                    <td className="px-3 py-2 text-right text-red-600">
                      {l.unmatched_features ?? "—"}
                    </td>
                    <td className={`px-3 py-2 text-right ${healthClass(l.health_score)}`}>
                      {l.health_score != null ? `${l.health_score.toFixed(1)}%` : "—"}
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
              visible[id] ? (
                <GeoJSON
                  key={id}
                  data={gj as any}
                  style={{ color: "#640811", weight: 1, fillOpacity: 0.2 }}
                />
              ) : null
            )}
          </MapContainer>

          {/* Legend */}
          <div className="absolute bottom-3 left-3 bg-white/90 p-3 rounded shadow-md z-10">
            <div className="text-sm font-medium mb-1">Health Legend</div>
            <div className="space-y-1 text-xs">
              <div>
                <span className="inline-block w-3 h-3 bg-green-500 mr-2 rounded-sm" />
                ≥ 90% Healthy
              </div>
              <div>
                <span className="inline-block w-3 h-3 bg-yellow-500 mr-2 rounded-sm" />
                70–89% Moderate
              </div>
              <div>
                <span className="inline-block w-3 h-3 bg-red-500 mr-2 rounded-sm" />
                < 70% Poor
              </div>
            </div>
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
        <div className="fixed bottom-4 right-4 space-y-2 z-50">
          {toasts.map(t => (
            <div
              key={t.id}
              className="flex items-center gap-2 bg-[#640811] text-white px-4 py-2 rounded shadow-md"
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

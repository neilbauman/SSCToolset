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

// Lazy load Leaflet
const MapContainer = dynamic(() => import("react-leaflet").then(m => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import("react-leaflet").then(m => m.TileLayer), { ssr: false });
const GeoJSON = dynamic(() => import("react-leaflet").then(m => m.GeoJSON), { ssr: false });

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
      .select("id, country_iso, layer_name, admin_level, feature_count, avg_area_sqkm, source")
      .eq("country_iso", countryIso)
      .order("admin_level", { ascending: true });

    if (error) console.error("❌ Error fetching layers:", error.message);
    else setLayers(data || []);
  }, [countryIso]);

  // ────────────────────────────────
  // Fit map bounds to GeoJSON
  // ────────────────────────────────
  const fitToLayer = (geojson: FeatureCollection) => {
    const map = mapRef.current;
    if (!map || !geojson.features?.length) return;

    const coords = geojson.features
      .flatMap(f =>
        f.geometry?.type === "Polygon" || f.geometry?.type === "MultiPolygon"
          ? (f.geometry.coordinates.flat(2) as number[][])
          : []
      )
      .filter(c => Array.isArray(c) && c.length === 2);

    if (coords.length) {
      const lats = coords.map(c => c[1]);
      const lngs = coords.map(c => c[0]);
      map.fitBounds(
        [
          [Math.min(...lats), Math.min(...lngs)],
          [Math.max(...lats), Math.max(...lngs)],
        ],
        { padding: [20, 20] }
      );
    }
  };

  // ────────────────────────────────
  // Toggle visibility + load GeoJSON
  // ────────────────────────────────
  const toggleLayer = async (layer: GISLayer) => {
    const id = layer.id;
    const isVisible = !visible[id];
    setVisible(prev => ({ ...prev, [id]: isVisible }));

    if (!isVisible) return; // turning off, nothing to load

    if (!geojsonById[id]) {
      try {
        let text: string | null = null;

        // Try direct public URL first
        if (layer.source?.url) {
          const res = await fetch(layer.source.url);
          if (res.ok) text = await res.text();
        }

        // Fallback to Supabase Storage
        if (!text) {
          const bucket = layer.source?.bucket || "gis_raw";
          const path = layer.source?.path || layer.layer_name;
          const { data, error } = await supabase.storage.from(bucket).download(path);
          if (error) console.error("⚠️ Supabase download failed:", error.message);
          else if (data) text = await data.text();
        }

        if (!text) {
          console.warn(`⚠️ Could not load ${layer.layer_name}`);
          return;
        }

        // Defensive JSON parsing
        let parsed: any;
        try {
          parsed = JSON.parse(text);
        } catch {
          console.error(`⚠️ Invalid JSON for ${layer.layer_name}`);
          return;
        }

        const json: FeatureCollection =
          parsed.type === "FeatureCollection" && Array.isArray(parsed.features)
            ? parsed
            : parsed.features
            ? { type: "FeatureCollection", features: parsed.features }
            : Array.isArray(parsed)
            ? { type: "FeatureCollection", features: parsed }
            : { type: "FeatureCollection", features: [] };

        setGeojsonById(prev => ({ ...prev, [id]: json }));

        if (json.features.length > 0) {
          fitToLayer(json);
          console.log(`✅ Loaded ${layer.layer_name} (${json.features.length} features)`);
        } else {
          console.warn(`⚠️ ${layer.layer_name} has no valid features`);
        }
      } catch (err) {
        console.error("⚠️ Failed loading GeoJSON:", err);
      }
    } else {
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
  // Realtime updates
  // ────────────────────────────────
  useEffect(() => {
    const channel = supabase
      .channel("gis_layers_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "gis_layers" }, payload => {
        console.log("🔄 GIS layer changed — refreshing...");
        fetchLayers();

        if (payload.eventType === "INSERT")
          showToast(`🆕 Added layer: ${(payload.new as any).layer_name}`);
        else if (payload.eventType === "DELETE")
          showToast(`🗑️ Removed layer: ${(payload.old as any).layer_name}`);
        else if (payload.eventType === "UPDATE")
          showToast(`✏️ Updated layer: ${(payload.new as any).layer_name}`);
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [fetchLayers]);

  // ────────────────────────────────
  // Mount
  // ────────────────────────────────
  useEffect(() => {
    fetchLayers();
  }, [fetchLayers]);

  useEffect(() => {
    const timer = setTimeout(() => setMapKey(k => k + 1), 200);
    return () => clearTimeout(timer);
  }, []);

  // Color by admin level
  const colorByLevel = (lvl?: string) =>
    lvl === "ADM1" ? "#a31d1d" : lvl === "ADM2" ? "#c94f23" : lvl === "ADM3" ? "#640811" : "#555";

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
        {/* Header actions */}
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
              visible[id] ? (
                <GeoJSON
                  key={id}
                  data={gj as any}
                  style={{
                    color: colorByLevel(
                      layers.find(l => l.id === id)?.admin_level
                    ),
                    weight: 1,
                  }}
                />
              ) : null
            )}
          </MapContainer>
        </div>

        {/* Upload Modal */}
        {openUpload && (
          <div className="z-50 relative">
            <UploadGISModal
              open={openUpload}
              onClose={() => setOpenUpload(false)}
              countryIso={countryIso}
              onUploaded={fetchLayers}
            />
          </div>
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

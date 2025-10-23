"use client";

import { useEffect, useState, useRef } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { Trash2, Plus, RefreshCw } from "lucide-react";
import type { CountryParams } from "@/app/country/types";
import type { GISLayer } from "@/types/gis";
import type { FeatureCollection, Geometry } from "geojson";
import type { Map as LeafletMap } from "leaflet";
import UploadGISModal from "@/components/country/UploadGISModal";

// ✅ Lazy-load Leaflet to prevent SSR issues
const MapContainer = dynamic(
  () => import("react-leaflet").then((m) => m.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import("react-leaflet").then((m) => m.TileLayer),
  { ssr: false }
);
const GeoJSON = dynamic(
  () => import("react-leaflet").then((m) => m.GeoJSON),
  { ssr: false }
);

export default function GISPage({ params }: { params: CountryParams }) {
  const countryIso = params.id;
  const [layers, setLayers] = useState<GISLayer[]>([]);
  const [geojsonById, setGeojsonById] = useState<Record<string, FeatureCollection>>({});
  const [visible, setVisible] = useState<Record<string, boolean>>({});
  const [openUpload, setOpenUpload] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const mapRef = useRef<LeafletMap | null>(null);

  /** ───────────────────────────────────────────────
   * Load all GIS layers for this country
   * ─────────────────────────────────────────────── */
  const fetchLayers = async () => {
    const { data, error } = await supabase
      .from("gis_layers")
      .select(
        "id, country_iso, layer_name, admin_level, feature_count, avg_area_sqkm, centroid_lat, centroid_lon, source"
      )
      .eq("country_iso", countryIso)
      .order("admin_level", { ascending: true });

    if (error) {
      console.error("❌ Error loading layers:", error.message);
      return;
    }

    const typed = (data || []).map((l) => ({
      id: l.id,
      country_iso: countryIso,
      layer_name: l.layer_name,
      admin_level: l.admin_level,
      feature_count: l.feature_count ?? null,
      avg_area_sqkm: l.avg_area_sqkm ?? null,
      centroid_lat: l.centroid_lat ?? null,
      centroid_lon: l.centroid_lon ?? null,
      source: l.source ?? null,
    })) as GISLayer[];

    setLayers(typed);
  };

  /** ───────────────────────────────────────────────
   * Toggle visibility for a layer
   * ─────────────────────────────────────────────── */
  const toggleLayer = async (layer: GISLayer) => {
    const id = layer.id;
    const isVisible = !visible[id];
    setVisible((prev) => ({ ...prev, [id]: isVisible }));

    if (isVisible && !geojsonById[id]) {
      try {
        const bucket = layer.source?.bucket || "gis_raw";
        const path = layer.source?.path || layer.layer_name;
        const { data } = await supabase.storage.from(bucket).download(path);
        if (!data) return;
        const text = await data.text();
        const json = JSON.parse(text) as FeatureCollection<Geometry>;
        setGeojsonById((prev) => ({ ...prev, [id]: json }));

        // Auto-fit bounds
        if (mapRef.current && json.features?.length) {
          const coords = json.features
            .flatMap((f) =>
              f.geometry?.type === "Polygon" ||
              f.geometry?.type === "MultiPolygon"
                ? (f.geometry.coordinates.flat(2) as number[][])
                : []
            )
            .filter((c) => Array.isArray(c) && c.length === 2);

          if (coords.length > 0) {
            const lats = coords.map((c) => c[1]);
            const lngs = coords.map((c) => c[0]);
            const bounds: [[number, number], [number, number]] = [
              [Math.min(...lats), Math.min(...lngs)],
              [Math.max(...lats), Math.max(...lngs)],
            ];
            mapRef.current.fitBounds(bounds, { padding: [20, 20] });
          }
        }
      } catch (err) {
        console.error("⚠️ Failed loading GeoJSON:", err);
      }
    }
  };

  /** ───────────────────────────────────────────────
   * Delete layer (DB + Storage)
   * ─────────────────────────────────────────────── */
  const handleDeleteLayer = async (layer: GISLayer) => {
    if (!confirm(`Are you sure you want to delete "${layer.layer_name}"?`)) return;

    try {
      const bucket = layer.source?.bucket || "gis_raw";
      const path = layer.source?.path || layer.layer_name;
      if (bucket && path) {
        const { error: storageError } = await supabase.storage.from(bucket).remove([path]);
        if (storageError) console.warn("⚠️ Storage delete failed:", storageError.message);
      }

      const { error: rpcError } = await supabase.rpc("delete_gis_layer_cascade", {
        p_id: layer.id,
      });
      if (rpcError) throw rpcError;

      alert(`✅ Deleted: ${layer.layer_name}`);
      await fetchLayers();
    } catch (err: any) {
      console.error("❌ Delete failed:", err.message);
      alert("Delete failed: " + err.message);
    }
  };

  /** ───────────────────────────────────────────────
   * Refresh metrics
   * ─────────────────────────────────────────────── */
  const refreshMetrics = async () => {
    setRefreshing(true);
    try {
      const { error } = await supabase.functions.invoke("compute-gis-metrics", {
        body: { country_iso: countryIso },
      });
      if (error) throw error;
      await fetchLayers();
      alert("✅ Metrics refreshed!");
    } catch (err: any) {
      console.error("Metrics refresh failed:", err.message);
      alert("❌ Metrics refresh failed: " + err.message);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLayers();
  }, []);

  /** ───────────────────────────────────────────────
   * Render
   * ─────────────────────────────────────────────── */
  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">GIS Layers</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setOpenUpload(true)}
            className="flex items-center gap-1 px-3 py-1.5 text-sm rounded bg-[#640811] text-white hover:opacity-90"
          >
            <Plus className="w-4 h-4" />
            Upload
          </button>
          <button
            onClick={refreshMetrics}
            disabled={refreshing}
            className="flex items-center gap-1 px-3 py-1.5 text-sm rounded bg-[#640811] text-white hover:opacity-90"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
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
                  No GIS layers found. Upload one to get started.
                </td>
              </tr>
            ) : (
              layers.map((l) => (
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
      <div className="h-[500px] rounded-md overflow-hidden border">
        <MapContainer
          center={[12.8797, 121.774]}
          zoom={5}
          style={{ height: "100%", width: "100%" }}
          whenReady={() => {
            // ✅ Type-safe assignment with no params
            if (mapRef.current === null && (window as any).L) {
              mapRef.current = (window as any).L.map;
            }
          }}
        >
          <TileLayer
            attribution='&copy; <a href="https://osm.org">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {Object.entries(geojsonById).map(([id, gj]) =>
            visible[id] ? (
              <GeoJSON key={id} data={gj as any} style={{ color: "#640811", weight: 1 }} />
            ) : null
          )}
        </MapContainer>
      </div>

      {openUpload && (
        <UploadGISModal
          open={openUpload}
          onClose={() => setOpenUpload(false)}
          countryIso={countryIso}
          onUploaded={fetchLayers}
        />
      )}
    </div>
  );
}

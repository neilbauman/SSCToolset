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

// Lazy-load Leaflet
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

  const [toasts, setToasts] = useState<{ id: number; msg: string }[]>([]);
  const showToast = (msg: string) => {
    const id = Date.now();
    setToasts(t => [...t, { id, msg }]);
    setTimeout(() => setToasts(t => t.filter(toast => toast.id !== id)), 4000);
  };

  const fetchLayers = useCallback(async () => {
    const { data, error } = await supabase
      .from("gis_layers")
      .select(
        "id, country_iso, layer_name, admin_level, feature_count, avg_area_sqkm, total_area_sqkm, matched_features, unmatched_features, health_score, source"
      )
      .eq("country_iso", countryIso)
      .order("admin_level", { ascending: true });
    if (error) console.error(error);
    else setLayers(data || []);
  }, [countryIso]);

  const toggleLayer = async (layer: GISLayer) => {
    const id = layer.id;
    const isVisible = !visible[id];
    setVisible(prev => ({ ...prev, [id]: isVisible }));

    if (isVisible && !geojsonById[id]) {
      try {
        const bucket = layer.source?.bucket || "gis_raw";
        const path = layer.source?.path || layer.layer_name;
        const { data } = await supabase.storage.from(bucket).download(path);
        if (!data) return;

        const text = await data.text();
        const json = JSON.parse(text) as FeatureCollection<Geometry>;
        setGeojsonById(prev => ({ ...prev, [id]: json }));

        const coords = json.features.flatMap(f =>
          f.geometry?.type === "Polygon" || f.geometry?.type === "MultiPolygon"
            ? (f.geometry.coordinates.flat(2) as number[][])
            : []
        );
        if (coords.length) {
          const map = mapRef.current;
          if (map) {
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
        }
      } catch (err) {
        console.error("⚠️ Failed to load GeoJSON:", err);
      }
    }
  };

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

  useEffect(() => {
    fetchLayers();
  }, [fetchLayers]);

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

        {/* Table */}
        <div className="bg-white border rounded-md overflow-hidden text-sm shadow">
          <table className="min-w-full border-collapse">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-3 py-2 text-left">Name</th>
                <th className="px-3 py-2 text-left">Admin</th>
                <th className="px-3 py-2 text-right">Features</th>
                <th className="px-3 py-2 text-right">Avg Area (km²)</th>
                <th className="px-3 py-2 text-right">Total Area (km²)</th>
                <th className="px-3 py-2 text-right">Matched</th>
                <th className="px-3 py-2 text-right">Unmatched</th>
                <th className="px-3 py-2 text-right">Health (%)</th>
                <th className="px-3 py-2 text-center">Visible</th>
                <th className="px-3 py-2 text-right">Actions</th>
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
                    <td className="px-3 py-2 text-[#640811]">{l.layer_name}</td>
                    <td className="px-3 py-2">{l.admin_level}</td>
                    <td className="px-3 py-2 text-right">{l.feature_count ?? "—"}</td>
                    <td className="px-3 py-2 text-right">
                      {l.avg_area_sqkm ? l.avg_area_sqkm.toLocaleString() : "—"}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {l.total_area_sqkm ? l.total_area_sqkm.toLocaleString() : "—"}
                    </td>
                    <td className="px-3 py-2 text-right">{l.matched_features ?? "—"}</td>
                    <td className="px-3 py-2 text-right text-red-600">{l.unmatched_features ?? "—"}</td>
                    <td className="px-3 py-2 text-right">
                      {l.health_score == null ? (
                        "—"
                      ) : (
                        <span
                          className={`font-semibold ${
                            l.health_score >= 95
                              ? "text-green-600"
                              : l.health_score >= 75
                              ? "text-yellow-600"
                              : "text-red-600"
                          }`}
                          title={
                            l.health_score >= 95
                              ? "🟢 Healthy"
                              : l.health_score >= 75
                              ? "🟡 Needs Review"
                              : "🔴 Critical"
                          }
                        >
                          {l.health_score.toFixed(1)}%
                        </span>
                      )}
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
                        onClick={() => console.log("Delete", l.layer_name)}
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

        {/* Legend */}
        <div className="flex gap-4 text-sm text-gray-700 font-medium bg-white border rounded p-2 shadow-md w-fit z-40 relative">
          <span>🟢 Healthy ≥95%</span>
          <span>🟡 Needs Review 75–95%</span>
          <span>🔴 Critical &lt;75%</span>
        </div>

        {/* Map */}
        <div className="h-[500px] w-full rounded-md overflow-hidden border relative z-0">
          <MapContainer center={[12.8797, 121.774]} zoom={5} style={{ height: "100%", width: "100%" }} ref={mapRef}>
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

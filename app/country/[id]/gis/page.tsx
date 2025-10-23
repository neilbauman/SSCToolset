"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import "leaflet/dist/leaflet.css";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { RefreshCw, Trash2 } from "lucide-react";

import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import UploadGISModal from "@/components/country/UploadGISModal";
import type { CountryParams } from "@/app/country/types";
import type { GISLayer } from "@/types/gis";
import type { FeatureCollection } from "geojson";
import type { Map as LeafletMap } from "leaflet";

const MapContainer = dynamic(() => import("react-leaflet").then((m) => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import("react-leaflet").then((m) => m.TileLayer), { ssr: false });
const GeoJSON = dynamic(() => import("react-leaflet").then((m) => m.GeoJSON), { ssr: false });

export default function CountryGISPage({ params }: { params: CountryParams }) {
  const countryIso = params.id;
  const [layers, setLayers] = useState<GISLayer[]>([]);
  const [visible, setVisible] = useState<Record<string, boolean>>({});
  const [geojsonById, setGeojsonById] = useState<Record<string, FeatureCollection>>({});
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());
  const [openUpload, setOpenUpload] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const mapRef = useRef<LeafletMap | null>(null);

  // -------- Load GIS Layers --------
  const loadLayers = async () => {
    const { data, error } = await supabase
      .from("gis_layers")
      .select("*")
      .eq("country_iso", countryIso)
      .order("admin_level_int", { ascending: true });

    if (error) {
      console.error("Failed to load layers:", error);
      return;
    }

    const defaults: Record<string, boolean> = {};
    for (const l of data || []) {
      if ((l.admin_level || "").toUpperCase() === "ADM0") defaults[l.id] = true;
    }
    setLayers(data || []);
    setVisible(defaults);
  };

  useEffect(() => {
    loadLayers();
  }, [countryIso]);

  // -------- Fetch GeoJSON --------
  const fetchGeoJSON = async (layer: GISLayer) => {
    if (loadingIds.has(layer.id)) return;
    const bucket = layer.source?.bucket || "gis_raw";
    const path = layer.source?.path || layer.storage_path;
    if (!path) return;

    try {
      setLoadingIds((s) => new Set(s).add(layer.id));
      const { data } = supabase.storage.from(bucket).getPublicUrl(path);
      if (!data?.publicUrl) throw new Error("Missing public URL");

      const res = await fetch(data.publicUrl);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as FeatureCollection;

      if (json.type !== "FeatureCollection") throw new Error("Invalid GeoJSON type");
      setGeojsonById((m) => ({ ...m, [layer.id]: json }));
    } catch (err) {
      console.error("Failed to fetch GeoJSON:", err);
    } finally {
      setLoadingIds((s) => {
        const copy = new Set(s);
        copy.delete(layer.id);
        return copy;
      });
    }
  };

  // -------- Visibility Toggle --------
  const toggleVisible = (id: string, show: boolean) => {
    setVisible((m) => ({ ...m, [id]: show }));
    if (show && !geojsonById[id]) {
      const l = layers.find((x) => x.id === id);
      if (l) fetchGeoJSON(l);
    }
  };

  // -------- Refresh Metrics --------
  const refreshMetrics = async () => {
    setRefreshing(true);
    try {
      const { error } = await supabase.functions.invoke("compute-gis-metrics", {
        body: { country_iso: countryIso },
      });
      if (error) console.error("Metrics refresh failed:", error);
      await loadLayers();
    } catch (err) {
      console.error("Refresh error:", err);
    } finally {
      setRefreshing(false);
    }
  };

  // -------- Delete Layer --------
  const deleteLayer = async (layer: GISLayer) => {
    if (!confirm(`Delete layer "${layer.layer_name}"?`)) return;
    const { error } = await supabase.from("gis_layers").delete().eq("id", layer.id);
    if (error) return alert("Delete failed: " + error.message);
    setLayers((prev) => prev.filter((l) => l.id !== layer.id));
    setGeojsonById((m) => {
      const copy = { ...m };
      delete copy[layer.id];
      return copy;
    });
  };

  // -------- Map Centering --------
  useEffect(() => {
    const adm0 = layers.find((l) => (l.admin_level || "").toUpperCase() === "ADM0");
    if (!adm0) return;
    const fc = geojsonById[adm0.id];
    if (!fc || !mapRef.current) return;
    mapRef.current.setView([12.8797, 121.774], 5);
  }, [layers, geojsonById]);

  // -------- Render --------
  return (
    <SidebarLayout
      headerProps={{
        title: `${countryIso} – GIS Datasets`,
        group: "country-config",
        description: "Manage GIS layers, compute metrics, and visualize boundaries.",
        breadcrumbs: (
          <Breadcrumbs
            items={[
              { label: "Dashboard", href: "/dashboard" },
              { label: "Country Configuration", href: "/country" },
              { label: `${countryIso} GIS` },
            ]}
          />
        ),
      }}
    >
      <section className="mb-4">
        <div className="flex justify-between mb-2 items-center">
          <h3 className="text-base font-semibold">GIS Layers</h3>
          <div className="flex gap-2">
            <button
              onClick={() => setOpenUpload(true)}
              className="px-3 py-1.5 rounded bg-[#640811] text-white text-sm hover:opacity-90"
            >
              + Add GIS Layer
            </button>
            <button
              onClick={refreshMetrics}
              disabled={refreshing}
              className="flex items-center gap-2 px-3 py-1.5 text-sm rounded bg-[#640811] text-white hover:opacity-90"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
              Refresh Metrics
            </button>
          </div>
        </div>

        <div className="overflow-x-auto border rounded-lg">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 text-left">
              <tr>
                <th className="px-3 py-2">Level</th>
                <th className="px-3 py-2">Layer</th>
                <th className="px-3 py-2 text-right">Features</th>
                <th className="px-3 py-2 text-right">Avg Area (km²)</th>
                <th className="px-3 py-2 text-right">Centroid (Lat, Lon)</th>
                <th className="px-3 py-2 text-center">Visible</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {layers.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center text-gray-500 py-4 italic">
                    No GIS layers found. Upload one to get started.
                  </td>
                </tr>
              )}

              {layers.map((l) => (
                <tr key={l.id} className="border-t">
                  <td className="px-3 py-2">{l.admin_level || "—"}</td>
                  <td className="px-3 py-2">{l.layer_name}</td>
                  <td className="px-3 py-2 text-right">{l.feature_count ?? "—"}</td>
                  <td className="px-3 py-2 text-right">
                    {l.avg_area_sqkm ? l.avg_area_sqkm.toLocaleString() : "—"}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {l.centroid_lat && l.centroid_lon
                      ? `${l.centroid_lat.toFixed(3)}, ${l.centroid_lon.toFixed(3)}`
                      : "—"}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <input
                      type="checkbox"
                      checked={!!visible[l.id]}
                      onChange={(e) => toggleVisible(l.id, e.target.checked)}
                    />
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      onClick={() => deleteLayer(l)}
                      className="text-red-600 hover:opacity-80"
                    >
                      <Trash2 className="w-4 h-4 inline" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Map */}
      <section className="mt-6 border rounded-lg overflow-hidden">
        <MapContainer
          center={[12.8797, 121.774]}
          zoom={5}
          style={{ height: "600px", width: "100%" }}
          className="rounded-md z-0"
          ref={mapRef as any}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org">OSM</a>'
          />

          {layers.map((l) => {
            if (!visible[l.id]) return null;
            const data = geojsonById[l.id];
            if (!data) return null;

            const colors: Record<string, string> = {
              ADM0: "#044389",
              ADM1: "#8A2BE2",
              ADM2: "#228B22",
              ADM3: "#B22222",
              ADM4: "#FF8C00",
            };

            return (
              <GeoJSON
                key={l.id}
                data={data}
                style={{
                  color: colors[l.admin_level || ""] || "#630710",
                  weight: 1.2,
                }}
                onEachFeature={(f, layer) => {
                  const props = f.properties as any;
                  const name = props?.NAME_3 || props?.NAME || props?.name || "Unnamed";
                  const pcode = props?.PCODE || props?.pcode || "";
                  layer.bindPopup(
                    `<div style="font-size:12px"><strong>${name}</strong>${
                      pcode ? ` <span style="color:#666">(${pcode})</span>` : ""
                    }</div>`
                  );
                }}
              />
            );
          })}
        </MapContainer>
      </section>

      {openUpload && (
        <UploadGISModal
          open={openUpload}
          onClose={() => setOpenUpload(false)}
          countryIso={countryIso}
          onUploaded={loadLayers}
        />
      )}
    </SidebarLayout>
  );
}

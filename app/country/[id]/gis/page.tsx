"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import "leaflet/dist/leaflet.css";

import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import UploadGISModal from "@/components/country/UploadGISModal";
import { RefreshCw, Trash2 } from "lucide-react";

import type { CountryParams } from "@/app/country/types";
import type { GISLayer } from "@/types/gis";
import type { FeatureCollection } from "geojson";
import type { Map as LeafletMap } from "leaflet";

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

export default function CountryGISPage({ params }: { params: CountryParams }) {
  const countryIso = params.id;
  const [layers, setLayers] = useState<GISLayer[]>([]);
  const [geojsonById, setGeojsonById] = useState<Record<string, FeatureCollection>>({});
  const [visible, setVisible] = useState<Record<string, boolean>>({});
  const [openUpload, setOpenUpload] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const mapRef = useRef<LeafletMap | null>(null);

  // ---------- Load data ----------
  const loadData = async () => {
    const { data, error } = await supabase
      .from("gis_layers")
      .select(
        "id, country_iso, layer_name, admin_level, format, source, storage_path, feature_count, avg_area_sqkm, centroid_lat, centroid_lon, created_at"
      )
      .eq("country_iso", countryIso)
      .order("admin_level", { ascending: true });

    if (error) {
      console.error("❌ Failed to load GIS layers:", error);
      return;
    }

    const arr = (data || []).map((l) => {
      const bucket = (l.source as any)?.bucket || "gis_raw";
      const path =
        (l.source as any)?.path ||
        (l as any).storage_path ||
        (l as any).layer_name ||
        null;
      const { data: pub } = supabase.storage.from(bucket).getPublicUrl(path);
      const _publicUrl = pub?.publicUrl || null;
      return { ...l, _publicUrl };
    });

    setLayers(arr);
    const defaults: Record<string, boolean> = {};
    for (const l of arr) defaults[l.id] = (l.admin_level || "") === "ADM0";
    setVisible(defaults);
  };

  const resolvePublicUrl = (l: GISLayer): string | null => {
    const bucket = (l.source as any)?.bucket || "gis_raw";
    const path =
      (l.source as any)?.path ||
      (l as any).storage_path ||
      (l as any).layer_name ||
      null;
    if (!path) return null;
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data?.publicUrl ?? null;
  };

  const fetchGeo = async (l: GISLayer) => {
    const url = resolvePublicUrl(l);
    if (!url) return;
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as FeatureCollection;
      setGeojsonById((m) => ({ ...m, [l.id]: json }));
    } catch (err) {
      console.error("GeoJSON load failed:", l.layer_name, err);
    }
  };

  const toggleVisible = (l: GISLayer, next: boolean) => {
    setVisible((m) => ({ ...m, [l.id]: next }));
    if (next && !geojsonById[l.id]) fetchGeo(l);
  };

  const deleteLayer = async (id: string) => {
    if (!confirm("Delete this GIS layer and all its data?")) return;
    try {
      await supabase.from("gis_layers").delete().eq("id", id);
      console.log("🗑️ Deleted layer:", id);
      await loadData();
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  const refreshMetrics = async () => {
    setRefreshing(true);
    try {
      for (const l of layers) {
        const { data: metrics, error: rpcError } = await supabase.rpc(
          "compute_layer_metrics",
          { p_layer_id: l.id }
        );

        if (rpcError) {
          console.error("RPC error:", rpcError);
          continue;
        }

        const m = metrics?.[0];
        if (!m) continue;

        await supabase
          .from("gis_layers")
          .update({
            feature_count: m.feature_count,
            avg_area_sqkm: m.avg_area_sqkm,
            centroid_lat: m.avg_centroid_lat,
            centroid_lon: m.avg_centroid_lon,
            bounding_box: m.bounding_box,
            updated_at: new Date().toISOString(),
          })
          .eq("id", l.id);
      }

      alert("✅ GIS metrics refreshed successfully!");
      await loadData();
    } catch (err) {
      console.error("Failed to refresh metrics:", err);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [countryIso]);

  const visibleLayers = useMemo(() => layers.filter((l) => visible[l.id]), [layers, visible]);

  return (
    <SidebarLayout
      headerProps={{
        title: `${countryIso} – GIS Layers`,
        group: "country-config",
        description: "Upload and manage GIS data for this country.",
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
        <div className="flex items-center justify-between mb-3">
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
                <th className="px-3 py-2 w-[8%]">Level</th>
                <th className="px-3 py-2">Layer</th>
                <th className="px-3 py-2 w-[10%] text-right">Features</th>
                <th className="px-3 py-2 w-[12%] text-right">Avg Area (km²)</th>
                <th className="px-3 py-2 w-[14%] text-right">Centroid (Lat, Lon)</th>
                <th className="px-3 py-2 w-[8%]">Visible</th>
                <th className="px-3 py-2 w-[10%] text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {layers.map((l) => (
                <tr key={l.id} className="border-t">
                  <td className="px-3 py-2">{l.admin_level || "—"}</td>
                  <td className="px-3 py-2 font-medium text-[#640811]">{l.layer_name}</td>
                  <td className="px-3 py-2 text-right">
                    {l.feature_count ?? "—"}
                  </td>
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
                      onChange={(e) => toggleVisible(l, e.target.checked)}
                    />
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      className="text-red-600 hover:underline"
                      onClick={() => deleteLayer(l.id)}
                    >
                      <Trash2 className="w-4 h-4 inline-block" />
                    </button>
                  </td>
                </tr>
              ))}
              {layers.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-3 py-4 text-center text-gray-500 italic"
                  >
                    No GIS layers found. Upload one to get started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Map */}
      <section className="mt-4">
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

          {visibleLayers.map((l) => {
            const data = geojsonById[l.id];
            if (!data) {
              fetchGeo(l);
              return null;
            }

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
                  color: colors[l.admin_level || ""] || "#640811",
                  weight: 1.2,
                }}
                onEachFeature={(f, layer) => {
                  const props = f.properties || {};
                  const name =
                    props.NAME_3 || props.NAME_2 || props.name || "Unnamed";
                  const pcode = props.PCODE || props.pcode || "";
                  layer.bindPopup(
                    `<div style="font-size:12px">
                      <strong>${name}</strong>${
                      pcode ? ` <span style="color:#666">(${pcode})</span>` : ""
                    }
                    </div>`
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
          onUploaded={loadData}
        />
      )}
    </SidebarLayout>
  );
}

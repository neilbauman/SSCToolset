"use client";

import { useEffect, useState, useRef } from "react";
import dynamic from "next/dynamic";
import "leaflet/dist/leaflet.css";

import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { Loader2, RefreshCw } from "lucide-react";

const MapContainer = dynamic(() => import("react-leaflet").then((m) => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import("react-leaflet").then((m) => m.TileLayer), { ssr: false });
const GeoJSON = dynamic(() => import("react-leaflet").then((m) => m.GeoJSON), { ssr: false });

type Layer = {
  id: string;
  country_iso: string;
  layer_name: string;
  format: string;
  crs?: string;
  is_active: boolean;
  admin_level?: string;
  created_at: string;
  source?: any;
  _publicUrl?: string | null;
};

export default function CountryGISDevPage({ params }: { params: { id: string } }) {
  const iso = params.id.toUpperCase();
  const [layers, setLayers] = useState<Layer[]>([]);
  const [geojsonById, setGeojsonById] = useState<Record<string, any>>({});
  const [visible, setVisible] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const mapRef = useRef<any>(null);

  const resolvePublicUrl = (l: Layer) => {
    const bucket = (l.source as any)?.bucket || "gis_raw";
    const rawPath =
      (l.source as any)?.path || (l as any).storage_path || (l as any).path;
    if (!rawPath) return null;
    const { data } = supabase.storage.from(bucket).getPublicUrl(rawPath);
    return data?.publicUrl ?? null;
  };

  const fetchGeo = async (l: Layer) => {
    const url = l._publicUrl ?? resolvePublicUrl(l);
    if (!url) return;
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json.type === "FeatureCollection") {
        setGeojsonById((m) => ({ ...m, [l.id]: json }));
      }
    } catch (err) {
      console.error("GeoJSON load failed:", l.layer_name, err);
    }
  };

  const loadLayers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("gis_layers")
      .select("*")
      .eq("country_iso", iso)
      .order("created_at", { ascending: false });
    if (!error && data) {
      const arr = data.map((x: any) => ({
        ...x,
        _publicUrl: resolvePublicUrl(x),
      }));
      setLayers(arr);
      const vis: Record<string, boolean> = {};
      for (const l of arr) vis[l.id] = (l.admin_level || "") === "ADM0";
      setVisible(vis);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadLayers();
  }, [iso]);

  const refreshMetrics = async () => {
    setRefreshing(true);
    try {
      const { data, error } = await supabase.functions.invoke("compute-gis-metrics", {
        body: { country_iso: iso },
      });
      if (error) throw error;
      console.log("✅ metrics recomputed", data);
      await loadLayers();
    } catch (e) {
      console.error("❌ metric refresh failed:", e);
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <SidebarLayout
      headerProps={{
        title: `${iso} – GIS Layers (DEV mode)`,
        group: "country-config",
        description:
          "Lists all GIS layers for this country (versioning bypassed for testing).",
        breadcrumbs: (
          <Breadcrumbs
            items={[
              { label: "Dashboard", href: "/dashboard" },
              { label: "Country Configuration", href: "/country" },
              { label: `${iso} GIS` },
            ]}
          />
        ),
      }}
    >
      {/* GIS Layers Section */}
<section className="mb-4">
  <div className="flex items-center justify-between mb-2">
    <h3 className="text-base font-semibold">GIS Layers</h3>

    <div className="flex gap-2">
      {/* Refresh Metrics */}
      <button
        onClick={refreshMetrics}
        className="flex items-center gap-2 px-3 py-1.5 text-sm rounded bg-[#640811] text-white hover:opacity-90"
      >
        <RefreshCw
          className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`}
        />
        Refresh Metrics
      </button>

      {/* Add GIS Layer */}
      <button
        onClick={() => setOpenUpload(true)}
        className="px-3 py-1.5 rounded bg-[#640811] text-white text-sm hover:opacity-90"
      >
        + Add GIS Layer
      </button>
    </div>
  </div>

  <div className="overflow-x-auto border rounded-lg">
    <table className="w-full text-sm">
      <thead className="bg-gray-100 text-left">
        <tr>
          <th className="px-3 py-2 w-[10%]">Level</th>
          <th className="px-3 py-2">Layer Name</th>
          <th className="px-3 py-2 w-[12%]">Format</th>
          <th className="px-3 py-2 w-[12%]">CRS</th>
          <th className="px-3 py-2 w-[12%]">Features</th>
          <th className="px-3 py-2 w-[10%]">Visible</th>
          <th className="px-3 py-2 w-[14%] text-right">Actions</th>
        </tr>
      </thead>
      <tbody>
        {layers.map((l) => {
          const pub = l._publicUrl ?? resolvePublicUrl(l);
          const count =
            typeof l.feature_count === "number"
              ? l.feature_count
              : geojsonById[l.id]?.features?.length ?? 0;
          return (
            <tr key={l.id} className="border-t">
              <td className="px-3 py-2">{l.admin_level || "—"}</td>
              <td className="px-3 py-2">
                {pub ? (
                  <a
                    href={pub}
                    className="text-blue-700 hover:underline"
                    target="_blank"
                    rel="noreferrer"
                  >
                    {l.layer_name}
                  </a>
                ) : (
                  l.layer_name
                )}
              </td>
              <td className="px-3 py-2">{l.format || "—"}</td>
              <td className="px-3 py-2">{l.crs || "—"}</td>
              <td className="px-3 py-2">{count || "—"}</td>
              <td className="px-3 py-2">
                <input
                  type="checkbox"
                  checked={!!visible[l.id]}
                  onChange={(e) => toggleVisible(l, e.target.checked)}
                />
              </td>
              <td className="px-3 py-2 text-right">
                <button
                  className="text-blue-600 hover:underline mr-3"
                  onClick={() => setEditingLayer(l)}
                >
                  Edit
                </button>
              </td>
            </tr>
          );
        })}
        {layers.length === 0 && (
          <tr>
            <td
              colSpan={7}
              className="px-3 py-4 text-center text-gray-500 italic"
            >
              No layers currently uploaded.
              <button
                className="ml-2 px-2 py-1 rounded bg-[#640811] text-white text-xs"
                onClick={() => setOpenUpload(true)}
              >
                + Add GIS Layer
              </button>
            </td>
          </tr>
        )}
      </tbody>
    </table>
  </div>
</section>

      <section className="mt-6 border rounded-lg overflow-hidden">
        <MapContainer
          center={[12.8797, 121.774]}
          zoom={5}
          style={{ height: "600px", width: "100%" }}
          ref={mapRef}
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
              ADM5: "#2F4F4F",
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
                  const name =
                    (f.properties as any)?.name ||
                    (f.properties as any)?.NAME_3 ||
                    (f.properties as any)?.ADM3_EN ||
                    "Unnamed";
                  const pcode =
                    (f.properties as any)?.pcode ||
                    (f.properties as any)?.PCODE ||
                    "";
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
    </SidebarLayout>
  );
}

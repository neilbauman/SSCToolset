"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import "leaflet/dist/leaflet.css";
import { Trash2, RefreshCw, UploadCloud } from "lucide-react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";

import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import UploadGISModal from "@/components/country/UploadGISModal";
import GISDataHealthPanel from "@/components/country/GISDataHealthPanel";

import type { CountryParams } from "@/app/country/types";
import type { GISLayer } from "@/types/gis";
import type { FeatureCollection } from "geojson";
import type { Map as LeafletMap } from "leaflet";

const MapContainer = dynamic(() => import("react-leaflet").then((m) => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import("react-leaflet").then((m) => m.TileLayer), { ssr: false });
const GeoJSON = dynamic(() => import("react-leaflet").then((m) => m.GeoJSON), { ssr: false });

type LayerWithRuntime = GISLayer & {
  _publicUrl?: string | null;
  feature_count?: number;
};

export default function CountryGISPage({ params }: { params: CountryParams }) {
  const countryIso = params.id;
  const [layers, setLayers] = useState<LayerWithRuntime[]>([]);
  const [geojsonById, setGeojsonById] = useState<Record<string, FeatureCollection>>({});
  const [visible, setVisible] = useState<Record<string, boolean>>({});
  const [openUpload, setOpenUpload] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const mapRef = useRef<LeafletMap | null>(null);

  // Resolve Supabase storage public URL
  const resolvePublicUrl = (l: LayerWithRuntime): string | null => {
    const bucket = (l.source as any)?.bucket || "gis_raw";
    const rawPath =
      (l.source as any)?.path || (l as any).path || (l as any).storage_path || null;
    if (!rawPath) return null;
    const { data } = supabase.storage.from(bucket).getPublicUrl(rawPath);
    return data?.publicUrl ?? null;
  };

  // Fetch and preview GeoJSON
  const fetchGeo = async (l: LayerWithRuntime) => {
    const url = l._publicUrl ?? resolvePublicUrl(l);
    if (!url) return;
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as FeatureCollection;
      setGeojsonById((m) => ({ ...m, [l.id]: json }));
      setLayers((arr) =>
        arr.map((x) =>
          x.id === l.id ? { ...x, feature_count: json.features?.length ?? 0 } : x
        )
      );
    } catch (err) {
      console.error("GeoJSON load failed:", l.layer_name, err);
    }
  };

  // Reload all GIS layers
  const reloadAll = async () => {
    setRefreshing(true);
    try {
      const { data } = await supabase
        .from("gis_layers")
        .select("*")
        .eq("country_iso", countryIso)
        .order("created_at", { ascending: false });

      const arr: LayerWithRuntime[] = (data || []).map((x) => ({
        ...x,
        _publicUrl: resolvePublicUrl(x as any),
      })) as any;

      setLayers(arr);
      const defaults: Record<string, boolean> = {};
      for (const l of arr) defaults[l.id] = (l.admin_level || "") === "ADM0";
      setVisible(defaults);

      const adm0 = arr.find((l) => l.admin_level === "ADM0");
      if (adm0) await fetchGeo(adm0);
    } catch (err) {
      console.error("Reload error:", err);
    } finally {
      setRefreshing(false);
    }
  };

  // Delete layer using RPC
  const handleDelete = async (layer: LayerWithRuntime) => {
    if (!confirm(`Delete layer "${layer.layer_name}" and all related data?`)) return;

    try {
      // 1️⃣ Remove file from storage if it exists
      const bucket = "gis_raw";
      const path =
        (layer.source as any)?.path ||
        (layer as any).path ||
        (layer as any).storage_path;
      if (path) {
        await supabase.storage.from(bucket).remove([path]);
      }

      // 2️⃣ RPC to cascade delete from DB
      const { error } = await supabase.rpc("delete_gis_layer_cascade", {
        p_layer_id: layer.id,
      });
      if (error) throw error;

      alert(`🗑️ Deleted "${layer.layer_name}" successfully`);
      reloadAll();
    } catch (err: any) {
      console.error("❌ Delete failed:", err);
      alert("Delete failed: " + err.message);
    }
  };

  useEffect(() => {
    reloadAll();
  }, [countryIso]);

  return (
    <SidebarLayout
      headerProps={{
        title: `${countryIso} – GIS Datasets`,
        group: "country-config",
        description: "Upload, preview, and manage GIS layers for this country.",
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
      {/* ---- Controls ---- */}
      <section className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-base font-semibold">GIS Layers</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => reloadAll()}
              className="flex items-center gap-1 px-3 py-1.5 rounded bg-[#044389] text-white text-sm hover:opacity-90"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </button>
            <button
              onClick={() => setOpenUpload(true)}
              className="flex items-center gap-1 px-3 py-1.5 rounded bg-[#640811] text-white text-sm hover:opacity-90"
            >
              <UploadCloud className="w-4 h-4" />
              Upload
            </button>
          </div>
        </div>

        <div className="overflow-x-auto border rounded-lg">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 text-left">
              <tr>
                <th className="px-3 py-2 w-[10%]">Level</th>
                <th className="px-3 py-2">Layer Name</th>
                <th className="px-3 py-2 w-[10%]">Format</th>
                <th className="px-3 py-2 w-[12%]">Features</th>
                <th className="px-3 py-2 w-[10%]">Visible</th>
                <th className="px-3 py-2 w-[10%] text-right">Actions</th>
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
                    <td className="px-3 py-2">{count || "—"}</td>
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={!!visible[l.id]}
                        onChange={(e) =>
                          setVisible((m) => ({ ...m, [l.id]: e.target.checked }))
                        }
                      />
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button
                        className="text-red-600 hover:underline"
                        onClick={() => handleDelete(l)}
                        title="Delete Layer"
                      >
                        <Trash2 className="w-4 h-4 inline-block" />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {layers.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-3 py-4 text-center text-gray-500 italic"
                  >
                    No GIS layers found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ---- Map ---- */}
      <section className="mt-4 border rounded-lg overflow-hidden">
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
                  color: colors[l.admin_level || ""] || "#630710",
                  weight: 1.2,
                }}
              />
            );
          })}
        </MapContainer>
      </section>

      {/* ---- Upload Modal ---- */}
      {openUpload && (
        <UploadGISModal
          open={openUpload}
          onClose={() => setOpenUpload(false)}
          countryIso={countryIso}
          onUploaded={reloadAll}
        />
      )}
    </SidebarLayout>
  );
}

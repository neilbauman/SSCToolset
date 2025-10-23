"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import SidebarLayout from "@/components/layouts/SidebarLayout";
import PageBreadcrumbs from "@/components/common/PageBreadcrumbs"; // adjust import if yours differs

import type { FeatureCollection, Geometry } from "geojson";
import type { CountryParams } from "@/app/country/types";
import type { GISLayer } from "@/types/gis";

// import Leaflet css once if you didn't add in layout.tsx:
// import "leaflet/dist/leaflet.css";

// React-Leaflet (client-side only)
const MapContainer = dynamic(() => import("react-leaflet").then(m => m.MapContainer), { ssr: false });
const TileLayer     = dynamic(() => import("react-leaflet").then(m => m.TileLayer), { ssr: false });
const GeoJSON       = dynamic(() => import("react-leaflet").then(m => m.GeoJSON), { ssr: false });
const useMap        = dynamic(() => import("react-leaflet").then(m => m.useMap), { ssr: false });

type VisibleMap = Record<string, boolean>;
type GeoStore   = Record<string, FeatureCollection<Geometry>>;

function MapController({
  bounds,
  onMount,
}: {
  bounds: [number, number][];
  onMount?: (map: any) => void;
}) {
  // @ts-expect-error: loaded dynamically
  const map = useMap();
  useEffect(() => {
    if (!map) return;

    // Hand back a reference the first time
    onMount?.(map);

    // Ensure tiles layout after hydration / container resize
    const ro = new ResizeObserver(() => map.invalidateSize());
    const el = map.getContainer();
    ro.observe(el);
    // first tick also helps in Next hydration cases
    setTimeout(() => map.invalidateSize(), 200);

    return () => ro.disconnect();
  }, [map, onMount]);

  useEffect(() => {
    if (!map || bounds.length === 0) return;
    map.fitBounds(bounds, { padding: [20, 20] });
  }, [map, bounds]);

  return null;
}

export default function GISPage({ params }: { params: CountryParams }) {
  const countryIso = params.id;

  const [layers, setLayers] = useState<GISLayer[]>([]);
  const [visible, setVisible] = useState<VisibleMap>({});
  const [geojsonById, setGeojsonById] = useState<GeoStore>({});
  const mapRef = useRef<any>(null);

  // ──────────────────────────────────────────────
  // Data
  // ──────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("gis_layers")
        .select("id, country_iso, layer_name, admin_level, feature_count, avg_area_sqkm, centroid_lat, centroid_lon, source")
        .eq("country_iso", countryIso)
        .order("admin_level", { ascending: true });

      if (error) {
        console.error("Failed to load layers", error.message);
        return;
      }

      const typed = (data ?? []).map((l) => ({
        id: l.id,
        country_iso: l.country_iso,
        layer_name: l.layer_name,
        admin_level: l.admin_level,
        feature_count: l.feature_count ?? null,
        avg_area_sqkm: l.avg_area_sqkm ?? null,
        centroid_lat: l.centroid_lat ?? null,
        centroid_lon: l.centroid_lon ?? null,
        source: l.source ?? null,
      })) as GISLayer[];

      setLayers(typed);
    })();
  }, [countryIso]);

  // ──────────────────────────────────────────────
  // Visibility & loading
  // ──────────────────────────────────────────────
  const toggleLayer = async (layer: GISLayer) => {
    const id = layer.id;
    const next = !visible[id];

    setVisible((v) => ({ ...v, [id]: next }));

    if (next && !geojsonById[id]) {
      try {
        const bucket = layer.source?.bucket ?? "gis_raw";
        const path   = layer.source?.path   ?? layer.layer_name;
        const { data, error } = await supabase.storage.from(bucket).download(path);
        if (error) throw error;
        if (!data) return;

        const text = await data.text();
        const gj   = JSON.parse(text) as FeatureCollection<Geometry>;
        setGeojsonById((g) => ({ ...g, [id]: gj }));
      } catch (e) {
        console.error("Failed to load GeoJSON:", e);
      }
    }
  };

  // Compute bounds of all visible layers
  const bounds = useMemo<[number, number][]>(() => {
    const coords: [number, number][] = [];

    Object.entries(geojsonById).forEach(([id, gj]) => {
      if (!visible[id]) return;
      for (const f of gj.features ?? []) {
        const g = f.geometry;
        if (!g) continue;
        if (g.type === "Polygon" || g.type === "MultiPolygon") {
          // flatten to coordinate pairs [lng, lat] -> convert to [lat, lng]
          const raw = (g as any).coordinates.flat(2) as number[][];
          raw.forEach((c) => {
            if (Array.isArray(c) && c.length === 2) coords.push([c[1], c[0]]);
          });
        }
      }
    });

    if (!coords.length) return [];
    const lats = coords.map((c) => c[0]);
    const lngs = coords.map((c) => c[1]);
    return [
      [Math.min(...lats), Math.min(...lngs)],
      [Math.max(...lats), Math.max(...lngs)],
    ];
  }, [geojsonById, visible]);

  // ──────────────────────────────────────────────
  // Delete (DB + Storage via RPC)
  // ──────────────────────────────────────────────
  const onDelete = async (layer: GISLayer) => {
    if (!confirm(`Delete layer "${layer.layer_name}"?`)) return;
    try {
      // remove storage file if we have a source
      const bucket = layer.source?.bucket ?? "gis_raw";
      const path   = layer.source?.path   ?? layer.layer_name;
      if (bucket && path) await supabase.storage.from(bucket).remove([path]);

      // cascade delete in DB (you already created the RPC)
      const { error } = await supabase.rpc("delete_gis_layer_cascade", { p_id: layer.id });
      if (error) throw error;

      // refresh list
      setLayers((prev) => prev.filter((l) => l.id !== layer.id));
      setVisible((v) => {
        const n = { ...v };
        delete n[layer.id];
        return n;
      });
      setGeojsonById((g) => {
        const n = { ...g };
        delete n[layer.id];
        return n;
      });
    } catch (e: any) {
      alert("Failed to delete layer: " + e.message);
    }
  };

  // ──────────────────────────────────────────────
  // Render
  // ──────────────────────────────────────────────
  return (
    <SidebarLayout
      headerProps={{
        title: `${countryIso.toUpperCase()} – GIS Layers`,
        group: "country-config",
        breadcrumbs: (
          <PageBreadcrumbs
            items={[
              { label: "Home", href: "/" },
              { label: countryIso.toUpperCase(), href: `/country/${countryIso}` },
              { label: "GIS", href: `/country/${countryIso}/gis` },
            ]}
          />
        ),
        description: "Upload, inspect, and visualize administrative boundary layers.",
      }}
    >
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
                      onClick={() => onDelete(l)}
                      className="text-red-600 hover:text-red-800"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Map */}
      <div className="h-[560px] w-full rounded-md overflow-hidden border">
        {/* key helps avoid hydration hiccups on first load */}
        <MapContainer
          key="gis-map"
          center={[12.8797, 121.774]} // PH fallback
          zoom={5}
          className="h-full w-full"
          // ref prop works fine in v5
          ref={mapRef}
        >
          <TileLayer
            attribution='&copy; <a href="https://osm.org">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Bounds + invalidateSize controller */}
          <MapController
            // when nothing visible, controller does nothing
            bounds={bounds}
            onMount={(m) => {
              mapRef.current = m;
              // extra safety after SSR hydration
              setTimeout(() => m.invalidateSize(), 150);
            }}
          />

          {Object.entries(geojsonById).map(([id, gj]) =>
            visible[id] ? (
              // @ts-expect-error: react-leaflet accepts FeatureCollection
              <GeoJSON key={id} data={gj} style={{ color: "#640811", weight: 1 }} />
            ) : null
          )}
        </MapContainer>
      </div>
    </SidebarLayout>
  );
}

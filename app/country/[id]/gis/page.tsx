"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { FeatureCollection, Geometry, Position } from "geojson";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";

// React-Leaflet: components may be dynamic; hooks must be static imports.
import { useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";

// Components dynamically (no SSR)
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

type CountryParams = { id: string };

type GISLayer = {
  id: string;
  country_iso: string;
  layer_name: string;
  admin_level: string | null;
  feature_count?: number | null;
  avg_area_sqkm?: number | null;
  unique_pcodes?: number | null;
  missing_names?: number | null;
  source?: string | null;
};

type VisibleMap = Record<string, boolean>;
type GeoStore = Record<string, FeatureCollection<Geometry>>;

// simple ISO→Name map so the breadcrumb shows “Philippines”
const COUNTRY_NAMES: Record<string, string> = {
  PH: "Philippines",
};

function normalizeToFeatureCollection(input: any): FeatureCollection<Geometry> {
  // Accept FeatureCollection directly
  if (input && input.type === "FeatureCollection") return input;

  // Accept array of Features as FC
  if (Array.isArray(input?.features)) {
    return {
      type: "FeatureCollection",
      features: input.features as any,
    } as FeatureCollection<Geometry>;
  }

  // Accept single Feature or Geometry
  if (input?.type === "Feature") {
    return {
      type: "FeatureCollection",
      features: [input],
    } as FeatureCollection<Geometry>;
  }
  if (input?.type && typeof input.type === "string") {
    return {
      type: "FeatureCollection",
      features: [{ type: "Feature", properties: {}, geometry: input }],
    } as FeatureCollection<Geometry>;
  }

  // Fallback to empty FC
  return { type: "FeatureCollection", features: [] };
}

function extractAllLngLat(fc: FeatureCollection<Geometry>): [number, number][] {
  const coords: [number, number][] = [];

  function walkPositions(pos: Position | Position[] | Position[][] | Position[][][]) {
    if (!pos) return;
    if (typeof pos[0] === "number") {
      const p = pos as Position; // [lng, lat]
      if (p.length >= 2 && Number.isFinite(p[0]) && Number.isFinite(p[1])) {
        coords.push([p[0] as number, p[1] as number]);
      }
    } else {
      (pos as any[]).forEach(walkPositions);
    }
  }

  for (const f of fc.features) {
    const g = f.geometry as any;
    if (!g) continue;
    // handle Point/Line/Poly/Multi*
    if (g.coordinates) walkPositions(g.coordinates);
  }

  return coords;
}

function lngLatToLatLngBounds(lngLat: [number, number][]) {
  // Leaflet expects [lat, lng]
  const latLngs = lngLat.map(([lng, lat]) => [lat, lng] as [number, number]);
  let minLat = 90, minLng = 180, maxLat = -90, maxLng = -180;
  for (const [lat, lng] of latLngs) {
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
  }
  if (latLngs.length === 0) {
    // default small box around 0,0 if empty
    return [[-0.01, -0.01], [0.01, 0.01]] as [[number, number], [number, number]];
  }
  return [[minLat, minLng], [maxLat, maxLng]] as [[number, number], [number, number]];
}

function MapFitter({
  bounds,
}: {
  bounds: [[number, number], [number, number]] | null;
}) {
  const map = useMap();
  useEffect(() => {
    if (!bounds) return;
    // fit with padding
    map.fitBounds(bounds, { padding: [24, 24] });
    // after first render, ensure proper size
    setTimeout(() => map.invalidateSize(), 200);
  }, [bounds, map]);
  return null;
}

export default function GISPage({ params }: { params: CountryParams }) {
  const countryIso = params.id.toUpperCase();
  const countryName = COUNTRY_NAMES[countryIso] ?? countryIso;

  const [layers, setLayers] = useState<GISLayer[]>([]);
  const [visible, setVisible] = useState<VisibleMap>({});
  const [geojsonById, setGeojsonById] = useState<GeoStore>({});
  const [loadingIds, setLoadingIds] = useState<Record<string, boolean>>({});
  const [deletingIds, setDeletingIds] = useState<Record<string, boolean>>({});

  // adjust these endpoints if yours differ
  const LIST_URL = `/api/country/${countryIso}/gis/layers`;
  const GEOJSON_URL = (id: string) => `/api/country/${countryIso}/gis/layers/${id}/data`;
  const DELETE_URL = (id: string) => `/api/country/${countryIso}/gis/layers/${id}`;

  // load layers
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(LIST_URL, { cache: "no-store" });
        if (!res.ok) throw new Error(await res.text());
        const data = (await res.json()) as GISLayer[];
        if (cancelled) return;
        setLayers(Array.isArray(data) ? data : []);
        // default: all visible
        const initVis: VisibleMap = {};
        data.forEach((l) => (initVis[l.id] = true));
        setVisible(initVis);
      } catch (e) {
        console.error("Failed to load layers", e);
        setLayers([]);
        setVisible({});
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countryIso]);

  // load geojson when a layer toggles on and isn’t cached
  useEffect(() => {
    const idsToFetch = Object.entries(visible)
      .filter(([id, v]) => v && !geojsonById[id])
      .map(([id]) => id);

    idsToFetch.forEach(async (id) => {
      setLoadingIds((s) => ({ ...s, [id]: true }));
      try {
        const res = await fetch(GEOJSON_URL(id), { cache: "no-store" });
        if (!res.ok) throw new Error(await res.text());
        const raw = await res.json();
        const fc = normalizeToFeatureCollection(raw);
        setGeojsonById((s) => ({ ...s, [id]: fc }));
      } catch (e) {
        console.error("Failed fetching geojson for layer", id, e);
      } finally {
        setLoadingIds((s) => {
          const { [id]: _, ...rest } = s;
          return rest;
        });
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // compute combined bounds of all visible, loaded layers
  const combinedBounds = useMemo(() => {
    const allLngLat: [number, number][] = [];
    for (const [id, fc] of Object.entries(geojsonById)) {
      if (!visible[id]) continue;
      allLngLat.push(...extractAllLngLat(fc));
    }
    if (allLngLat.length === 0) return null;
    return lngLatToLatLngBounds(allLngLat);
  }, [geojsonById, visible]);

  const toggleVisible = (id: string) =>
    setVisible((s) => ({ ...s, [id]: !s[id] }));

  const deleteLayer = async (id: string) => {
    if (!confirm("Delete this layer? This will also remove any stored files.")) return;
    setDeletingIds((s) => ({ ...s, [id]: true }));
    try {
      const res = await fetch(DELETE_URL(id), { method: "DELETE" });
      if (!res.ok) throw new Error(await res.text());

      // remove from lists/caches
      setLayers((ls) => ls.filter((l) => l.id !== id));
      setVisible((v) => {
        const nv = { ...v };
        delete nv[id];
        return nv;
      });
      setGeojsonById((g) => {
        const ng = { ...g };
        delete ng[id];
        return ng;
      });
    } catch (e) {
      console.error("Delete failed", e);
      alert("Failed to delete layer. Check server logs.");
    } finally {
      setDeletingIds((s) => {
        const { [id]: _, ...rest } = s;
        return rest;
      });
    }
  };

  const breadcrumbs = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/country", label: "Country Configuration" },
    { href: `/country/${countryIso}`, label: countryName },
    { href: `/country/${countryIso}/gis`, label: "GIS" },
  ];

  return (
    <SidebarLayout
      headerProps={{
        title: `${countryName} — GIS Layers`,
        group: "country-config",
        breadcrumbs: <Breadcrumbs items={breadcrumbs} />,
      }}
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-200px)]">
        {/* Left: table & controls */}
        <div className="lg:col-span-5 flex flex-col min-h-0">
          <div className="flex-1 overflow-auto rounded-lg border border-gray-200">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  <th className="px-3 py-2 text-left w-10">View</th>
                  <th className="px-3 py-2 text-left">Layer</th>
                  <th className="px-3 py-2 text-right">Features</th>
                  <th className="px-3 py-2 text-right">Avg km²</th>
                  <th className="px-3 py-2 text-right">Unique Pcodes</th>
                  <th className="px-3 py-2 text-right">Missing Names</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {layers.map((l) => (
                  <tr key={l.id} className="border-t">
                    <td className="px-3 py-2 align-top">
                      <input
                        aria-label={`toggle ${l.layer_name}`}
                        type="checkbox"
                        className="h-4 w-4"
                        checked={!!visible[l.id]}
                        onChange={() => toggleVisible(l.id)}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <div className="font-medium">{l.layer_name}</div>
                      <div className="text-xs text-gray-500">
                        {l.admin_level ?? "—"} {l.source ? `• ${l.source}` : ""}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right">
                      {l.feature_count ?? "—"}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {l.avg_area_sqkm ?? "—"}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {l.unique_pcodes ?? "—"}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {l.missing_names ?? "—"}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button
                        className="px-2 py-1 rounded border text-red-700 border-red-200 hover:bg-red-50 disabled:opacity-50"
                        onClick={() => deleteLayer(l.id)}
                        disabled={!!deletingIds[l.id]}
                      >
                        {deletingIds[l.id] ? "Deleting…" : "Delete"}
                      </button>
                    </td>
                  </tr>
                ))}
                {layers.length === 0 && (
                  <tr>
                    <td className="px-3 py-6 text-center text-gray-500" colSpan={7}>
                      No layers found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-3 text-xs text-gray-500">
            Tip: If a layer is toggled on and doesn’t appear, ensure the API returns a valid
            GeoJSON FeatureCollection. Both <code>.json</code> and <code>.geojson</code> are supported.
          </div>
        </div>

        {/* Right: map */}
        <div className="lg:col-span-7 min-h-80 h-full">
          <div className="h-full rounded-lg overflow-hidden border border-gray-200">
            <MapContainer
              center={[12.8797, 121.7740]} // Philippines center as a default
              zoom={5}
              ref={undefined} // ref handled by controller
              style={{ height: "100%", width: "100%" }}
            >
              <TileLayer
                attribution='&copy; <a href="https://osm.org">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {/* Fit to visible layers */}
              <MapFitter bounds={combinedBounds} />

              {/* Render visible layers */}
              {Object.entries(geojsonById).map(([id, gj]) =>
                visible[id] ? (
                  <GeoJSON key={id} data={gj as any} /* typing is compatible */ />
                ) : null
              )}
            </MapContainer>
          </div>
        </div>
      </div>
    </SidebarLayout>
  );
}

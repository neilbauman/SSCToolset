"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import type { FeatureCollection, Geometry } from "geojson";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";

// React-Leaflet components (no SSR)
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
};

type VisibleMap = Record<string, boolean>;
type GeoStore = Record<string, FeatureCollection<Geometry>>;

function normalizeToFeatureCollection(input: any): FeatureCollection<Geometry> {
  if (input?.type === "FeatureCollection") return input;
  if (input?.type === "Feature")
    return { type: "FeatureCollection", features: [input] } as FeatureCollection<Geometry>;
  if (Array.isArray(input?.features))
    return { type: "FeatureCollection", features: input.features } as FeatureCollection<Geometry>;
  return { type: "FeatureCollection", features: [] };
}

function extractAllCoords(fc: FeatureCollection<Geometry>): [number, number][] {
  const coords: [number, number][] = [];
  const walk = (x: any) => {
    if (!x) return;
    if (typeof x[0] === "number") coords.push(x as [number, number]);
    else if (Array.isArray(x)) x.forEach(walk);
  };
  fc.features.forEach((f) => f.geometry && walk((f.geometry as any).coordinates));
  return coords;
}

function boundsFromCoords(coords: [number, number][]) {
  if (!coords.length) return null;
  let minLat = 90, maxLat = -90, minLng = 180, maxLng = -180;
  coords.forEach(([lng, lat]) => {
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
  });
  return [[minLat, minLng], [maxLat, maxLng]] as [[number, number], [number, number]];
}

function FitToBounds({ bounds }: { bounds: [[number, number], [number, number]] | null }) {
  const map = useMap();
  useEffect(() => {
    if (bounds) {
      map.fitBounds(bounds, { padding: [24, 24] });
      setTimeout(() => map.invalidateSize(), 200);
    }
  }, [bounds, map]);
  return null;
}

export default function GISPage({ params }: { params: CountryParams }) {
  const countryIso = params.id.toUpperCase();

  const [layers, setLayers] = useState<GISLayer[]>([]);
  const [visible, setVisible] = useState<VisibleMap>({});
  const [geojsonById, setGeojsonById] = useState<GeoStore>({});

  const listUrl = `/api/country/${countryIso}/gis/layers`;
  const dataUrl = (id: string) => `/api/country/${countryIso}/gis/layers/${id}/data`;

  useEffect(() => {
    (async () => {
      const res = await fetch(listUrl);
      if (!res.ok) return;
      const data = (await res.json()) as GISLayer[];
      setLayers(data);
      const vis: VisibleMap = {};
      data.forEach((l) => (vis[l.id] = true));
      setVisible(vis);
    })();
  }, [countryIso]);

  useEffect(() => {
    const ids = Object.entries(visible)
      .filter(([id, v]) => v && !geojsonById[id])
      .map(([id]) => id);
    ids.forEach(async (id) => {
      const res = await fetch(dataUrl(id));
      if (!res.ok) return;
      const raw = await res.json();
      const fc = normalizeToFeatureCollection(raw);
      setGeojsonById((s) => ({ ...s, [id]: fc }));
    });
  }, [visible]);

  const combinedBounds = useMemo(() => {
    const all: [number, number][] = [];
    for (const [id, fc] of Object.entries(geojsonById)) {
      if (!visible[id]) continue;
      all.push(...extractAllCoords(fc));
    }
    return all.length ? boundsFromCoords(all) : null;
  }, [geojsonById, visible]);

  const toggleVisible = (id: string) =>
    setVisible((s) => ({ ...s, [id]: !s[id] }));

  const breadcrumbs = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/country", label: "Country Configuration" },
    { href: `/country/${countryIso}`, label: countryIso },
    { href: `/country/${countryIso}/gis`, label: "GIS" },
  ];

  return (
    <SidebarLayout
      headerProps={{
        title: `${countryIso} — GIS Layers`,
        group: "country-config",
        breadcrumbs: <Breadcrumbs items={breadcrumbs} />,
      }}
    >
      {/* Layer List */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden mb-6">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left w-10">View</th>
              <th className="px-3 py-2 text-left">Layer</th>
              <th className="px-3 py-2 text-right">Features</th>
              <th className="px-3 py-2 text-right">Avg km²</th>
              <th className="px-3 py-2 text-right">Unique Pcodes</th>
              <th className="px-3 py-2 text-right">Missing Names</th>
            </tr>
          </thead>
          <tbody>
            {layers.length > 0 ? (
              layers.map((l) => (
                <tr key={l.id} className="border-t">
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={!!visible[l.id]}
                      onChange={() => toggleVisible(l.id)}
                    />
                  </td>
                  <td className="px-3 py-2">{l.layer_name}</td>
                  <td className="px-3 py-2 text-right">{l.feature_count ?? "—"}</td>
                  <td className="px-3 py-2 text-right">{l.avg_area_sqkm ?? "—"}</td>
                  <td className="px-3 py-2 text-right">{l.unique_pcodes ?? "—"}</td>
                  <td className="px-3 py-2 text-right">{l.missing_names ?? "—"}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="px-3 py-4 text-center text-gray-500" colSpan={6}>
                  No layers found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Map below the list */}
      <div className="h-[600px] rounded-lg overflow-hidden border border-gray-200">
        <MapContainer
          center={[12.8797, 121.774]}
          zoom={5}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            attribution='&copy; <a href="https://osm.org">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <FitToBounds bounds={combinedBounds} />
          {Object.entries(geojsonById).map(([id, gj]) =>
            visible[id] ? <GeoJSON key={id} data={gj as any} /> : null
          )}
        </MapContainer>
      </div>
    </SidebarLayout>
  );
}

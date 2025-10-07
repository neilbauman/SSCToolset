"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import GISDataHealthPanel from "@/components/country/GISDataHealthPanel";
import EditGISVersionModal from "@/components/country/EditGISVersionModal";
import UploadGISModal from "@/components/country/UploadGISModal";
import EditGISLayerModal from "@/components/country/EditGISLayerModal";
import { Layers, Plus, Eye, EyeOff } from "lucide-react";
import type { GISLayer, GISDatasetVersion } from "@/types/gis";
import "leaflet/dist/leaflet.css";

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

export default function CountryGISPage({ params }: { params: { id: string } }) {
  const { id: countryIso } = params;

  const [versions, setVersions] = useState<GISDatasetVersion[]>([]);
  const [activeVersion, setActiveVersion] = useState<GISDatasetVersion | null>(null);
  const [layers, setLayers] = useState<GISLayer[]>([]);
  const [geojsonByLayer, setGeojsonByLayer] = useState<Record<string, any>>({});
  const [visibleLayers, setVisibleLayers] = useState<Record<string, boolean>>({});
  const [openVersionModal, setOpenVersionModal] = useState(false);
  const [openLayerModal, setOpenLayerModal] = useState(false);
  const [editingLayer, setEditingLayer] = useState<GISLayer | null>(null);
  const [openUploadModal, setOpenUploadModal] = useState(false);
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());
  const [mapCenter, setMapCenter] = useState<[number, number]>([12.8797, 121.774]);

  const mapRef = useRef<any>(null);

  // Fetch dataset versions
  useEffect(() => {
    const fetchVersions = async () => {
      const { data, error } = await supabase
        .from("gis_dataset_versions")
        .select("*")
        .eq("country_iso", countryIso)
        .order("created_at", { ascending: false });
      if (error) {
        console.error("Error fetching versions:", error);
        return;
      }
      setVersions(data || []);
      const active = data?.find((v) => v.is_active);
      setActiveVersion(active || null);
    };
    fetchVersions();
  }, [countryIso]);

  // Fetch GIS layers for active version
  useEffect(() => {
    if (!activeVersion) return;
    const fetchLayers = async () => {
      const { data, error } = await supabase
        .from("gis_layers")
        .select("*")
        .eq("dataset_version_id", activeVersion.id)
        .eq("country_iso", countryIso);
      if (error) {
        console.error("Error fetching layers:", error);
        return;
      }
      setLayers(data || []);
      const initVisibility = Object.fromEntries((data || []).map((l) => [l.id, false]));
      setVisibleLayers(initVisibility);

      // Center on ADM0 if present
      const adm0 = data?.find((l) => l.admin_level === "ADM0");
      if (adm0 && adm0.source?.path) {
        fetchGeoJSON(adm0);
      }
    };
    fetchLayers();
  }, [activeVersion, countryIso]);

  // Fetch GeoJSON for layer
  const fetchGeoJSON = async (layer: GISLayer) => {
    if (!layer?.source?.path) return;
    const path = layer.source.path.startsWith(countryIso)
      ? layer.source.path
      : `${countryIso}/${layer.source.path}`;
    try {
      setLoadingIds((s) => new Set(s).add(layer.id));
      const projectRef = process.env.NEXT_PUBLIC_SUPABASE_PROJECT_REF;
      const url = `https://${projectRef}.supabase.co/storage/v1/object/public/${layer.source.bucket}/${path}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Failed to fetch GeoJSON: ${res.status}`);
      const json = await res.json();

      setGeojsonByLayer((prev) => ({ ...prev, [layer.id]: json }));
      if (layer.admin_level === "ADM0") {
        const coords = extractCentroid(json);
        if (coords) setMapCenter(coords);
      }
    } catch (err) {
      console.error("GeoJSON load failed:", err);
    } finally {
      setLoadingIds((s) => {
        const next = new Set(s);
        next.delete(layer.id);
        return next;
      });
    }
  };

  // Compute centroid for ADM0
  const extractCentroid = (geojson: any): [number, number] | null => {
    try {
      const coords = geojson?.features?.[0]?.geometry?.coordinates?.flat(Infinity);
      if (Array.isArray(coords) && coords.length >= 2) {
        const longs = coords.filter((_: any, i: number) => i % 2 === 0);
        const lats = coords.filter((_: any, i: number) => i % 2 === 1);
        const avgLat = lats.reduce((a, b) => a + b, 0) / lats.length;
        const avgLon = longs.reduce((a, b) => a + b, 0) / longs.length;
        return [avgLat, avgLon];
      }
    } catch {
      return null;
    }
    return null;
  };

  const toggleLayerVisibility = async (layer: GISLayer) => {
    setVisibleLayers((v) => ({ ...v, [layer.id]: !v[layer.id] }));
    if (!geojsonByLayer[layer.id]) await fetchGeoJSON(layer);
  };

  const headerProps = {
    title: `${countryIso} – GIS Datasets`,
    group: "country-config" as const,
    description: "Manage GIS dataset versions and layers for this country.",
    breadcrumbs: (
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Country Configuration", href: "/country" },
          { label: `${countryIso} GIS` },
        ]}
      />
    ),
  };

  return (
    <SidebarLayout headerProps={headerProps}>
      {/* Dataset Versions */}
      <section className="bg-white border rounded-lg shadow-sm p-4 mb-6">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Layers className="w-5 h-5 text-[color:var(--gsc-blue)]" /> Dataset Versions
          </h2>
          <button
            onClick={() => setOpenVersionModal(true)}
            className="bg-[color:var(--gsc-red)] text-white text-sm px-3 py-1.5 rounded hover:opacity-90"
          >
            + Add New Version
          </button>
        </div>

        <table className="w-full text-sm border">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-3 py-2 text-left">Title</th>
              <th className="px-3 py-2 text-left">Year</th>
              <th className="px-3 py-2 text-left">Source</th>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {versions.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-4 text-gray-500">
                  No GIS dataset versions found.
                </td>
              </tr>
            ) : (
              versions.map((v) => (
                <tr key={v.id} className="border-t hover:bg-gray-50">
                  <td className="px-3 py-2">{v.title}</td>
                  <td className="px-3 py-2">{v.year || "—"}</td>
                  <td className="px-3 py-2">{v.source || "—"}</td>
                  <td className="px-3 py-2">
                    {v.is_active ? (
                      <span className="text-green-700 bg-green-50 px-2 py-1 rounded text-xs">Active</span>
                    ) : (
                      <span className="text-gray-600 bg-gray-50 px-2 py-1 rounded text-xs">Inactive</span>
                    )}
                  </td>
                  <td className="px-3 py-2 flex gap-2">
                    <button
                      onClick={() => setActiveVersion(v)}
                      className="text-blue-600 text-xs underline"
                    >
                      View Layers
                    </button>
                    <button
                      onClick={() => {
                        setActiveVersion(v);
                        setOpenVersionModal(true);
                      }}
                      className="text-gray-600 text-xs underline"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      {/* Version Layers */}
      <section className="bg-white border rounded-lg shadow-sm p-4 mb-6">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Layers className="w-5 h-5 text-[color:var(--gsc-blue)]" /> Version Layers
          </h2>
          <button
            onClick={() => setOpenUploadModal(true)}
            className="bg-[color:var(--gsc-red)] text-white text-sm px-3 py-1.5 rounded hover:opacity-90"
          >
            + Add GIS Layer
          </button>
        </div>

        {layers.length === 0 ? (
          <div className="text-center text-gray-500 italic py-3">
            No layers currently uploaded to this version.
          </div>
        ) : (
          <table className="w-full text-sm border">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-3 py-2 text-left w-[10%]">Level</th>
                <th className="px-3 py-2 text-left w-[30%]">Layer Name</th>
                <th className="px-3 py-2 text-left w-[15%]">Format</th>
                <th className="px-3 py-2 text-left w-[15%]">CRS</th>
                <th className="px-3 py-2 text-left w-[15%]">Features</th>
                <th className="px-3 py-2 text-left w-[15%]">Visible</th>
                <th className="px-3 py-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {layers.map((l) => (
                <tr key={l.id} className="border-t hover:bg-gray-50">
                  <td className="px-3 py-2">{l.admin_level}</td>
                  <td className="px-3 py-2">{l.layer_name}</td>
                  <td className="px-3 py-2">{l.format || "—"}</td>
                  <td className="px-3 py-2">{l.crs || "—"}</td>
                  <td className="px-3 py-2">{l.feature_count ?? "—"}</td>
                  <td className="px-3 py-2">
                    <button
                      onClick={() => toggleLayerVisibility(l)}
                      className="text-gray-700 hover:text-[color:var(--gsc-red)]"
                    >
                      {visibleLayers[l.id] ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </td>
                  <td className="px-3 py-2 flex gap-2">
                    <button
                      className="text-blue-600 text-xs underline"
                      onClick={() => {
                        setEditingLayer(l);
                        setOpenLayerModal(true);
                      }}
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <GISDataHealthPanel layers={layers} />

      {/* Map + Toggles */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-6">
        <div className="lg:col-span-2">
          <MapContainer
            center={mapCenter}
            zoom={5}
            style={{ height: "600px", width: "100%" }}
            whenReady={() => {
              // @ts-ignore - runtime passes event but type forbids args
              mapRef.current = (arguments[0] as any)?.target ?? null;
            }}
            className="rounded-md z-0"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org">OSM</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {layers.map(
              (l) =>
                visibleLayers[l.id] &&
                geojsonByLayer[l.id] && (
                  <GeoJSON
                    key={l.id}
                    data={geojsonByLayer[l.id]}
                    style={{ color: "#630710", weight: 1 }}
                  />
                )
            )}
          </MapContainer>
        </div>

        <div className="bg-white border rounded-lg shadow-sm p-4">
          <h3 className="font-semibold mb-2">Layer Toggles</h3>
          <p className="text-xs text-gray-500 mb-3">
            Turn layers on/off (default off).
          </p>
          {["ADM0", "ADM1", "ADM2", "ADM3", "ADM4", "ADM5"].map((lvl) => {
            const layersAtLevel = layers.filter((l) => l.admin_level === lvl);
            return (
              <div key={lvl} className="flex items-center mb-1">
                <input
                  type="checkbox"
                  className="mr-2"
                  disabled={layersAtLevel.length === 0}
                  onChange={() => {
                    layersAtLevel.forEach((l) => toggleLayerVisibility(l));
                  }}
                />
                <span className="text-sm">
                  {lvl} ({layersAtLevel.length} layer
                  {layersAtLevel.length !== 1 ? "s" : ""})
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Modals */}
      {openVersionModal && (
        <EditGISVersionModal
          open={openVersionModal}
          onClose={() => setOpenVersionModal(false)}
          countryIso={countryIso}
          datasetVersionId={activeVersion?.id || ""}
          onSaved={() => window.location.reload()}
        />
      )}

      {openUploadModal && (
        <UploadGISModal
          open={openUploadModal}
          onClose={() => setOpenUploadModal(false)}
          countryIso={countryIso}
          datasetVersionId={activeVersion?.id || ""}
          onUploaded={() => window.location.reload()}
        />
      )}

      {openLayerModal && editingLayer && (
        <EditGISLayerModal
          open={openLayerModal}
          onClose={() => setOpenLayerModal(false)}
          layer={editingLayer}
          onUpdated={() => window.location.reload()}
        />
      )}
    </SidebarLayout>
  );
}

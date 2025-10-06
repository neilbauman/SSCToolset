"use client";

import { useEffect, useRef, useState } from "react";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import GISDataHealthPanel from "@/components/country/GISDataHealthPanel";
import UploadGISModal from "@/components/country/UploadGISModal";
import EditGISLayerModal from "@/components/country/EditGISLayerModal";
import ConfirmDeleteModal from "@/components/country/ConfirmDeleteModal";
import { MapContainer, TileLayer, GeoJSON } from "react-leaflet";
import type { GeoJsonObject } from "geojson";
import "leaflet/dist/leaflet.css";
import {
  Layers,
  Upload,
  Database,
  FileDown,
  MoreVertical,
  Map as MapIcon,
} from "lucide-react";
import type { CountryParams } from "@/app/country/types";

type GISDatasetVersion = {
  id: string;
  country_iso: string;
  title: string;
  source: string | null;
  year: number | null;
  dataset_date: string | null;
  is_active: boolean | null;
  created_at: string;
};

type GISLayer = {
  id: string;
  dataset_version_id: string;
  country_iso: string;
  admin_level: string;
  layer_name: string;
  storage_path: string;
  crs?: string | null;
  format?: string | null;
  feature_count?: number | null;
  created_at?: string;
};

export default function GISPage({ params }: { params: CountryParams }) {
  const { id: countryIso } = params;
  const [versions, setVersions] = useState<GISDatasetVersion[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<GISDatasetVersion | null>(null);
  const [layers, setLayers] = useState<GISLayer[]>([]);
  const [openUpload, setOpenUpload] = useState(false);
  const [openLayerModal, setOpenLayerModal] = useState(false);
  const [editLayer, setEditLayer] = useState<GISLayer | null>(null);
  const [deleteLayer, setDeleteLayer] = useState<GISLayer | null>(null);
  const [openMenuFor, setOpenMenuFor] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Map + layer toggles
  const [visibleLayerIds, setVisibleLayerIds] = useState<Set<string>>(new Set());
  const [geojsonByLayer, setGeojsonByLayer] = useState<Record<string, GeoJsonObject | null>>({});
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());
  const [errorById, setErrorById] = useState<Record<string, string | undefined>>({});

  // --- Fetch dataset versions ---
  const fetchVersions = async () => {
    const { data, error } = await supabase
      .from("gis_dataset_versions")
      .select("*")
      .eq("country_iso", countryIso)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setVersions(data as GISDatasetVersion[]);
      const active = data.find((v) => v.is_active);
      setSelectedVersion(active || data[0] || null);
    }
  };

  // --- Fetch layers for version ---
  const fetchLayers = async (versionId: string) => {
    const { data, error } = await supabase
      .from("gis_layers")
      .select("*")
      .eq("dataset_version_id", versionId)
      .order("created_at", { ascending: true });
    if (!error && data) setLayers(data as GISLayer[]);
  };

  // --- Layer GeoJSON fetch ---
  async function fetchAndCacheGeoJSON(layerId: string, storagePath: string) {
    const lower = storagePath.toLowerCase();
    if (!/\.(geojson|json)$/i.test(lower)) {
      setErrorById((e) => ({ ...e, [layerId]: "Unsupported format" }));
      return;
    }

    setLoadingIds((s) => new Set(s).add(layerId));
    setErrorById((e) => ({ ...e, [layerId]: undefined }));

    try {
      const { data, error } = await supabase.storage.from("gis_raw").download(storagePath);
      if (error || !data) throw error || new Error("No file");
      const text = await data.text();
      const parsed = JSON.parse(text) as GeoJsonObject;
      setGeojsonByLayer((m) => ({ ...m, [layerId]: parsed }));
    } catch (err: any) {
      console.error("Failed to load layer:", err);
      setErrorById((e) => ({ ...e, [layerId]: err.message || "Load error" }));
      setGeojsonByLayer((m) => ({ ...m, [layerId]: null }));
    } finally {
      setLoadingIds((s) => {
        const next = new Set(s);
        next.delete(layerId);
        return next;
      });
    }
  }

  // --- Toggle layer visibility ---
  const handleToggleLayer = async (layerId: string, nextChecked: boolean, layer?: GISLayer) => {
    setVisibleLayerIds((prev) => {
      const updated = new Set(prev);
      if (nextChecked) updated.add(layerId);
      else updated.delete(layerId);
      return updated;
    });
    if (nextChecked && layer?.storage_path && !geojsonByLayer[layerId]) {
      await fetchAndCacheGeoJSON(layerId, layer.storage_path);
    }
  };

  // --- Initial load ---
  useEffect(() => {
    fetchVersions();
  }, [countryIso]);

  useEffect(() => {
    if (selectedVersion) fetchLayers(selectedVersion.id);
  }, [selectedVersion]);

  // --- Actions menu cleanup ---
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuFor(null);
      }
    };
    window.addEventListener("mousedown", handleClickOutside);
    return () => window.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // --- Page Header ---
  const headerProps = {
    title: `${countryIso.toUpperCase()} – GIS Layers`,
    group: "country-config" as const,
    description: "Manage, visualize, and download GIS administrative layers.",
    breadcrumbs: (
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Country Configuration", href: "/country" },
          { label: countryIso.toUpperCase(), href: `/country/${countryIso}` },
          { label: "GIS" },
        ]}
      />
    ),
  };

  // --- Admin level colors ---
  const levelColors: Record<string, string> = {
    ADM0: "#630710",
    ADM1: "#8B4513",
    ADM2: "#D2691E",
    ADM3: "#CD853F",
    ADM4: "#B5651D",
    ADM5: "#A0522D",
  };

  return (
    <SidebarLayout headerProps={headerProps}>
      {/* --- Dataset Versions --- */}
      <div className="border rounded-lg p-4 shadow-sm mb-6">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Database className="w-5 h-5 text-green-600" /> Dataset Versions
          </h2>
          <button
            onClick={() => setOpenUpload(true)}
            className="flex items-center text-sm text-white bg-[color:var(--gsc-red)] px-3 py-1 rounded hover:opacity-90"
          >
            <Upload className="w-4 h-4 mr-1" /> Add Version
          </button>
        </div>

        {versions.length ? (
          <table className="w-full text-sm border">
            <thead className="bg-gray-100">
              <tr>
                <th className="border px-2 py-1 text-left">Title</th>
                <th className="border px-2 py-1 text-left">Year</th>
                <th className="border px-2 py-1 text-left">Source</th>
                <th className="border px-2 py-1 text-left">Active</th>
              </tr>
            </thead>
            <tbody>
              {versions.map((v) => (
                <tr
                  key={v.id}
                  className={`hover:bg-gray-50 cursor-pointer ${
                    selectedVersion?.id === v.id ? "bg-blue-50" : ""
                  }`}
                  onClick={() => setSelectedVersion(v)}
                >
                  <td className="border px-2 py-1">{v.title}</td>
                  <td className="border px-2 py-1">{v.year || "—"}</td>
                  <td className="border px-2 py-1">{v.source || "—"}</td>
                  <td className="border px-2 py-1 text-center">
                    {v.is_active ? "✅" : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="italic text-gray-500">No versions yet.</p>
        )}
      </div>

      {/* --- Version Layers --- */}
      <div className="border rounded-lg p-4 shadow-sm mb-6">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Layers className="w-5 h-5 text-blue-600" /> Version Layers
          </h2>
          <button
            onClick={() => setOpenLayerModal(true)}
            className="flex items-center text-sm text-white bg-[color:var(--gsc-red)] px-3 py-1 rounded hover:opacity-90"
            disabled={!selectedVersion}
          >
            <Upload className="w-4 h-4 mr-1" /> Add GIS Layer
          </button>
        </div>

        {layers.length ? (
          <table className="w-full text-sm border">
            <thead className="bg-gray-100">
              <tr>
                <th className="border px-2 py-1 text-left">Admin Level</th>
                <th className="border px-2 py-1 text-left">Name</th>
                <th className="border px-2 py-1 text-left">CRS</th>
                <th className="border px-2 py-1 text-left">Format</th>
                <th className="border px-2 py-1 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {layers.map((l) => (
                <tr key={l.id} className="hover:bg-gray-50">
                  <td className="border px-2 py-1">{l.admin_level}</td>
                  <td className="border px-2 py-1">{l.layer_name}</td>
                  <td className="border px-2 py-1">{l.crs || "—"}</td>
                  <td className="border px-2 py-1">{l.format || "—"}</td>
                  <td className="border px-2 py-1 text-sm text-right">
                    <button
                      className="text-blue-600 hover:underline mr-2"
                      onClick={() => setEditLayer(l)}
                    >
                      Edit
                    </button>
                    <button
                      className="text-red-600 hover:underline"
                      onClick={() => setDeleteLayer(l)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="italic text-gray-500">No layers uploaded yet.</p>
        )}
      </div>

      {/* --- GIS Data Health --- */}
      <GISDataHealthPanel layers={layers} />

      {/* --- Map + Toggles --- */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-6">
        <div className="lg:col-span-2 border rounded-lg overflow-hidden shadow-sm">
          <MapContainer
            center={[0, 0]}
            zoom={4}
            style={{ height: "600px", width: "100%" }}
            whenReady={() => {}}
            className="rounded-md z-0"
          >
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

            {layers
              .filter((l) => visibleLayerIds.has(l.id))
              .map((l) => {
                const data = geojsonByLayer[l.id];
                if (!data) return null;
                const color = levelColors[l.admin_level] || "#630710";
                return (
                  <GeoJSON
                    key={l.id}
                    data={data}
                    style={{ color, weight: 1.2, fillOpacity: 0.1 }}
                    onEachFeature={(feature, layer) => {
                      const props = feature.properties || {};
                      const name = props.name || props.NAME || "Unnamed";
                      const code = props.pcode || props.PCODE || "";
                      layer.bindPopup(`<b>${name}</b>${code ? `<br/><i>${code}</i>` : ""}`);
                    }}
                  />
                );
              })}
          </MapContainer>
        </div>

        <div className="border rounded-lg shadow-sm p-4 bg-white">
          <h3 className="text-base font-semibold mb-3 text-[color:var(--gsc-blue)]">
            Admin Layer Visibility
          </h3>

          {["ADM0", "ADM1", "ADM2", "ADM3", "ADM4", "ADM5"].map((adm) => {
            const sameLevel = layers.filter((l) => l.admin_level === adm);
            return (
              <div key={adm} className="mb-2 border-b pb-1">
                <label className="font-medium text-sm text-gray-700 block mb-1">{adm}</label>
                {sameLevel.length ? (
                  <div className="space-y-1">
                    {sameLevel.map((l) => (
                      <div
                        key={l.id}
                        className="flex items-center justify-between text-xs"
                      >
                        <label className="flex items-center text-gray-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={visibleLayerIds.has(l.id)}
                            onChange={(e) =>
                              handleToggleLayer(l.id, e.target.checked, l)
                            }
                            className="mr-2 accent-[color:var(--gsc-red)]"
                          />
                          <span>{l.layer_name}</span>
                        </label>
                        {loadingIds.has(l.id) && (
                          <span className="text-gray-400 text-[10px]">loading…</span>
                        )}
                        {errorById[l.id] && (
                          <span className="text-red-600 text-[10px]">error</span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 italic">no layers</p>
                )}
              </div>
            );
          })}

          <hr className="my-3" />

          <h4 className="text-sm font-semibold text-gray-700 mb-1">Visible Layers</h4>
          {layers
            .filter((l) => visibleLayerIds.has(l.id))
            .map((l) => (
              <div
                key={l.id}
                className="flex justify-between items-center text-sm border-b py-1"
              >
                <span className="truncate text-gray-700">{l.layer_name}</span>
                <div className="flex items-center gap-2">
                  <button
                    className="text-blue-700 hover:underline text-xs"
                    onClick={async () => {
                      try {
                        const { data, error } = await supabase.storage
                          .from("gis_raw")
                          .download(l.storage_path);
                        if (error || !data) throw error || new Error("No file");
                        const url = URL.createObjectURL(data);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = l.layer_name || "layer.geojson";
                        a.click();
                        URL.revokeObjectURL(url);
                      } catch (err) {
                        console.error("Download failed:", err);
                        alert("Unable to download layer.");
                      }
                    }}
                  >
                    Download
                  </button>
                  <button
                    className="text-[color:var(--gsc-red)] hover:opacity-80 text-xs font-semibold"
                    onClick={() =>
                      alert(`Layer: ${l.layer_name}\nAdmin Level: ${l.admin_level}`)
                    }
                  >
                    Info
                  </button>
                </div>
              </div>
            ))}

          {visibleLayerIds.size === 0 && (
            <p className="text-xs text-gray-500 italic">No layers selected</p>
          )}
        </div>
      </section>

      {/* --- Modals --- */}
      <UploadGISModal
        open={openUpload}
        onClose={() => setOpenUpload(false)}
        countryIso={countryIso}
        datasetVersionId={selectedVersion?.id || ""}
        onUploaded={() => {
          fetchVersions();
          if (selectedVersion) fetchLayers(selectedVersion.id);
        }}
      />

      {openLayerModal && selectedVersion && (
        <UploadGISModal
          open={openLayerModal}
          onClose={() => setOpenLayerModal(false)}
          countryIso={countryIso}
          datasetVersionId={selectedVersion.id}
          onUploaded={() => fetchLayers(selectedVersion.id)}
        />
      )}

      {editLayer && (
        <EditGISLayerModal
          open={!!editLayer}
          onClose={() => setEditLayer(null)}
          layer={editLayer}
          onSaved={() => fetchLayers(selectedVersion?.id || "")}
        />
      )}

      {deleteLayer && (
        <ConfirmDelete

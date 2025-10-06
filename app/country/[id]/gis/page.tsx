"use client";

import { useEffect, useState } from "react";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import GISDataHealthPanel from "@/components/country/GISDataHealthPanel";
import UploadGISModal from "@/components/country/UploadGISModal";
import EditGISLayerModal from "@/components/country/EditGISLayerModal";
import ConfirmDeleteModal from "@/components/country/ConfirmDeleteModal";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { MapContainer, TileLayer, GeoJSON } from "react-leaflet";
import type { GeoJsonObject } from "geojson";
import "leaflet/dist/leaflet.css";
import { Layers, Upload, Database } from "lucide-react";
import type { CountryParams } from "@/app/country/types";
import type { GISLayer } from "@/types/gis";

type GISDatasetVersion = {
  id: string;
  country_iso: string;
  title: string;
  year: number | null;
  source: string | null;
  is_active: boolean | null;
  created_at: string;
};

type Country = {
  iso_code: string;
  name: string;
  lat?: number;
  lon?: number;
};

export default function GISPage({ params }: { params: CountryParams }) {
  const { id: countryIso } = params;

  const [country, setCountry] = useState<Country | null>(null);
  const [versions, setVersions] = useState<GISDatasetVersion[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<GISDatasetVersion | null>(null);
  const [layers, setLayers] = useState<GISLayer[]>([]);
  const [visibleLayerIds, setVisibleLayerIds] = useState<Set<string>>(new Set());
  const [geojsonByLayer, setGeojsonByLayer] = useState<Record<string, GeoJsonObject | null>>({});
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());
  const [errorById, setErrorById] = useState<Record<string, string | undefined>>({});
  const [openUpload, setOpenUpload] = useState(false);
  const [openLayerUpload, setOpenLayerUpload] = useState(false);
  const [editLayer, setEditLayer] = useState<GISLayer | null>(null);
  const [deleteLayer, setDeleteLayer] = useState<GISLayer | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([0, 0]);

  const headerProps = {
    title: `${countryIso.toUpperCase()} – GIS Layers`,
    group: "country-config" as const,
    description: "Manage and visualize administrative boundary layers.",
    breadcrumbs: (
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Country Configuration", href: "/country" },
          { label: country?.name ?? countryIso.toUpperCase(), href: `/country/${countryIso}` },
          { label: "GIS" },
        ]}
      />
    ),
  };

  // --- Fetch country info for centering ---
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("countries")
        .select("name, lat, lon")
        .eq("iso_code", countryIso)
        .single();

      if (data) {
        setCountry(data);
        if (data.lat && data.lon) setMapCenter([data.lat, data.lon]);
      } else {
        setMapCenter([0, 0]);
      }
    })();
  }, [countryIso]);

  // --- Load dataset versions ---
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("gis_dataset_versions")
        .select("*")
        .eq("country_iso", countryIso)
        .order("created_at", { ascending: false });
      if (data?.length) {
        setVersions(data);
        const active = data.find((v) => v.is_active);
        setSelectedVersion(active || data[0]);
      }
    })();
  }, [countryIso]);

  // --- Load layers for version ---
  useEffect(() => {
    if (!selectedVersion) return;
    (async () => {
      const { data } = await supabase
        .from("gis_layers")
        .select("*")
        .eq("dataset_version_id", selectedVersion.id)
        .order("created_at", { ascending: true });
      setLayers(data || []);
    })();
  }, [selectedVersion]);

  // --- Fetch GeoJSON from Supabase storage ---
  async function fetchGeoJSON(layer: GISLayer) {
    try {
      setLoadingIds((s) => new Set(s).add(layer.id));

      const path = (layer as any).path;
      if (!path) throw new Error("Layer missing path field");

      const { data, error } = await supabase.storage.from("gis_raw").download(path);
      if (error || !data) throw error || new Error("No file");

      const parsed = JSON.parse(await data.text()) as GeoJsonObject;
      setGeojsonByLayer((m) => ({ ...m, [layer.id]: parsed }));
    } catch (err: any) {
      setErrorById((e) => ({ ...e, [layer.id]: err.message || "Load error" }));
    } finally {
      setLoadingIds((s) => {
        const n = new Set(s);
        n.delete(layer.id);
        return n;
      });
    }
  }

  const handleToggle = async (layer: GISLayer, on: boolean) => {
    setVisibleLayerIds((prev) => {
      const n = new Set(prev);
      on ? n.add(layer.id) : n.delete(layer.id);
      return n;
    });
    if (on && !geojsonByLayer[layer.id]) await fetchGeoJSON(layer);
  };

  const colors: Record<string, string> = {
    ADM0: "#630710",
    ADM1: "#8B4513",
    ADM2: "#D2691E",
    ADM3: "#CD853F",
    ADM4: "#B5651D",
    ADM5: "#A0522D",
  };

  return (
    <SidebarLayout headerProps={headerProps}>
      {/* Dataset Versions */}
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
                  onClick={() => setSelectedVersion(v)}
                  className={`cursor-pointer ${
                    selectedVersion?.id === v.id ? "bg-blue-50" : "hover:bg-gray-50"
                  }`}
                >
                  <td className="border px-2 py-1">{v.title}</td>
                  <td className="border px-2 py-1">{v.year || "—"}</td>
                  <td className="border px-2 py-1">{v.source || "—"}</td>
                  <td className="border px-2 py-1 text-center">{v.is_active ? "✅" : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-gray-500 italic">No versions uploaded yet.</p>
        )}
      </div>

      {/* Version Layers */}
      <div className="border rounded-lg p-4 shadow-sm mb-6">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Layers className="w-5 h-5 text-blue-600" /> Version Layers
          </h2>
          <button
            onClick={() => setOpenLayerUpload(true)}
            disabled={!selectedVersion}
            className="flex items-center text-sm text-white bg-[color:var(--gsc-red)] px-3 py-1 rounded hover:opacity-90 disabled:opacity-60"
          >
            <Upload className="w-4 h-4 mr-1" /> Add GIS Layer
          </button>
        </div>
        {layers.length ? (
          <table className="w-full text-sm border">
            <thead className="bg-gray-100">
              <tr>
                <th className="border px-2 py-1 text-left">Admin</th>
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
                  <td className="border px-2 py-1 text-right text-sm">
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
          <p className="text-gray-500 italic">No layers yet.</p>
        )}
      </div>

      <GISDataHealthPanel layers={layers} />

      {/* Map + Toggles */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-6">
        <div className="lg:col-span-2 border rounded-lg overflow-hidden shadow-sm">
          <MapContainer
            center={mapCenter}
            zoom={5}
            style={{ height: "600px", width: "100%" }}
            className="rounded-md z-0"
          >
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            {layers
              .filter((l) => visibleLayerIds.has(l.id))
              .map((l) => {
                const data = geojsonByLayer[l.id];
                if (!data) return null;
                return (
                  <GeoJSON
                    key={l.id}
                    data={data}
                    style={{
                      color: l.admin_level ? colors[l.admin_level] ?? "#630710" : "#630710",
                      weight: 1.2,
                    }}
                    onEachFeature={(f, layer) => {
                      const n = f.properties?.name || f.properties?.NAME || "Unnamed";
                      const p = f.properties?.pcode || f.properties?.PCODE || "";
                      layer.bindPopup(`<b>${n}</b>${p ? `<br/><i>${p}</i>` : ""}`);
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
            const group = layers.filter((l) => l.admin_level === adm);
            return (
              <div key={adm} className="mb-2 border-b pb-1">
                <label className="font-medium text-sm text-gray-700">{adm}</label>
                {group.length ? (
                  <div className="space-y-1 mt-1">
                    {group.map((l) => (
                      <label key={l.id} className="flex items-center text-xs">
                        <input
                          type="checkbox"
                          checked={visibleLayerIds.has(l.id)}
                          onChange={(e) => handleToggle(l, e.target.checked)}
                          className="mr-2 accent-[color:var(--gsc-red)]"
                        />
                        {l.layer_name}
                        {loadingIds.has(l.id) && (
                          <span className="ml-2 text-gray-400 text-[10px]">loading…</span>
                        )}
                        {errorById[l.id] && (
                          <span className="ml-2 text-red-600 text-[10px]">error</span>
                        )}
                      </label>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 italic">no layers</p>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Modals */}
      <UploadGISModal
        open={openUpload}
        onClose={() => setOpenUpload(false)}
        countryIso={countryIso}
        datasetVersionId={selectedVersion?.id || ""}
        onUploaded={() => setOpenUpload(false)}
      />
      {openLayerUpload && selectedVersion && (
        <UploadGISModal
          open={openLayerUpload}
          onClose={() => setOpenLayerUpload(false)}
          countryIso={countryIso}
          datasetVersionId={selectedVersion.id}
          onUploaded={() => setOpenLayerUpload(false)}
        />
      )}
      {editLayer && (
        <EditGISLayerModal
          open={!!editLayer}
          onClose={() => setEditLayer(null)}
          layer={editLayer}
          onSaved={() => setEditLayer(null)}
        />
      )}
      {deleteLayer && (
        <ConfirmDeleteModal
          open={!!deleteLayer}
          message={`Delete ${deleteLayer.layer_name}?`}
          onClose={() => setDeleteLayer(null)}
          onConfirm={async () => {
            await supabase.from("gis_layers").delete().eq("id", deleteLayer.id);
            setDeleteLayer(null);
            selectedVersion && setSelectedVersion({ ...selectedVersion });
          }}
        />
      )}
    </SidebarLayout>
  );
}

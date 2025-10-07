"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import "leaflet/dist/leaflet.css";

import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";

import UploadGISModal from "@/components/country/UploadGISModal";
import EditGISLayerModal from "@/components/country/EditGISLayerModal";
import EditGISVersionModal from "@/components/country/EditGISVersionModal";
import GISDataHealthPanel from "@/components/country/GISDataHealthPanel";

import type { CountryParams } from "@/app/country/types";
import type { GISLayer, GISDatasetVersion } from "@/types/gis";
import type { FeatureCollection, GeoJsonObject } from "geojson";
import type { Map as LeafletMap } from "leaflet";

// SSR-safe react-leaflet
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

type LayerWithRuntime = GISLayer & {
  _publicUrl?: string | null;
};

export default function CountryGISPage({ params }: { params: CountryParams }) {
  const countryIso = params.id;

  // versions + active version
  const [versions, setVersions] = useState<GISDatasetVersion[]>([]);
  const [activeVersion, setActiveVersion] = useState<GISDatasetVersion | null>(null);

  // layers for the selected version
  const [layers, setLayers] = useState<LayerWithRuntime[]>([]);

  // visibility map (id -> bool)
  const [visible, setVisible] = useState<Record<string, boolean>>({});

  // parsed geojson per layer
  const [geojsonById, setGeojsonById] = useState<Record<string, FeatureCollection>>({});
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());

  // modals
  const [openUpload, setOpenUpload] = useState(false);
  const [editingLayer, setEditingLayer] = useState<LayerWithRuntime | null>(null);
  const [openEditVersion, setOpenEditVersion] = useState(false);

  // map ref
  const mapRef = useRef<LeafletMap | null>(null);

  // ---------- helpers ----------

  const resolvePublicUrl = (l: LayerWithRuntime): string | null => {
    const bucket = (l.source as any)?.bucket || "gis_raw";
    const rawPath =
      (l.source as any)?.path ||
      (l as any).path ||
      (l as any).storage_path ||
      null;

    if (!rawPath) return null;

    const { data } = supabase.storage.from(bucket).getPublicUrl(rawPath);
    return data?.publicUrl ?? null;
  };

  const fetchGeo = async (l: LayerWithRuntime) => {
    if (loadingIds.has(l.id)) return;
    const url = l._publicUrl ?? resolvePublicUrl(l);
    if (!url) return;

    try {
      setLoadingIds((s) => new Set(s).add(l.id));
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as GeoJsonObject;

      const fc: FeatureCollection =
        (json as any)?.type === "FeatureCollection"
          ? (json as FeatureCollection)
          : ({ type: "FeatureCollection", features: [] } as FeatureCollection);

      setGeojsonById((m) => ({ ...m, [l.id]: fc }));

      const count = fc.features?.length ?? 0;
      setLayers((arr) =>
        arr.map((x) => (x.id === l.id ? { ...x, feature_count: count } : x))
      );
    } catch (err) {
      console.error("GeoJSON load failed:", l.layer_name, err);
    } finally {
      setLoadingIds((s) => {
        const copy = new Set(s);
        copy.delete(l.id);
        return copy;
      });
    }
  };

  const reloadAll = () => {
    loadData();
  };

  // ---------- data loading ----------

  const loadData = async () => {
    const { data: vData } = await supabase
      .from("gis_dataset_versions")
      .select("*")
      .eq("country_iso", countryIso)
      .order("created_at", { ascending: false });

    const v = vData || [];
    setVersions(v);
    const active = v.find((x) => x.is_active) || v[0] || null;
    setActiveVersion(active || null);

    if (active) {
      const { data: lData } = await supabase
        .from("gis_layers")
        .select("*")
        .eq("country_iso", countryIso)
        .eq("dataset_version_id", active.id)
        .order("admin_level_int", { ascending: true });

      const arr: LayerWithRuntime[] = (lData || []).map((x) => ({
        ...x,
        _publicUrl: resolvePublicUrl(x as any),
      })) as any;

      setLayers(arr);

      const defaults: Record<string, boolean> = {};
      for (const l of arr) defaults[l.id] = (l.admin_level || "") === "ADM0";
      setVisible(defaults);

      const adm0 = arr.find((l) => l.admin_level === "ADM0");
      if (adm0) fetchGeo(adm0);
    } else {
      setLayers([]);
      setVisible({});
      setGeojsonById({});
    }
  };

  useEffect(() => {
    loadData();
  }, [countryIso]);

  // ---------- map centering ----------
  useEffect(() => {
    const adm0 = layers.find((l) => l.admin_level === "ADM0");
    if (!adm0) return;
    const fc = geojsonById[adm0.id];
    if (!fc || !mapRef.current) return;
    try {
      mapRef.current.setView([12.8797, 121.774], 5);
    } catch {
      /* noop */
    }
  }, [layers, geojsonById]);

  const healthLayers = useMemo(() => layers as GISLayer[], [layers]);

  const toggleVisible = (l: LayerWithRuntime, next: boolean) => {
    setVisible((m) => ({ ...m, [l.id]: next }));
    if (next && !geojsonById[l.id]) fetchGeo(l);
  };

  // ---------- render ----------

  return (
    <SidebarLayout
      headerProps={{
        title: `${countryIso} – GIS Datasets`,
        group: "country-config",
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
      }}
    >
      {/* Dataset Versions */}
      <section className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-base font-semibold">Dataset Versions</h3>
          <div className="flex gap-2">
            <button
              className="px-3 py-1.5 rounded bg-[color:var(--gsc-green)] text-white text-sm"
              onClick={() => setOpenEditVersion(true)}
            >
              + Add New Version
            </button>
          </div>
        </div>

        <div className="overflow-x-auto border rounded-lg">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 text-left">
              <tr>
                <th className="px-3 py-2">Title</th>
                <th className="px-3 py-2">Year</th>
                <th className="px-3 py-2">Source</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {versions.map((v) => (
                <tr key={v.id} className="border-t">
                  <td className="px-3 py-2">{v.title}</td>
                  <td className="px-3 py-2">{v.year ?? "—"}</td>
                  <td className="px-3 py-2">{v.source ?? "—"}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`px-2 py-0.5 text-xs rounded ${
                        v.is_active
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {v.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex gap-2 justify-end">
                      <button
                        className="text-blue-600 hover:underline"
                        onClick={() => {
                          setActiveVersion(v);
                          (async () => {
                            const { data } = await supabase
                              .from("gis_layers")
                              .select("*")
                              .eq("country_iso", countryIso)
                              .eq("dataset_version_id", v.id)
                              .order("admin_level_int", { ascending: true });

                            const arr: LayerWithRuntime[] = (data || []).map(
                              (x) => ({
                                ...x,
                                _publicUrl: resolvePublicUrl(x as any),
                              })
                            ) as any;

                            setLayers(arr);
                            const defaults: Record<string, boolean> = {};
                            for (const l of arr)
                              defaults[l.id] = (l.admin_level || "") === "ADM0";
                            setVisible(defaults);
                            setGeojsonById({});
                          })();
                        }}
                      >
                        View Layers
                      </button>
                      <button
                        className="text-blue-600 hover:underline"
                        onClick={() => setOpenEditVersion(true)}
                      >
                        Edit
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {versions.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-3 py-4 text-center text-gray-500 italic"
                  >
                    No versions yet. Click “Add New Version” to create one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Version Layers */}
      <section className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-base font-semibold">Version Layers</h3>
          <button
            className="px-3 py-1.5 rounded bg-[color:var(--gsc-red)] text-white text-sm"
            onClick={() => setOpenUpload(true)}
            disabled={!activeVersion}
          >
            + Add GIS Layer
          </button>
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
                    No layers currently uploaded to this version.
                    <button
                      className="ml-2 px-2 py-1 rounded bg-[color:var(--gsc-red)] text-white text-xs"
                      onClick={() => setOpenUpload(true)}
                      disabled={!activeVersion}
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

      {/* Health */}
      <GISDataHealthPanel layers={healthLayers} />

      {/* Map */}
      <section className="grid grid-cols-1 gap-4 mt-4">
        <div className="border rounded-lg overflow-hidden">
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

            {/* Render visible layers */}
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
                    color: colors[l.admin_level || ""] || "#630710",
                    weight: 1.2,
                  }}
                  onEachFeature={(f, layer) => {
                    const name =
                      (f.properties as any)?.name ||
                      (f.properties as any)?.NAME ||
                      (f.properties as any)?.ADM2_EN ||
                      "Unnamed";
                    const pcode =
                      (f.properties as any)?.pcode ||
                      (f.properties as any)?.PCODE ||
                      "";
                    layer.bindPopup(
                      `<div style="font-size:12px"><strong>${name}</strong>${
                        pcode
                          ? ` <span style="color:#666">(${pcode})</span>`
                          : ""
                      }</div>`
                    );
                  }}
                />
              );
            })}
          </MapContainer>
        </div>
      </section>

      {/* Modals */}
      {openUpload && activeVersion && (
        <UploadGISModal
          open={openUpload}
          onClose={() => setOpenUpload(false)}
          countryIso={countryIso}
          datasetVersionId={activeVersion.id}
          onUploaded={reloadAll}
        />
      )}

      {editingLayer && (
        <EditGISLayerModal
          open={!!editingLayer}
          onClose={() => setEditingLayer(null)}
          layer={editingLayer as any}
          onUpdated={reloadAll} // ✅ fixed here
        />
      )}

      {openEditVersion && (
        <EditGISVersionModal
          open={openEditVersion}
          onClose={() => setOpenEditVersion(false)}
          countryIso={countryIso}
          datasetVersionId={activeVersion?.id || ""}
          onSaved={reloadAll}
        />
      )}
    </SidebarLayout>
  );
}

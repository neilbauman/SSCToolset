"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Layers, Map as MapIcon, Eye, EyeOff, Maximize, Loader2 } from "lucide-react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import UploadGISModal from "@/components/country/UploadGISModal";
import EditGISLayerModal from "@/components/country/EditGISLayerModal";

type CountryParams = { params: { id: string } };

type GVDataset = {
  id: string;
  country_iso: string;
  title: string;
  source: string | null;
  year: number | null;
  is_active: boolean;
  created_at: string;
};

type GISLayer = {
  id: string;
  country_iso: string;
  layer_name: string;
  format: string;
  feature_count: number | null;
  crs: string | null;
  source: { bucket?: string; path?: string } | null;
  created_at: string | null;
  updated_at: string | null;
  dataset_id: string | null;
  dataset_version_id: string | null;
  admin_level?: string | null; // legacy
  admin_level_int?: number | null; // canonical
  is_active: boolean;
};

const LEVELS = [1, 2, 3, 4, 5] as const;

const LEVEL_LABEL = (lvl: number) => `ADM${lvl}`;
const LEVEL_STYLE = (lvl: number): L.PathOptions => ({
  color: ["#7b1fa2", "#1976d2", "#388e3c", "#f57c00", "#c2185b"][lvl - 1] || "#424242",
  weight: 2 + (6 - lvl), // ADM1 thicker than ADM5
  fill: false,
  opacity: 0.9,
});

export default function CountryGISPage({ params }: CountryParams) {
  const countryIso = params.id;

  // Map & layer groups
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const groupsRef = useRef<Record<number, L.LayerGroup>>({});
  const geojsonCacheRef = useRef<Map<string, GeoJSON.GeoJSON>>(new Map()); // per layer.id

  // UI state
  const [isUploadOpen, setUploadOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<GISLayer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeVersion, setActiveVersion] = useState<GVDataset | null>(null);
  const [layers, setLayers] = useState<GISLayer[]>([]);
  const [visible, setVisible] = useState<Record<number, boolean>>({
    1: true,
    2: false,
    3: false,
    4: false,
    5: false,
  });

  // ----- Map init (only once) -----
  useEffect(() => {
    if (mapRef.current || !mapContainerRef.current) return;
    const map = L.map(mapContainerRef.current, {
      center: [14.5995, 120.9842], // default center; will fit to data when available
      zoom: 5,
      zoomControl: false,
      preferCanvas: true,
    });
    L.control.zoom({ position: "bottomright" }).addTo(map);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> contributors',
      maxZoom: 19,
    }).addTo(map);
    mapRef.current = map;
  }, []);

  // ----- Load active dataset version -----
  const fetchActiveVersion = useCallback(async () => {
    const { data, error } = await supabase
      .from("gis_dataset_versions")
      .select("*")
      .eq("country_iso", countryIso)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data as GVDataset | null;
  }, [countryIso]);

  // ----- Load layers for active version -----
  const fetchVersionLayers = useCallback(
    async (versionId: string) => {
      const { data, error } = await supabase
        .from("gis_layers")
        .select("*")
        .eq("dataset_version_id", versionId)
        .eq("is_active", true)
        .order("admin_level_int", { ascending: true })
        .order("created_at", { ascending: true });

      if (error) throw error;
      return (data || []) as GISLayer[];
    },
    []
  );

  // ----- Prefer converted `gis` bucket, fallback to `gis_raw` -----
  const downloadLayerGeoJSON = useCallback(
    async (layer: GISLayer): Promise<GeoJSON.GeoJSON | null> => {
      if (!layer?.source?.path) return null;

      const tryDownload = async (bucket: "gis" | "gis_raw") => {
        const { data, error } = await supabase.storage.from(bucket).download(layer.source!.path!);
        if (!error && data) {
          const text = await data.text();
          try {
            return JSON.parse(text) as GeoJSON.GeoJSON;
          } catch {
            return null;
          }
        }
        return null;
      };

      // Cache first
      if (geojsonCacheRef.current.has(layer.id)) {
        return geojsonCacheRef.current.get(layer.id)!;
      }

      // Try converted first
      const converted = await tryDownload("gis");
      if (converted) {
        geojsonCacheRef.current.set(layer.id, converted);
        return converted;
      }

      // Fallback to raw
      const raw = await tryDownload("gis_raw");
      if (raw) {
        geojsonCacheRef.current.set(layer.id, raw);
        return raw;
      }

      return null;
    },
    []
  );

  // ----- Refresh all data (version + layers) -----
  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const version = await fetchActiveVersion();
      setActiveVersion(version);
      if (version?.id) {
        const ls = await fetchVersionLayers(version.id);
        setLayers(ls);
      } else {
        setLayers([]);
      }
    } finally {
      setIsLoading(false);
    }
  }, [fetchActiveVersion, fetchVersionLayers]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Group layers by admin level (1..5), legacy-safe fallback using `admin_level`
  const layersByLevel = useMemo(() => {
    const buckets: Record<number, GISLayer[]> = { 1: [], 2: [], 3: [], 4: [], 5: [] };
    for (const layer of layers) {
      const lvl =
        layer.admin_level_int ??
        (() => {
          const t = (layer.admin_level || "").toUpperCase();
          if (t.startsWith("ADM") && t.length >= 4) {
            const n = parseInt(t.slice(3), 10);
            return Number.isFinite(n) ? n : undefined;
          }
          return undefined;
        })();
      if (lvl && (lvl >= 1 && lvl <= 5)) buckets[lvl].push(layer);
    }
    return buckets;
  }, [layers]);

  // ----- Layer toggling / rendering -----
  const ensureGroup = (lvl: number): L.LayerGroup => {
    if (!groupsRef.current[lvl]) groupsRef.current[lvl] = L.layerGroup();
    return groupsRef.current[lvl];
  };

  const clearGroup = (lvl: number) => {
    const g = groupsRef.current[lvl];
    if (g) {
      g.clearLayers();
      if (mapRef.current && mapRef.current.hasLayer(g)) {
        mapRef.current.removeLayer(g);
      }
    }
  };

  const addLevelToMap = useCallback(
    async (lvl: number) => {
      const map = mapRef.current;
      if (!map) return;

      const group = ensureGroup(lvl);
      group.clearLayers();

      const style = LEVEL_STYLE(lvl);
      const geoLayers: L.GeoJSON[] = [];

      // Download all layers for this level (if not cached)
      for (const layer of layersByLevel[lvl] || []) {
        const gj = await downloadLayerGeoJSON(layer);
        if (gj) {
          const gl = L.geoJSON(gj, { style });
          gl.bindPopup(
            `<div class="text-sm"><div class="font-medium">${layer.layer_name}</div><div>${LEVEL_LABEL(
              lvl
            )}</div></div>`
          );
          geoLayers.push(gl);
          group.addLayer(gl);
        }
      }

      if (geoLayers.length > 0) {
        group.addTo(map);
      }
    },
    [downloadLayerGeoJSON, layersByLevel]
  );

  // Toggle visibility handlers
  const toggleLevel = async (lvl: number) => {
    const next = { ...visible, [lvl]: !visible[lvl] };
    setVisible(next);
    if (next[lvl]) {
      await addLevelToMap(lvl);
    } else {
      clearGroup(lvl);
    }
  };

  // Fit to visible layers
  const fitToVisible = () => {
    const map = mapRef.current;
    if (!map) return;
    const bounds = L.latLngBounds([]);
    let has = false;
    for (const lvl of LEVELS) {
      const g = groupsRef.current[lvl];
      if (g && map.hasLayer(g)) {
        const b = (g as any).getBounds?.();
        if (b && b.isValid()) {
          bounds.extend(b);
          has = true;
        }
      }
    }
    if (has) {
      map.fitBounds(bounds, { padding: [24, 24] });
    }
  };

  // When data changes, (re)apply visibility
  useEffect(() => {
    (async () => {
      for (const lvl of LEVELS) {
        if (visible[lvl]) {
          await addLevelToMap(lvl);
        } else {
          clearGroup(lvl);
        }
      }
      // Auto-fit once when first data arrives & any level is visible
      if (Object.values(visible).some(Boolean)) {
        fitToVisible();
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layersByLevel]);

  // ----- UI -----
  const layerCount = useMemo(
    () => layers.reduce((acc, l) => acc + (l.is_active ? 1 : 0), 0),
    [layers]
  );

  return (
    <SidebarLayout>
      <div className="flex items-center justify-between pb-4">
        <Breadcrumbs
          items={[
            { label: "Dashboard", href: "/" },
            { label: "Countries", href: "/country" },
            { label: countryIso.toUpperCase(), href: `/country/${countryIso}` },
            { label: "GIS", href: `/country/${countryIso}/gis` },
          ]}
        />
        <div className="flex items-center gap-2">
          <button
            onClick={() => setUploadOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-3 py-2 text-white shadow-sm hover:bg-red-700 focus:outline-none"
          >
            <Layers className="h-4 w-4" />
            Upload GIS
          </button>
        </div>
      </div>

      {/* Summary bar */}
      <div className="mb-3 grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <div className="text-xs uppercase tracking-wide text-gray-500">Active Version</div>
          <div className="mt-1 text-lg font-semibold">{activeVersion?.title ?? "—"}</div>
          <div className="text-sm text-gray-500">
            {activeVersion?.year ? `Year ${activeVersion.year}` : "No year"}
          </div>
        </div>
        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <div className="text-xs uppercase tracking-wide text-gray-500">Active Layers</div>
          <div className="mt-1 text-lg font-semibold">{layerCount}</div>
          <div className="text-sm text-gray-500">ADM1–ADM5 supported</div>
        </div>
        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <div className="text-xs uppercase tracking-wide text-gray-500">Country</div>
          <div className="mt-1 text-lg font-semibold">{countryIso.toUpperCase()}</div>
          <div className="text-sm text-gray-500">SSC GIS</div>
        </div>
      </div>

      {/* Map */}
      <div className="relative h-[70vh] w-full overflow-hidden rounded-2xl border bg-white shadow-sm">
        {/* Overlay controls (top-left) */}
        <div className="pointer-events-auto absolute left-3 top-3 z-[5000] w-auto select-none rounded-xl border bg-white/95 p-3 shadow-lg backdrop-blur">
          <div className="mb-2 flex items-center gap-2">
            <MapIcon className="h-4 w-4 text-gray-600" />
            <span className="text-sm font-medium">Layers</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {LEVELS.map((lvl) => (
              <label
                key={lvl}
                className="flex items-center gap-2 rounded-lg border px-2 py-1.5 text-sm"
              >
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-red-600"
                  checked={!!visible[lvl]}
                  onChange={() => toggleLevel(lvl)}
                />
                <span className="inline-flex items-center gap-1">
                  <span
                    className="inline-block h-3 w-3 rounded"
                    style={{ backgroundColor: (LEVEL_STYLE(lvl).color as string) || "#999" }}
                    aria-hidden
                  />
                  {LEVEL_LABEL(lvl)}
                </span>
              </label>
            ))}
          </div>
          <div className="mt-2 flex items-center justify-between gap-2">
            <button
              onClick={fitToVisible}
              className="inline-flex items-center gap-2 rounded-lg border px-2 py-1.5 text-sm hover:bg-gray-50"
              title="Fit to visible"
            >
              <Maximize className="h-4 w-4" />
              Fit
            </button>
            <div className="text-xs text-gray-500">
              {isLoading ? (
                <span className="inline-flex items-center gap-1">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…
                </span>
              ) : (
                `${layerCount} layer${layerCount === 1 ? "" : "s"}`
              )}
            </div>
          </div>
        </div>

        {/* Actual map container */}
        <div ref={mapContainerRef} className="h-full w-full" />

        {/* Ensure upload modal overlays (z-index high) */}
        {isUploadOpen && (
          <UploadGISModal
            countryIso={countryIso}
            onClose={() => setUploadOpen(false)}
            onUploaded={async () => {
              // Refresh and keep map state
              await refresh();
            }}
          />
        )}

        {/* Edit layer modal */}
        {editTarget && (
          <EditGISLayerModal
            layer={editTarget}
            onClose={() => setEditTarget(null)}
            onSaved={async () => {
              setEditTarget(null);
              await refresh();
            }}
          />
        )}
      </div>

      {/* Layers list (metadata & quick actions) */}
      <div className="mt-4 rounded-2xl border bg-white p-4 shadow-sm">
        <div className="mb-2 flex items-center justify-between">
          <div className="text-sm font-medium">Layers in Active Version</div>
          <div className="text-xs text-gray-500">
            {activeVersion ? activeVersion.title : "No active version"}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-gray-500">
              <tr>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Level</th>
                <th className="px-3 py-2">Format</th>
                <th className="px-3 py-2">Features</th>
                <th className="px-3 py-2">CRS</th>
                <th className="px-3 py-2">Source</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {layers.map((l) => {
                const lvl = l.admin_level_int ?? Number((l.admin_level || "").replace("ADM", "")) || null;
                return (
                  <tr key={l.id} className="border-t">
                    <td className="px-3 py-2">{l.layer_name}</td>
                    <td className="px-3 py-2">
                      {lvl ? (
                        <span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium">
                          {LEVEL_LABEL(lvl)}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">Unassigned</span>
                      )}
                    </td>
                    <td className="px-3 py-2">{l.format}</td>
                    <td className="px-3 py-2">{l.feature_count ?? "—"}</td>
                    <td className="px-3 py-2">{l.crs ?? "—"}</td>
                    <td className="px-3 py-2">
                      <span className="text-xs text-gray-500">
                        {l.source?.bucket ?? "gis_raw"}/{l.source?.path ?? "—"}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <button
                          className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs hover:bg-gray-50"
                          onClick={() => setEditTarget(l)}
                        >
                          Edit
                        </button>
                        <button
                          className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs hover:bg-gray-50"
                          onClick={() => {
                            const n = l.admin_level_int ?? 0;
                            if (n >= 1 && n <= 5) toggleLevel(n);
                          }}
                        >
                          {(() => {
                            const n = l.admin_level_int ?? 0;
                            const isOn = n >= 1 && n <= 5 ? visible[n] : false;
                            const Icon = isOn ? EyeOff : Eye;
                            return <Icon className="h-4 w-4" />;
                          })()}
                          Toggle
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {layers.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-3 py-6 text-center text-sm text-gray-500">
                    No layers found for the active version.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </SidebarLayout>
  );
}

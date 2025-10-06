"use client";

import { use, useEffect, useMemo, useRef, useState, useCallback } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  Layers,
  Map as MapIcon,
  Eye,
  EyeOff,
  Maximize,
  Loader2,
} from "lucide-react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import UploadGISModal from "@/components/country/UploadGISModal";
import EditGISLayerModal from "@/components/country/EditGISLayerModal";

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
  admin_level?: string | null;
  admin_level_int?: number | null;
  is_active: boolean;
};

const LEVELS = [1, 2, 3, 4, 5] as const;
const LEVEL_LABEL = (lvl: number) => `ADM${lvl}`;
const LEVEL_STYLE = (lvl: number): L.PathOptions => ({
  color: ["#7b1fa2", "#1976d2", "#388e3c", "#f57c00", "#c2185b"][lvl - 1] || "#424242",
  weight: 2 + (6 - lvl),
  fill: false,
  opacity: 0.9,
});

export default function CountryGISPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // ✅ unwrap promise-based params (Next 15)
  const { id } = use(params);
  const countryIso = id;

  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const groupsRef = useRef<Record<number, L.LayerGroup>>({});
  const cache = useRef<Map<string, GeoJSON.GeoJSON>>(new Map());

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

  // ───────── Map setup ─────────
  useEffect(() => {
    if (mapRef.current || !mapContainerRef.current) return;
    const m = L.map(mapContainerRef.current, {
      center: [14.6, 120.98],
      zoom: 5,
      zoomControl: false,
      preferCanvas: true,
    });
    L.control.zoom({ position: "bottomright" }).addTo(m);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
      maxZoom: 19,
    }).addTo(m);
    mapRef.current = m;
  }, []);

  // ───────── Data loaders ─────────
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

  const fetchVersionLayers = useCallback(async (id: string) => {
    const { data, error } = await supabase
      .from("gis_layers")
      .select("*")
      .eq("dataset_version_id", id)
      .eq("is_active", true)
      .order("admin_level_int", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) throw error;
    return (data || []) as GISLayer[];
  }, []);

  const getGeoJSON = useCallback(
    async (l: GISLayer) => {
      if (!l?.source?.path) return null;
      if (cache.current.has(l.id)) return cache.current.get(l.id)!;
      const tryB = async (b: "gis" | "gis_raw") => {
        const { data, error } = await supabase.storage
          .from(b)
          .download(l.source!.path!);
        if (error || !data) return null;
        try {
          return JSON.parse(await data.text());
        } catch {
          return null;
        }
      };
      const g = (await tryB("gis")) || (await tryB("gis_raw"));
      if (g) cache.current.set(l.id, g);
      return g;
    },
    []
  );

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const v = await fetchActiveVersion();
      setActiveVersion(v);
      setLayers(v?.id ? await fetchVersionLayers(v.id) : []);
    } finally {
      setIsLoading(false);
    }
  }, [fetchActiveVersion, fetchVersionLayers]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // ───────── Group by admin level ─────────
  const layersByLevel = useMemo(() => {
    const out: Record<number, GISLayer[]> = { 1: [], 2: [], 3: [], 4: [], 5: [] };
    for (const l of layers) {
      const lvl =
        l.admin_level_int ??
        (() => {
          const t = (l.admin_level || "").toUpperCase();
          if (t.startsWith("ADM")) {
            const n = parseInt(t.slice(3));
            return Number.isFinite(n) ? n : undefined;
          }
        })();
      if (lvl && lvl >= 1 && lvl <= 5) out[lvl].push(l);
    }
    return out;
  }, [layers]);

  const ensureGroup = (lvl: number) => {
    if (!groupsRef.current[lvl]) groupsRef.current[lvl] = L.layerGroup();
    return groupsRef.current[lvl];
  };
  const clearGroup = (lvl: number) => {
    const g = groupsRef.current[lvl];
    const m = mapRef.current;
    if (g && m && m.hasLayer(g)) m.removeLayer(g);
    g?.clearLayers();
  };
  const addLevel = useCallback(
    async (lvl: number) => {
      const m = mapRef.current;
      if (!m) return;
      const g = ensureGroup(lvl);
      g.clearLayers();
      const s = LEVEL_STYLE(lvl);
      for (const l of layersByLevel[lvl] || []) {
        const gj = await getGeoJSON(l);
        if (gj) {
          const gl = L.geoJSON(gj, { style: s });
          gl.bindPopup(
            `<div class='text-sm'><div class='font-medium'>${l.layer_name}</div><div>${LEVEL_LABEL(
              lvl
            )}</div></div>`
          );
          g.addLayer(gl);
        }
      }
      if (g.getLayers().length > 0) g.addTo(m);
    },
    [getGeoJSON, layersByLevel]
  );

  const toggle = async (lvl: number) => {
    const n = { ...visible, [lvl]: !visible[lvl] };
    setVisible(n);
    if (n[lvl]) await addLevel(lvl);
    else clearGroup(lvl);
  };
  const fit = () => {
    const m = mapRef.current;
    if (!m) return;
    const b = L.latLngBounds([]);
    let h = false;
    for (const l of LEVELS) {
      const g = groupsRef.current[l];
      if (g && m.hasLayer(g)) {
        const bb = (g as any).getBounds?.();
        if (bb && bb.isValid()) {
          b.extend(bb);
          h = true;
        }
      }
    }
    if (h) m.fitBounds(b, { padding: [24, 24] });
  };

  useEffect(() => {
    (async () => {
      for (const l of LEVELS) {
        if (visible[l]) await addLevel(l);
        else clearGroup(l);
      }
      if (Object.values(visible).some(Boolean)) fit();
    })();
  }, [layersByLevel]); // eslint-disable-line

  const count = useMemo(() => layers.filter((l) => l.is_active).length, [layers]);

  // ───────── Render ─────────
  return (
    <SidebarLayout
      headerProps={{
        title: "GIS Datasets",
        group: "country-config", // ✅ correct for Country Config child
        description: "Manage and visualize GIS layers for the selected country.",
        breadcrumbs: (
          <Breadcrumbs
            items={[
              { label: "Dashboard", href: "/" },
              { label: "Countries", href: "/country" },
              { label: countryIso.toUpperCase(), href: `/country/${countryIso}` },
              { label: "GIS", href: `/country/${countryIso}/gis` },
            ]}
          />
        ),
      }}
    >
      {/* summary cards */}
      <div className="mb-3 grid grid-cols-1 gap-3 md:grid-cols-3">
        {[{ t: "Active Version", v: activeVersion?.title ?? "—", s: activeVersion?.year ? `Year ${activeVersion.year}` : "No year" },
          { t: "Active Layers", v: String(count), s: "ADM1–ADM5 supported" },
          { t: "Country", v: countryIso.toUpperCase(), s: "SSC GIS" }].map((x, i) => (
          <div key={i} className="rounded-2xl border bg-white p-4 shadow-sm">
            <div className="text-xs text-gray-500">{x.t}</div>
            <div className="mt-1 text-lg font-semibold">{x.v}</div>
            <div className="text-sm text-gray-500">{x.s}</div>
          </div>
        ))}
      </div>

      {/* map and controls */}
      <div className="relative h-[70vh] rounded-2xl border bg-white shadow-sm">
        <div className="absolute left-3 top-3 z-[5000] rounded-xl border bg-white/95 p-3 shadow-lg backdrop-blur">
          <div className="mb-2 flex items-center gap-2">
            <MapIcon className="h-4 w-4 text-gray-600" />
            <span className="text-sm font-medium">Layers</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {LEVELS.map((l) => (
              <label
                key={l}
                className="flex items-center gap-2 rounded-lg border px-2 py-1.5 text-sm"
              >
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-red-600"
                  checked={!!visible[l]}
                  onChange={() => toggle(l)}
                />
                <span className="inline-flex items-center gap-1">
                  <span
                    className="inline-block h-3 w-3 rounded"
                    style={{ backgroundColor: LEVEL_STYLE(l).color as string }}
                  />
                  {LEVEL_LABEL(l)}
                </span>
              </label>
            ))}
          </div>
          <div className="mt-2 flex items-center justify-between gap-2">
            <button
              onClick={fit}
              className="inline-flex items-center gap-2 rounded-lg border px-2 py-1.5 text-sm hover:bg-gray-50"
            >
              <Maximize className="h-4 w-4" /> Fit
            </button>
            <div className="text-xs text-gray-500">
              {isLoading ? (
                <span className="inline-flex items-center gap-1">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…
                </span>
              ) : (
                `${count} layer${count === 1 ? "" : "s"}`
              )}
            </div>
          </div>
        </div>

        <div ref={mapContainerRef} className="h-full w-full" />

        {isUploadOpen && (
          <UploadGISModal
            countryIso={countryIso}
            onClose={() => setUploadOpen(false)}
            onUploaded={refresh}
          />
        )}
        {editTarget && (
          <EditGISLayerModal
            layer={editTarget}
            onClose={() => setEditTarget(null)}
            onSaved={refresh}
          />
        )}
      </div>

      {/* table */}
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
              {layers.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-3 py-6 text-center text-sm text-gray-500"
                  >
                    No layers found for active version.
                  </td>
                </tr>
              ) : (
                layers.map((l) => {
                  const lvl =
                    l.admin_level_int ??
                    (Number((l.admin_level || "").replace("ADM", "")) || null);
                  
                  const on = lvl && lvl >= 1 && lvl <= 5 ? visible[lvl] : false;
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
                      <td className="px-3 py-2 text-xs text-gray-500">
                        {l.source?.bucket ?? "gis_raw"}/{l.source?.path ?? "—"}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <button
                            className="rounded-md border px-2 py-1 text-xs hover:bg-gray-50"
                            onClick={() => setEditTarget(l)}
                          >
                            Edit
                          </button>
                          <button
                            className="rounded-md border px-2 py-1 text-xs hover:bg-gray-50"
                            onClick={() => lvl && toggle(lvl)}
                          >
                            {on ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />} Toggle
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </SidebarLayout>
  );
}

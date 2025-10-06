"use client";

import { use, useCallback, useEffect, useRef, useState } from "react";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import UploadGISModal from "@/components/country/UploadGISModal";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { Layers, Upload, RotateCcw, Clipboard } from "lucide-react";
import type { CountryParams } from "@/app/country/types";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const SUPABASE_REF = "ergsggprgtlsrrsmwtkf";
const GSC_RED = "#C72B2B";

type GISDatasetVersion = {
  id: string;
  country_iso: string;
  title: string;
  source: string | null;
  year: number | null;
  dataset_date: string | null;
};

type GISLayer = {
  id: string;
  dataset_version_id: string | null;
  layer_name: string;
  format: string;
  feature_count: number | null;
  crs: string | null;
  source: any;
  admin_level_int: number | null;
  is_active: boolean;
};

const LEVELS = [0, 1, 2, 3, 4, 5] as const;

const LEVEL_STYLE = (lvl: number): L.PathOptions => ({
  color:
    ["#000000", "#e41a1c", "#377eb8", "#4daf4a", "#ff7f00", "#984ea3"][lvl] ||
    "#000000",
  weight: lvl === 0 ? 2 : 1.5,
  fillOpacity: lvl === 0 ? 0.0 : 0.05,
  opacity: 0.9,
});

export default function CountryGISPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const countryIso = id.toUpperCase();

  const mapRef = useRef<L.Map | null>(null);
  const layerGroups = useRef<Record<number, L.LayerGroup>>({});
  const [dataset, setDataset] = useState<GISDatasetVersion | null>(null);
  const [layers, setLayers] = useState<GISLayer[]>([]);
  const [visible, setVisible] = useState<Record<number, boolean>>({
    0: true,
    1: true,
    2: false,
    3: false,
    4: false,
    5: false,
  });
  const [openUpload, setOpenUpload] = useState(false);
  const [replaceLevel, setReplaceLevel] = useState<number | null>(null);
  const [zoomLocked, setZoomLocked] = useState(true);

  // ───────────── Fetch Active Dataset Version ─────────────
  const fetchActiveVersion = useCallback(async () => {
    const { data, error } = await supabase
      .from("gis_dataset_versions")
      .select("*")
      .eq("country_iso", countryIso)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("Supabase error:", error.message);
      return null;
    }
    return data as GISDatasetVersion | null;
  }, [countryIso]);

  // ───────────── Fetch Layers ─────────────
  const fetchLayers = useCallback(
    async (versionId: string | null) => {
      const query = supabase
        .from("gis_layers")
        .select("*")
        .eq("country_iso", countryIso)
        .eq("is_active", true);
      if (versionId) query.eq("dataset_version_id", versionId);
      const { data, error } = await query;
      if (error) {
        console.error("Supabase layers error:", error.message);
        return [];
      }
      return (data as GISLayer[]).sort(
        (a, b) => (a.admin_level_int ?? 99) - (b.admin_level_int ?? 99)
      );
    },
    [countryIso]
  );

  // ───────────── Load GeoJSON + Feature Count ─────────────
  const getGeoJSON = async (layer: GISLayer) => {
    try {
      const rawPath = layer.source?.path || "";
      const cleanPath = rawPath.replace(/^gis_raw\//, "").replace(/^gis\//, "");

      const { data, error } = await supabase.storage
        .from("gis_raw")
        .download(cleanPath);

      if (error) {
        console.error("Storage error:", error.message, "→ path:", cleanPath);
        return null;
      }

      const text = await data.text();
      const gj = JSON.parse(text);
      const count = gj.features?.length ?? 0;

      if (!layer.feature_count || layer.feature_count !== count) {
        await supabase
          .from("gis_layers")
          .update({ feature_count: count })
          .eq("id", layer.id);
      }

      return gj;
    } catch (err: any) {
      console.error("GeoJSON parse error:", err.message);
      return null;
    }
  };

  // ───────────── Add Layer to Map ─────────────
  const addLevel = async (lvl: number, layer: GISLayer) => {
    const map = mapRef.current;
    if (!map) return;
    const gj = await getGeoJSON(layer);
    if (!gj) return;
    const group = L.layerGroup();
    const gl = L.geoJSON(gj, { style: LEVEL_STYLE(lvl), pane: "geojson" });
    gl.addTo(group);
    group.addTo(map);
    layerGroups.current[lvl] = group;
  };

  const clearLevel = (lvl: number) => {
    const map = mapRef.current;
    if (!map) return;
    const group = layerGroups.current[lvl];
    if (group) {
      map.removeLayer(group);
      delete layerGroups.current[lvl];
    }
  };

  const fit = () => {
    const map = mapRef.current;
    if (!map) return;
    const bounds = L.latLngBounds([]);
    Object.values(layerGroups.current).forEach((g) => {
      g.eachLayer((l: any) => {
        if (l.getBounds) bounds.extend(l.getBounds());
      });
    });
    if (bounds.isValid()) map.fitBounds(bounds);
  };

  // ───────────── Initialize Map ─────────────
  useEffect(() => {
    if (typeof window === "undefined") return;

    const m = L.map("map", { center: [12, 121], zoom: 5, scrollWheelZoom: false });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(m);
    m.createPane("geojson");
    m.getPane("geojson")!.style.zIndex = "400";
    mapRef.current = m;

    return () => {
      m.remove();
      mapRef.current = null;
    };
  }, []);

  const toggleZoomLock = () => {
    const map = mapRef.current;
    if (!map) return;
    if (zoomLocked) {
      map.scrollWheelZoom.enable();
      map.touchZoom.enable();
    } else {
      map.scrollWheelZoom.disable();
      map.touchZoom.disable();
    }
    setZoomLocked(!zoomLocked);
  };

  // ───────────── Load Active Dataset & Layers ─────────────
  useEffect(() => {
    (async () => {
      const v = await fetchActiveVersion();
      setDataset(v);
      const ls = await fetchLayers(v?.id ?? null);
      setLayers(ls);
    })();
  }, [fetchActiveVersion, fetchLayers]);

  // ───────────── Toggle Layers ─────────────
  useEffect(() => {
    (async () => {
      const map = mapRef.current;
      if (!map) return;
      for (const lvl of LEVELS) {
        const layer = layers.find((l) => l.admin_level_int === lvl);
        if (!layer) continue;
        if (visible[lvl]) await addLevel(lvl, layer);
        else clearLevel(lvl);
      }
      fit();
    })();
  }, [visible, layers]);

  const handleCopy = (path: string) => {
    const fullUrl = `https://${SUPABASE_REF}.supabase.co/storage/v1/object/public/gis_raw/${path}`;
    navigator.clipboard.writeText(fullUrl);
    alert("Copied to clipboard!");
  };

  // ───────────── Render ─────────────
  return (
    <SidebarLayout
      headerProps={{
        title: "GIS Datasets",
        group: "country-config",
        description: "Manage and visualize GIS layers for the selected country.",
        breadcrumbs: (
          <Breadcrumbs
            items={[
              { label: "Dashboard", href: "/" },
              { label: "Countries", href: "/country" },
              { label: countryIso, href: `/country/${countryIso}` },
              { label: "GIS", href: `/country/${countryIso}/gis` },
            ]}
          />
        ),
      }}
    >
      {/* Summary cards */}
      <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <div className="text-xs uppercase text-gray-500">Active Version</div>
          {dataset ? (
            <>
              <div className="mt-1 text-base font-semibold">{dataset.title}</div>
              <div className="text-sm text-gray-500">
                {dataset.year ? dataset.year : "No year"}
              </div>
            </>
          ) : (
            <div className="mt-1 text-sm text-gray-500 italic">
              No active dataset version
              <br />
              <span className="text-xs text-gray-400">
                Layers are not yet grouped into a version
              </span>
            </div>
          )}
        </div>
        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <div className="text-xs uppercase text-gray-500">Active Layers</div>
          <div className="mt-1 text-base font-semibold">
            {layers.length > 0 ? layers.length : "0"}
          </div>
          <div className="text-sm text-gray-500">ADM0–ADM5 supported</div>
        </div>
        <div className="rounded-2xl border bg-white p-4 shadow-sm flex justify-between items-center">
          <div>
            <div className="text-xs uppercase text-gray-500">Country</div>
            <div className="mt-1 text-base font-semibold">{countryIso}</div>
            <div className="text-sm text-gray-500">SSC GIS</div>
          </div>
          <button
            onClick={() => setOpenUpload(true)}
            className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-white shadow-sm"
            style={{ backgroundColor: GSC_RED }}
          >
            <Upload className="h-4 w-4" />
            Upload GIS
          </button>
        </div>
      </div>

      {/* Dataset table */}
      <div className="mb-4 overflow-x-auto rounded-2xl border bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-gray-600">
            <tr>
              <th className="p-2 text-left w-16">Level</th>
              <th className="p-2 text-left">Layer</th>
              <th className="p-2 text-left">Features</th>
              <th className="p-2 text-left">CRS</th>
              <th className="p-2 text-left">Format</th>
              <th className="p-2 text-left">Source</th>
              <th className="p-2 text-left w-12"></th>
            </tr>
          </thead>
          <tbody>
            {layers.map((l) => (
              <tr key={l.id} className="border-t hover:bg-gray-50">
                <td className="p-2 font-medium">
                  {l.admin_level_int !== null ? `ADM${l.admin_level_int}` : "—"}
                </td>
                <td className="p-2">{l.layer_name}</td>
                <td className="p-2">{l.feature_count ?? "—"}</td>
                <td className="p-2">{l.crs ?? "—"}</td>
                <td className="p-2">{l.format}</td>
                <td className="p-2">
                  {l.source?.path ? (
                    <button
                      onClick={() => handleCopy(l.source.path)}
                      title="Copy public URL"
                      className="flex items-center gap-1 text-xs text-white px-2 py-1 rounded"
                      style={{ backgroundColor: GSC_RED }}
                    >
                      <Clipboard className="h-3 w-3" />
                      Copy
                    </button>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="p-2 text-right">
                  <button
                    onClick={() => setReplaceLevel(l.admin_level_int ?? null)}
                    title="Replace layer"
                    className="text-gray-600 hover:text-[color:var(--gsc-red)]"
                    style={{ color: GSC_RED }}
                  >
                    <RotateCcw className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Map */}
      <div className="relative h-[600px] w-full overflow-hidden rounded-2xl border shadow-sm">
        <div id="map" className="h-full w-full z-0 rounded-2xl" />

        {/* Floating mini control */}
        <div className="absolute left-4 top-4 z-[1000] rounded-xl bg-white/90 backdrop-blur p-3 shadow-md border border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <Layers className="h-4 w-4 text-gray-700" />
            <span className="text-sm font-semibold">Layers</span>
          </div>
          {LEVELS.map((lvl) => (
            <label key={lvl} className="flex items-center gap-1 text-xs mb-1">
              <input
                type="checkbox"
                checked={visible[lvl]}
                onChange={(e) =>
                  setVisible((v) => ({ ...v, [lvl]: e.target.checked }))
                }
              />
              ADM{lvl}
            </label>
          ))}
          <button
            onClick={fit}
            className="mt-2 w-full rounded border px-2 py-1 text-xs hover:bg-gray-50"
          >
            Fit
          </button>
          <button
            onClick={toggleZoomLock}
            className="mt-2 w-full rounded border px-2 py-1 text-xs hover:bg-gray-50"
          >
            {zoomLocked ? "🔒 Zoom Locked" : "🔓 Unlock Zoom"}
          </button>
        </div>
      </div>

      {/* Upload Modal */}
      {(openUpload || replaceLevel !== null) && (
        <UploadGISModal
          countryIso={countryIso}
          onClose={() => {
            setOpenUpload(false);
            setReplaceLevel(null);
          }}
          onUploaded={async () => {
            setOpenUpload(false);
            setReplaceLevel(null);
            const v = await fetchActiveVersion();
            if (v) {
              const ls = await fetchLayers(v.id);
              setLayers(ls);
            }
          }}
        />
      )}
    </SidebarLayout>
  );
}

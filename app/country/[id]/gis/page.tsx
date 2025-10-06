"use client";

import { use, useCallback, useEffect, useRef, useState } from "react";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import UploadGISModal from "@/components/country/UploadGISModal";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { Layers, Upload } from "lucide-react";
import type { CountryParams } from "@/app/country/types";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

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
  const [loading, setLoading] = useState(true);
  const [openUpload, setOpenUpload] = useState(false);

  // ───────────── Fetch Active Dataset Version ─────────────
  const fetchActiveVersion = useCallback(async () => {
    try {
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
    } catch (err: any) {
      console.error("Unexpected fetch error:", err.message);
      return null;
    }
  }, [countryIso]);

  // ───────────── Fetch Layers ─────────────
  const fetchLayers = useCallback(async (versionId: string | null) => {
    try {
      const query = supabase.from("gis_layers").select("*").eq("country_iso", countryIso).eq("is_active", true);
      if (versionId) query.eq("dataset_version_id", versionId);
      const { data, error } = await query;
      if (error) {
        console.error("Supabase layers error:", error.message);
        return [];
      }
      return data as GISLayer[];
    } catch (err: any) {
      console.error("Unexpected layer fetch error:", err.message);
      return [];
    }
  }, [countryIso]);

  // ───────────── Load GeoJSON ─────────────
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
      return JSON.parse(text);
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
    console.log(`Loaded layer ${layer.layer_name} with ${gj.features?.length ?? 0} features`);
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
    if (typeof window === "undefined") return; // ✅ prevent SSR crash

    const m = L.map("map", { center: [12, 121], zoom: 5 });
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

  // ───────────── Load Active Dataset & Layers ─────────────
  useEffect(() => {
    (async () => {
      setLoading(true);
      const v = await fetchActiveVersion();
      setDataset(v);
      const ls = await fetchLayers(v?.id ?? null);
      setLayers(ls);
      setLoading(false);
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
          <div className="mt-1 text-base font-semibold">
            {dataset?.title || "No active version"}
          </div>
          <div className="text-sm text-gray-500">
            {dataset?.year ? dataset.year : "No year"}
          </div>
        </div>
        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <div className="text-xs uppercase text-gray-500">Active Layers</div>
          <div className="mt-1 text-base font-semibold">
            {layers.length > 0 ? layers.length : "0"}
          </div>
          <div className="text-sm text-gray-500">ADM0–ADM5 supported</div>
        </div>
        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <div className="text-xs uppercase text-gray-500">Country</div>
          <div className="mt-1 text-base font-semibold">{countryIso}</div>
          <div className="text-sm text-gray-500">SSC GIS</div>
        </div>
      </div>

      {/* Layer controls + Upload */}
      <div className="mb-4 rounded-2xl border bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-gray-700" />
            <h2 className="text-base font-semibold">Layer Visibility</h2>
          </div>
          <button
            onClick={() => setOpenUpload(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-3 py-2 text-sm text-white shadow-sm hover:bg-red-700"
          >
            <Upload className="h-4 w-4" />
            Upload GIS
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {LEVELS.map((lvl) => (
            <label key={lvl} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={visible[lvl]}
                onChange={(e) =>
                  setVisible((v) => ({ ...v, [lvl]: e.target.checked }))
                }
              />
              <span>ADM{lvl}</span>
            </label>
          ))}
        </div>

        <button
          onClick={fit}
          className="mt-3 w-full rounded border px-2 py-1 text-xs hover:bg-gray-50"
        >
          Fit to Bounds
        </button>
      </div>

      {/* Map */}
      <div id="map" className="h-[600px] w-full rounded-2xl border shadow-sm z-0"></div>

      {/* Table */}
      <div className="mt-4 overflow-x-auto rounded-2xl border bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-gray-600">
            <tr>
              <th className="p-2 text-left">Name</th>
              <th className="p-2 text-left">Level</th>
              <th className="p-2 text-left">Format</th>
              <th className="p-2 text-left">Features</th>
              <th className="p-2 text-left">CRS</th>
              <th className="p-2 text-left">Source</th>
            </tr>
          </thead>
          <tbody>
            {layers.map((l) => (
              <tr key={l.id} className="border-t">
                <td className="p-2">{l.layer_name}</td>
                <td className="p-2">
                  {l.admin_level_int !== null
                    ? `ADM${l.admin_level_int}`
                    : "—"}
                </td>
                <td className="p-2">{l.format}</td>
                <td className="p-2">{l.feature_count ?? "—"}</td>
                <td className="p-2">{l.crs ?? "—"}</td>
                <td className="p-2 break-all">{l.source?.path ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Upload Modal */}
      {openUpload && (
        <UploadGISModal
          countryIso={countryIso}
          onClose={() => setOpenUpload(false)}
          onUploaded={async () => {
            setOpenUpload(false);
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

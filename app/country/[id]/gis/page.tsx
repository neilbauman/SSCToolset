"use client";

import { use, useCallback, useEffect, useRef, useState } from "react";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import UploadGISModal from "@/components/country/UploadGISModal";
import CreateGISVersionModal from "@/components/country/CreateGISVersionModal";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { Layers, Upload, RotateCcw, Clipboard } from "lucide-react";
import type { CountryParams } from "@/app/country/types";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const SUPABASE_REF = "ergsggprgtlsrrsmwtkf";
const GSC_RED = "#C72B2B";
const GSC_BLUE = "#0072CE";

//
// 🔹 Type Definitions
//
type GISDatasetVersion = {
  id: string;
  country_iso: string;
  title: string;
  source: string | null;
  year: number | null;
  dataset_date: string | null;
  is_active: boolean;
  created_at?: string;
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
  const [dataset, setDataset] = useState<GISDatasetVersion | null>(null);
  const [versions, setVersions] = useState<GISDatasetVersion[]>([]);
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
  const [openNewVersion, setOpenNewVersion] = useState(false);

  // ───────────── Fetch Versions ─────────────
  const fetchVersions = useCallback(async () => {
    const { data, error } = await supabase
      .from("gis_dataset_versions")
      .select("*")
      .eq("country_iso", countryIso)
      .order("created_at", { ascending: false });
    if (error) console.error(error);
    setVersions(data || []);
    const active = data?.find((v) => v.is_active) || null;
    setDataset(active);
  }, [countryIso]);

  // ───────────── Fetch Layers ─────────────
  const fetchLayers = useCallback(async () => {
    if (!dataset) return;
    const { data, error } = await supabase
      .from("gis_layers")
      .select("*")
      .eq("country_iso", countryIso)
      .eq("is_active", true)
      .eq("dataset_version_id", dataset.id)
      .order("admin_level_int", { ascending: true });
    if (error) console.error(error);
    setLayers(data || []);
  }, [countryIso, dataset]);

  // ───────────── Switch Version ─────────────
  const switchVersion = async (id: string) => {
    await supabase
      .from("gis_dataset_versions")
      .update({ is_active: false })
      .eq("country_iso", countryIso);
    await supabase
      .from("gis_dataset_versions")
      .update({ is_active: true })
      .eq("id", id);
    await fetchVersions();
    await fetchLayers();
  };

  // ───────────── Map Setup ─────────────
  useEffect(() => {
    if (typeof window === "undefined") return;

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

  // ───────────── Load Versions & Layers ─────────────
  useEffect(() => {
    (async () => {
      await fetchVersions();
    })();
  }, [fetchVersions]);

  useEffect(() => {
    (async () => {
      await fetchLayers();
    })();
  }, [fetchLayers]);

  // ───────────── Handle Copy ─────────────
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
      {/* Summary Cards */}
      <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
        {/* Version Control Card */}
        <div className="rounded-2xl border bg-white p-4 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs uppercase text-gray-500">Dataset Version</div>
            <button
              onClick={() => setOpenNewVersion(true)}
              className="rounded px-2 py-1 text-xs text-white"
              style={{ backgroundColor: GSC_RED }}
            >
              + New
            </button>
          </div>
          {versions.length > 0 ? (
            <select
              value={dataset?.id || ""}
              onChange={(e) => switchVersion(e.target.value)}
              className="w-full rounded border p-2 text-sm bg-white"
              style={{ borderColor: GSC_BLUE }}
            >
              {versions.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.title} {v.year ? `(${v.year})` : ""}
                </option>
              ))}
            </select>
          ) : (
            <div className="text-sm text-gray-500 italic">
              No versions created yet
            </div>
          )}
        </div>

        {/* Active Layers */}
        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <div className="text-xs uppercase text-gray-500">Active Layers</div>
          <div className="mt-1 text-base font-semibold">
            {layers.length > 0 ? layers.length : "0"}
          </div>
          <div className="text-sm text-gray-500">ADM0–ADM5 supported</div>
        </div>

        {/* Country + Upload */}
        <div className="rounded-2xl border bg-white p-4 shadow-sm flex justify-between items-center">
          <div>
            <div className="text-xs uppercase text-gray-500">Country</div>
            <div className="mt-1 text-base font-semibold">{countryIso}</div>
            <div className="text-sm text-gray-500">SSC GIS</div>
          </div>
          <button
            onClick={() => setOpenUpload(true)}
            className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-white shadow-sm hover:opacity-90"
            style={{ backgroundColor: GSC_RED }}
          >
            <Upload className="h-4 w-4" />
            Upload GIS
          </button>
        </div>
      </div>

      {/* Dataset Table */}
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
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Map */}
      <div className="relative h-[600px] w-full overflow-hidden rounded-2xl border shadow-sm">
        <div id="map" className="h-full w-full z-0 rounded-2xl" />
      </div>

      {/* Modals */}
      {openUpload && (
        <UploadGISModal
          countryIso={countryIso}
          onClose={() => setOpenUpload(false)}
          onUploaded={async () => {
            await fetchLayers();
            await fetchVersions();
            setOpenUpload(false);
          }}
        />
      )}

      {openNewVersion && (
        <CreateGISVersionModal
          countryIso={countryIso}
          onClose={() => setOpenNewVersion(false)}
          onCreated={async () => {
            await fetchVersions();
            setOpenNewVersion(false);
          }}
        />
      )}
    </SidebarLayout>
  );
}

"use client";

import { use, useCallback, useEffect, useRef, useState } from "react";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import UploadGISModal from "@/components/country/UploadGISModal";
import CreateGISVersionModal from "@/components/country/CreateGISVersionModal";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { Layers, Upload, RotateCcw, Clipboard, ChevronDown } from "lucide-react";
import type { CountryParams } from "@/app/country/types";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const SUPABASE_REF = "ergsggprgtlsrrsmwtkf";
const GSC_RED = "#C72B2B";
const GSC_BLUE = "#0072CE";

// ... all your existing types, map setup, and helper functions stay unchanged

export default function CountryGISPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const countryIso = id.toUpperCase();

  const mapRef = useRef<L.Map | null>(null);
  const [dataset, setDataset] = useState<GISDatasetVersion | null>(null);
  const [versions, setVersions] = useState<GISDatasetVersion[]>([]);
  const [openUpload, setOpenUpload] = useState(false);
  const [openNewVersion, setOpenNewVersion] = useState(false);

  // ───────────── Fetch all versions ─────────────
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
    await refreshLayers();
  };

  // ───────────── Refresh layers ─────────────
  const refreshLayers = useCallback(async () => {
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

  // ───────────── On mount ─────────────
  useEffect(() => {
    fetchVersions();
  }, [fetchVersions]);

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

      {/* existing dataset table + map sections remain unchanged */}

      {/* Modals */}
      {openUpload && (
        <UploadGISModal
          countryIso={countryIso}
          onClose={() => setOpenUpload(false)}
          onUploaded={async () => {
            await refreshLayers();
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

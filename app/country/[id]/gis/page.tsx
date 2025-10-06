"use client";

import { useState, useEffect, useRef } from "react";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import UploadGISModal from "@/components/country/UploadGISModal";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { Map as MapIcon, Upload, Layers } from "lucide-react";
import type { CountryParams } from "@/app/country/types";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

type GISLayer = {
  id: string;
  layer_name: string;
  admin_level: string | null;
  admin_level_int: number | null;
  source: any;
  format: string | null;
  crs: string | null;
  feature_count: number | null;
};

type GISDatasetVersion = {
  id: string;
  title: string;
  year: number | null;
  is_active: boolean;
  country_iso: string;
};

export default function GISPage({ params }: { params: CountryParams }) {
  const { id } = params;
  const [layers, setLayers] = useState<GISLayer[]>([]);
  const [versions, setVersions] = useState<GISDatasetVersion[]>([]);
  const [activeVersion, setActiveVersion] = useState<GISDatasetVersion | null>(null);
  const [openUpload, setOpenUpload] = useState(false);
  const mapRef = useRef<L.Map | null>(null);
  const layerGroups = useRef<Record<number, L.GeoJSON>>(Object.create(null));

  // ────────────── Fetch Dataset Versions ──────────────
  useEffect(() => {
    const loadVersions = async () => {
      const { data } = await supabase
        .from("gis_dataset_versions")
        .select("*")
        .eq("country_iso", id)
        .order("created_at", { ascending: false });
      if (data) {
        setVersions(data);
        const active = data.find((v) => v.is_active);
        setActiveVersion(active || data[0] || null);
      }
    };
    loadVersions();
  }, [id]);

  // ────────────── Fetch GIS Layers ──────────────
  useEffect(() => {
    const loadLayers = async () => {
      if (!activeVersion) return;
      const { data } = await supabase
        .from("gis_layers")
        .select("*")
        .eq("dataset_version_id", activeVersion.id)
        .eq("is_active", true)
        .order("admin_level_int");
      if (!data) return;

      const layersWithMeta: GISLayer[] = [];
      for (const l of data) {
        try {
          const filePath = l.source?.path;
          if (!filePath) continue;

          const { data: urlData } = supabase.storage
            .from("gis_raw")
            .getPublicUrl(filePath);
          const url = urlData?.publicUrl;
          if (!url) continue;

          const res = await fetch(url);
          const geojson = await res.json();

          const crs = geojson.crs?.properties?.name || "EPSG:4326";
          const feature_count = geojson.features?.length ?? 0;

          layersWithMeta.push({
            ...l,
            crs,
            feature_count,
            source: { ...l.source, url },
          });
        } catch (err) {
          console.warn("Error loading layer:", l.layer_name, err);
          layersWithMeta.push({ ...l, crs: null, feature_count: null });
        }
      }
      setLayers(layersWithMeta);
    };
    loadLayers();
  }, [activeVersion]);

  // ────────────── Map Initialization ──────────────
  useEffect(() => {
    if (!mapRef.current) {
      const map = L.map("gis-map", {
        center: [12.8797, 121.774],
        zoom: 5,
        zoomControl: true,
      });
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors",
      }).addTo(map);
      mapRef.current = map;
    }
  }, []);

  // ────────────── Render Layers ──────────────
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    // Clear previous layers
    Object.values(layerGroups.current).forEach((g) => g.remove());
    layerGroups.current = {};

    const colors = [
      "var(--gsc-blue)",
      "var(--gsc-green)",
      "var(--gsc-orange)",
      "var(--gsc-red)",
      "#7e57c2",
      "#009688",
    ];

    layers.forEach((l) => {
      if (!l.source?.url) return;
      fetch(l.source.url)
        .then((r) => r.json())
        .then((geojson) => {
          const color =
            colors[l.admin_level_int ?? 0] ||
            colors[Math.floor(Math.random() * colors.length)];

          const geoLayer = L.geoJSON(geojson, {
            style: { color, weight: 1, fillOpacity: 0 },
          }).addTo(map);

          layerGroups.current[l.admin_level_int ?? 0] = geoLayer;
        })
        .catch((e) => console.error("Layer render error:", e));
    });
  }, [layers]);

  // ────────────── UI ──────────────
  const headerProps = {
    title: "GIS Datasets",
    group: "country-config" as const,
    description: "Manage and visualize GIS layers for the selected country.",
    breadcrumbs: (
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/" },
          { label: "Country Configuration", href: "/country" },
          { label: id },
          { label: "GIS" },
        ]}
      />
    ),
  };

  return (
    <SidebarLayout headerProps={headerProps}>
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div className="p-4 rounded-lg border shadow-sm bg-white">
          <p className="text-xs text-gray-500 uppercase">Dataset Version</p>
          <div className="flex items-center justify-between mt-1">
            <select
              value={activeVersion?.id || ""}
              onChange={(e) => {
                const selected = versions.find((v) => v.id === e.target.value);
                setActiveVersion(selected || null);
              }}
              className="text-sm border rounded p-1 flex-1 mr-2"
            >
              {versions.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.title} {v.year ? `(${v.year})` : ""}
                </option>
              ))}
            </select>
            <button
              className="px-2 py-1 text-sm text-white rounded"
              style={{ backgroundColor: "var(--gsc-blue)" }}
            >
              + New
            </button>
          </div>
        </div>

        <div className="p-4 rounded-lg border shadow-sm bg-white">
          <p className="text-xs text-gray-500 uppercase">Active Layers</p>
          <p className="text-lg font-semibold">
            {layers.length}{" "}
            <span className="text-gray-500 text-sm">ADM0–ADM5 supported</span>
          </p>
        </div>

        <div className="p-4 rounded-lg border shadow-sm bg-white">
          <p className="text-xs text-gray-500 uppercase">Country</p>
          <p className="text-lg font-semibold">{id}</p>
          <p className="text-gray-500 text-sm">SSC GIS</p>
        </div>
      </div>

      {/* Layer Table */}
      <div className="overflow-x-auto mb-4 border rounded-lg bg-white shadow-sm">
        <table className="min-w-full text-sm text-left border-collapse">
          <thead className="bg-[color:var(--gsc-beige)] text-gray-700 uppercase text-xs">
            <tr>
              <th className="px-4 py-2 border">Level</th>
              <th className="px-4 py-2 border">Layer</th>
              <th className="px-4 py-2 border">Features</th>
              <th className="px-4 py-2 border">CRS</th>
              <th className="px-4 py-2 border">Format</th>
              <th className="px-4 py-2 border">Source</th>
            </tr>
          </thead>
          <tbody>
            {layers.map((l) => (
              <tr key={l.id} className="border-t">
                <td className="px-4 py-2 border font-medium">
                  {l.admin_level || `ADM${l.admin_level_int ?? ""}`}
                </td>
                <td className="px-4 py-2 border">{l.layer_name}</td>
                <td className="px-4 py-2 border text-center">
                  {l.feature_count ?? "—"}
                </td>
                <td className="px-4 py-2 border text-center">{l.crs ?? "—"}</td>
                <td className="px-4 py-2 border text-center">
                  {l.format ?? "json"}
                </td>
                <td className="px-4 py-2 border text-right">
                  <button
                    onClick={() =>
                      navigator.clipboard.writeText(l.source?.url || "")
                    }
                    className="text-xs text-white rounded px-2 py-1"
                    style={{ backgroundColor: "var(--gsc-red)" }}
                  >
                    Copy
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Map */}
      <div id="gis-map" className="w-full h-[600px] rounded-lg border shadow-sm z-0" />

      {/* Upload Button */}
      <div className="mt-4 flex justify-end">
        <button
          onClick={() => setOpenUpload(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm text-white rounded hover:opacity-90"
          style={{ backgroundColor: "var(--gsc-red)" }}
        >
          <Upload className="w-4 h-4" /> Upload GIS
        </button>
      </div>

      {openUpload && (
        <UploadGISModal
          countryIso={id}
          onClose={() => setOpenUpload(false)}
          onUploaded={async () => window.location.reload()}
        />
      )}
    </SidebarLayout>
  );
}

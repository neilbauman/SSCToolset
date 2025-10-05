"use client";

import { useState, useEffect, useRef } from "react";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import UploadGISModal from "@/components/country/UploadGISModal";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { Layers, Upload, Check, Trash2, Map } from "lucide-react";
import type { CountryParams } from "@/app/country/types";
import L from "leaflet";

type Country = {
  iso_code: string;
  name: string;
};

type GISDatasetVersion = {
  id: string;
  country_iso: string;
  title: string;
  source: string | null;
  year: number | null;
  dataset_date: string | null;
  is_active: boolean;
  created_at: string;
};

type GISLayer = {
  id: string;
  country_iso: string;
  layer_name: string;
  format: string;
  source: { path: string };
  dataset_version_id: string;
};

export default function GISPage({ params }: any) {
  const { id: countryIso } = params as CountryParams;

  const [country, setCountry] = useState<Country | null>(null);
  const [versions, setVersions] = useState<GISDatasetVersion[]>([]);
  const [layersMap, setLayersMap] = useState<Record<string, number>>({});
  const [openUpload, setOpenUpload] = useState(false);
  const mapRef = useRef<L.Map | null>(null);
  const geoLayerRef = useRef<L.GeoJSON | null>(null);

  // ---- Load Country ----
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("countries")
        .select("iso_code, name")
        .eq("iso_code", countryIso)
        .single();
      if (data) setCountry(data);
    })();
  }, [countryIso]);

  // ---- Load Versions ----
  const fetchVersions = async () => {
    const { data, error } = await supabase
      .from("gis_dataset_versions")
      .select("*")
      .eq("country_iso", countryIso)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading GIS versions:", error);
      return;
    }

    const list = (data || []) as GISDatasetVersion[];
    setVersions(list);
    await fetchLayers(list.map((v) => v.id));
  };

  // ---- Load Layers ----
  const fetchLayers = async (versionIds: string[]) => {
    if (!versionIds.length) return;
    const { data, error } = await supabase
      .from("gis_layers")
      .select("dataset_version_id, source")
      .in("dataset_version_id", versionIds);

    if (error) {
      console.error("Error loading GIS layers:", error);
      return;
    }

    const map: Record<string, number> = {};
    for (const l of data || []) {
      map[l.dataset_version_id] = (map[l.dataset_version_id] || 0) + 1;
    }
    setLayersMap(map);
  };

  useEffect(() => {
    fetchVersions();
  }, [countryIso]);

  // ---- Map Initialization ----
  useEffect(() => {
    const container = L.DomUtil.get("map-container") as HTMLElement & {
      _leaflet_id?: number;
    };
    if (container && (container as any)._leaflet_id) {
      (container as any)._leaflet_id = null;
    }

    const map = L.map("map-container").setView([12.8797, 121.774], 5);
    mapRef.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors',
    }).addTo(map);

    return () => {
      map.remove();
    };
  }, [countryIso]);

  // ---- View GeoJSON Layer ----
  const viewDataset = async (versionId: string) => {
    const { data, error } = await supabase
      .from("gis_layers")
      .select("source")
      .eq("dataset_version_id", versionId)
      .maybeSingle();

    if (error || !data?.source?.path) {
      console.error("No valid GeoJSON path found");
      return;
    }

    const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${data.source.path}`;
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch GeoJSON");
      const geojson = await response.json();

      const map = mapRef.current;
      if (!map) return;

      // remove existing layer if present
      if (geoLayerRef.current) {
        map.removeLayer(geoLayerRef.current);
      }

      const layer = L.geoJSON(geojson, {
        style: { color: "#B91C1C", weight: 1 },
      }).addTo(map);

      geoLayerRef.current = layer;
      map.fitBounds(layer.getBounds());
    } catch (e) {
      console.error("Invalid GeoJSON file:", e);
      alert("Invalid or missing GeoJSON file.");
    }
  };

  // ---- Header ----
  const headerProps = {
    title: `${country?.name ?? countryIso} – GIS Layers`,
    group: "country-config" as const,
    description:
      "Manage and inspect uploaded GIS datasets (aligned to administrative boundaries).",
    breadcrumbs: (
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Country Configuration", href: "/country" },
          { label: country?.name ?? countryIso, href: `/country/${countryIso}` },
          { label: "GIS" },
        ]}
      />
    ),
  };

  return (
    <SidebarLayout headerProps={headerProps}>
      {/* Dataset Versions */}
      <div className="border rounded-lg p-4 shadow-sm mb-6">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Layers className="w-5 h-5 text-green-600" />
            GIS Dataset Versions
          </h2>
          <button
            onClick={() => setOpenUpload(true)}
            className="flex items-center text-sm text-white bg-[color:var(--gsc-red)] px-3 py-1 rounded hover:opacity-90"
          >
            <Upload className="w-4 h-4 mr-1" /> Upload Dataset
          </button>
        </div>

        {versions.length > 0 ? (
          <table className="w-full text-sm border">
            <thead className="bg-gray-100">
              <tr>
                <th className="border px-2 py-1 text-left">Title</th>
                <th className="border px-2 py-1 text-left">Source</th>
                <th className="border px-2 py-1 text-left">Year</th>
                <th className="border px-2 py-1 text-left">Created</th>
                <th className="border px-2 py-1 text-center">Layers</th>
                <th className="border px-2 py-1 text-center">Status</th>
                <th className="border px-2 py-1 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {versions.map((v) => (
                <tr key={v.id} className="hover:bg-gray-50">
                  <td className="border px-2 py-1">{v.title}</td>
                  <td className="border px-2 py-1">{v.source || "—"}</td>
                  <td className="border px-2 py-1">{v.year || "—"}</td>
                  <td className="border px-2 py-1">
                    {new Date(v.created_at).toLocaleDateString()}
                  </td>
                  <td className="border px-2 py-1 text-center">
                    {layersMap[v.id] ?? 0}
                  </td>
                  <td className="border px-2 py-1 text-center">
                    {v.is_active ? (
                      <span className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs bg-green-600 text-white">
                        <Check className="w-3 h-3" /> Active
                      </span>
                    ) : (
                      <span className="inline-block rounded px-2 py-0.5 text-xs bg-gray-200">
                        —
                      </span>
                    )}
                  </td>
                  <td className="border px-2 py-1 text-center flex gap-2 justify-center">
                    <button
                      onClick={() => viewDataset(v.id)}
                      title="View on Map"
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <Map className="w-4 h-4" />
                    </button>
                    <button
                      title="Delete"
                      onClick={() => alert("Delete not yet implemented")}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="italic text-gray-500">No GIS versions uploaded yet.</p>
        )}
      </div>

      {/* Map Preview */}
      <div
        id="map-container"
        className="h-[600px] w-full rounded-lg border shadow-sm"
      />

      {/* Upload Modal */}
      <UploadGISModal
        open={openUpload}
        onClose={() => setOpenUpload(false)}
        countryIso={countryIso}
        onUploaded={fetchVersions}
      />
    </SidebarLayout>
  );
}

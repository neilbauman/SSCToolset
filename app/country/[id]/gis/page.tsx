"use client";

import { useState, useEffect, useRef } from "react";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import UploadGISModal from "@/components/country/UploadGISModal";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { Layers, Upload, Eye, EyeOff, Check, Edit } from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

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
  dataset_version_id: string;
  layer_name: string;
  admin_level: string | null;
  format: string;
  crs: string;
  source: { path: string };
  is_active: boolean;
};

export default function GISPage({ params }: any) {
  const countryIso = params.id;
  const [versions, setVersions] = useState<GISDatasetVersion[]>([]);
  const [layers, setLayers] = useState<GISLayer[]>([]);
  const [visibleLayers, setVisibleLayers] = useState<Record<string, boolean>>({});
  const [openUpload, setOpenUpload] = useState(false);
  const [mapVisible, setMapVisible] = useState(true);
  const mapRef = useRef<L.Map | null>(null);
  const layerRefs = useRef<Record<string, L.GeoJSON>>({});

  // ---- Fetch Versions ----
  const fetchVersions = async () => {
    const { data, error } = await supabase
      .from("gis_dataset_versions")
      .select("*")
      .eq("country_iso", countryIso)
      .order("created_at", { ascending: false });

    if (!error && data) setVersions(data as GISDatasetVersion[]);
  };

  // ---- Fetch Layers ----
  const fetchLayers = async () => {
    const { data, error } = await supabase
      .from("gis_layers")
      .select("*")
      .eq("country_iso", countryIso);

    if (!error && data) {
      const layersData = data as GISLayer[];
      setLayers(layersData);
      const visMap: Record<string, boolean> = {};
      layersData.forEach((l) => (visMap[l.id] = l.is_active || false));
      setVisibleLayers(visMap);
    }
  };

  useEffect(() => {
    fetchVersions();
    fetchLayers();
  }, [countryIso]);

  // ---- Initialize Map ----
  useEffect(() => {
    if (!mapVisible) return;

    const container = L.DomUtil.get("map-container");
    if (container && (container as any)._leaflet_id) {
      (container as any)._leaflet_id = null;
    }

    const map = L.map("map-container", {
      center: [12.8797, 121.774], // Philippines center
      zoom: 6,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/">OSM</a>',
    }).addTo(map);

    mapRef.current = map;

    // Add all visible layers
    renderVisibleLayers(map);

    return () => {
      map.remove();
    };
  }, [mapVisible]);

  // ---- Render Visible Layers ----
  const renderVisibleLayers = async (map?: L.Map) => {
    const activeMap = map || mapRef.current;
    if (!activeMap) return;

    // Remove old
    Object.values(layerRefs.current).forEach((layer) => activeMap.removeLayer(layer));
    layerRefs.current = {};

    // Add visible
    for (const layer of layers) {
      if (!visibleLayers[layer.id]) continue;
      const { data } = await supabase.storage.from("gis").download(layer.source.path);
      if (!data) continue;

      const text = await data.text();
      try {
        const geojson = JSON.parse(text);
        const leafletLayer = L.geoJSON(geojson, {
          style: { color: "#e11d48", weight: 1, fillOpacity: 0.1 },
        }).addTo(activeMap);
        layerRefs.current[layer.id] = leafletLayer;
      } catch (e) {
        console.error("Invalid GeoJSON for", layer.layer_name);
      }
    }
  };

  // ---- Toggle Layer Visibility ----
  const toggleLayerVisibility = async (layerId: string) => {
    const updated = { ...visibleLayers, [layerId]: !visibleLayers[layerId] };
    setVisibleLayers(updated);
    renderVisibleLayers();
  };

  // ---- Header ----
  const headerProps = {
    title: `GIS Layers – ${countryIso}`,
    group: "country-config" as const,
    description: "Manage uploaded GIS boundary layers and toggle their visibility.",
    breadcrumbs: (
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Country Configuration", href: "/country" },
          { label: countryIso, href: `/country/${countryIso}` },
          { label: "GIS" },
        ]}
      />
    ),
  };

  return (
    <SidebarLayout headerProps={headerProps}>
      {/* Dataset Versions Table */}
      <div className="border rounded-lg p-4 shadow-sm mb-4">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Layers className="w-5 h-5 text-green-600" />
            GIS Dataset Versions
          </h2>
          <div className="flex gap-2">
            <button
              onClick={() => setOpenUpload(true)}
              className="flex items-center text-sm text-white bg-[color:var(--gsc-red)] px-3 py-1 rounded hover:opacity-90"
            >
              <Upload className="w-4 h-4 mr-1" /> Upload Dataset
            </button>
            <button
              onClick={() => setMapVisible(!mapVisible)}
              className="flex items-center text-sm border rounded px-3 py-1 hover:bg-gray-100"
            >
              {mapVisible ? <EyeOff className="w-4 h-4 mr-1" /> : <Eye className="w-4 h-4 mr-1" />}
              {mapVisible ? "Hide Map" : "Show Map"}
            </button>
          </div>
        </div>

        {versions.length > 0 ? (
          <table className="w-full text-sm border">
            <thead className="bg-gray-100">
              <tr>
                <th className="border px-2 py-1 text-left">Title</th>
                <th className="border px-2 py-1 text-left">Source</th>
                <th className="border px-2 py-1 text-left">Created</th>
                <th className="border px-2 py-1 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {versions.map((v) => (
                <tr key={v.id} className="hover:bg-gray-50">
                  <td className="border px-2 py-1">{v.title}</td>
                  <td className="border px-2 py-1">{v.source || "—"}</td>
                  <td className="border px-2 py-1">
                    {new Date(v.created_at).toLocaleDateString()}
                  </td>
                  <td className="border px-2 py-1">
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
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="italic text-gray-500">No GIS versions uploaded yet.</p>
        )}
      </div>

      {/* Map */}
      {mapVisible && (
        <div className="border rounded-lg p-3 shadow-sm mb-6">
          <div id="map-container" className="h-[600px] w-full rounded"></div>
        </div>
      )}

      {/* Layers Table */}
      <div className="border rounded-lg p-4 shadow-sm">
        <h3 className="text-md font-semibold mb-2">Layers</h3>
        {layers.length > 0 ? (
          <table className="w-full text-sm border">
            <thead className="bg-gray-100">
              <tr>
                <th className="border px-2 py-1 text-left">Layer Name</th>
                <th className="border px-2 py-1 text-center">Admin Level</th>
                <th className="border px-2 py-1 text-center">Visible</th>
              </tr>
            </thead>
            <tbody>
              {layers.map((l) => (
                <tr key={l.id}>
                  <td className="border px-2 py-1">{l.layer_name}</td>
                  <td className="border px-2 py-1 text-center">{l.admin_level || "—"}</td>
                  <td className="border px-2 py-1 text-center">
                    <input
                      type="checkbox"
                      checked={visibleLayers[l.id] || false}
                      onChange={() => toggleLayerVisibility(l.id)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="italic text-gray-500">No layers found.</p>
        )}
      </div>

      {/* Upload Modal */}
      <UploadGISModal
        open={openUpload}
        onClose={() => setOpenUpload(false)}
        countryIso={countryIso}
        onUploaded={async () => {
          await fetchVersions();
          await fetchLayers();
        }}
      />
    </SidebarLayout>
  );
}

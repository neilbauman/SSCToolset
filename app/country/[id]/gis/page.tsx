"use client";

import { useState, useEffect, useRef } from "react";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import UploadGISModal from "@/components/country/UploadGISModal";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { Layers, Upload, Eye, EyeOff, Check, Save } from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

type GISDatasetVersion = {
  id: string;
  country_iso: string;
  title: string;
  source: string | null;
  is_active: boolean;
  created_at: string;
};

type GISLayer = {
  id: string;
  dataset_version_id: string;
  country_iso: string;
  layer_name: string;
  admin_level: string | null;
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
  const [editingLevel, setEditingLevel] = useState<Record<string, string>>({});

  // ---- Fetch Versions ----
  const fetchVersions = async () => {
    const { data } = await supabase
      .from("gis_dataset_versions")
      .select("*")
      .eq("country_iso", countryIso)
      .order("created_at", { ascending: false });
    if (data) setVersions(data as GISDatasetVersion[]);
  };

  // ---- Fetch Layers ----
  const fetchLayers = async () => {
    const { data } = await supabase
      .from("gis_layers")
      .select("*")
      .eq("country_iso", countryIso);
    if (data) {
      const map: Record<string, boolean> = {};
      data.forEach((l) => (map[l.id] = !!l.is_active));
      setVisibleLayers(map);
      setLayers(data as GISLayer[]);
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
      center: [12.8797, 121.774],
      zoom: 6,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/">OSM</a>',
    }).addTo(map);

    mapRef.current = map;
    renderVisibleLayers(map);

    return () => map.remove();
  }, [mapVisible]);

  // ---- Render Visible Layers ----
  const renderVisibleLayers = async (map?: L.Map) => {
    const activeMap = map || mapRef.current;
    if (!activeMap) return;

    // Remove previous
    Object.values(layerRefs.current).forEach((layer) => activeMap.removeLayer(layer));
    layerRefs.current = {};

    for (const layer of layers) {
      if (!visibleLayers[layer.id]) continue;
      const { data } = await supabase.storage.from("gis_raw").download(layer.source.path);
      if (!data) continue;

      const text = await data.text();
      try {
        const geojson = JSON.parse(text);
        const leafletLayer = L.geoJSON(geojson, {
          style: {
            color: layer.admin_level === "ADM1" ? "#2563eb" : "#e11d48",
            weight: 1,
            fillOpacity: 0.1,
          },
        }).addTo(activeMap);
        layerRefs.current[layer.id] = leafletLayer;
      } catch (e) {
        console.error("Invalid GeoJSON:", e);
      }
    }
  };

  // ---- Toggle Visibility ----
  const toggleLayerVisibility = (id: string) => {
    const updated = { ...visibleLayers, [id]: !visibleLayers[id] };
    setVisibleLayers(updated);
    renderVisibleLayers();
  };

  // ---- Save Admin Level ----
  const saveAdminLevel = async (layerId: string, newLevel: string) => {
    await supabase
      .from("gis_layers")
      .update({ admin_level: newLevel })
      .eq("id", layerId);
    await fetchLayers();
    renderVisibleLayers();
  };

  // ---- Header ----
  const headerProps = {
    title: `GIS Layers – ${countryIso}`,
    group: "country-config" as const,
    description: "Manage boundary layers, toggle visibility, and assign admin levels.",
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
      {/* Dataset Versions */}
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

        {versions.length ? (
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
                      <span className="inline-block rounded px-2 py-0.5 text-xs bg-gray-200">—</span>
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
        {layers.length ? (
          <table className="w-full text-sm border">
            <thead className="bg-gray-100">
              <tr>
                <th className="border px-2 py-1 text-left">Layer Name</th>
                <th className="border px-2 py-1 text-center">Admin Level</th>
                <th className="border px-2 py-1 text-center">Visible</th>
                <th className="border px-2 py-1 text-center">Save</th>
              </tr>
            </thead>
            <tbody>
              {layers.map((l) => (
                <tr key={l.id}>
                  <td className="border px-2 py-1">{l.layer_name}</td>
                  <td className="border px-2 py-1 text-center">
                    <select
                      className="border rounded px-2 py-0.5 text-sm"
                      value={editingLevel[l.id] ?? l.admin_level ?? ""}
                      onChange={(e) =>
                        setEditingLevel({ ...editingLevel, [l.id]: e.target.value })
                      }
                    >
                      <option value="">—</option>
                      <option value="ADM0">ADM0</option>
                      <option value="ADM1">ADM1</option>
                      <option value="ADM2">ADM2</option>
                      <option value="ADM3">ADM3</option>
                      <option value="ADM4">ADM4</option>
                      <option value="ADM5">ADM5</option>
                    </select>
                  </td>
                  <td className="border px-2 py-1 text-center">
                    <input
                      type="checkbox"
                      checked={visibleLayers[l.id] || false}
                      onChange={() => toggleLayerVisibility(l.id)}
                    />
                  </td>
                  <td className="border px-2 py-1 text-center">
                    <button
                      onClick={() =>
                        saveAdminLevel(l.id, editingLevel[l.id] ?? l.admin_level ?? "")
                      }
                      className="p-1 rounded bg-green-600 hover:bg-green-700 text-white"
                    >
                      <Save className="w-4 h-4" />
                    </button>
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

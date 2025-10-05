"use client";

import { useState, useEffect, useRef } from "react";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import UploadGISModal from "@/components/country/UploadGISModal";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { Layers, Upload, Check, Eye, EyeOff } from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

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
  dataset_version_id: string;
  layer_name: string;
  format: string;
  admin_level: string | null;
  source: { path: string };
};

export default function GISPage({ params }: any) {
  const { id: countryIso } = params;
  const [country, setCountry] = useState<Country | null>(null);
  const [versions, setVersions] = useState<GISDatasetVersion[]>([]);
  const [layers, setLayers] = useState<GISLayer[]>([]);
  const [openUpload, setOpenUpload] = useState(false);
  const [mapVisible, setMapVisible] = useState(true);

  const mapRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<Record<string, L.GeoJSON>>({});

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

  // ---- Load Dataset Versions ----
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("gis_dataset_versions")
        .select("*")
        .eq("country_iso", countryIso)
        .order("created_at", { ascending: false });
      if (error) {
        console.error("Error loading GIS versions:", error);
        return;
      }
      setVersions(data || []);
    })();
  }, [countryIso]);

  // ---- Load Layers ----
  useEffect(() => {
    (async () => {
      if (!versions.length) return;
      const versionIds = versions.map((v) => v.id);
      const { data, error } = await supabase
        .from("gis_layers")
        .select("*")
        .in("dataset_version_id", versionIds);
      if (error) {
        console.error("Error loading layers:", error);
        return;
      }
      setLayers(data || []);
    })();
  }, [versions]);

  // ---- Initialize Map ----
  useEffect(() => {
    if (!mapVisible) return;

    // Reset Leaflet container (avoid "already initialized" error)
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

    // ✅ Proper cleanup (void return)
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [mapVisible]);

  // ---- Render Layers ----
  const renderVisibleLayers = async (map: L.Map) => {
    // Remove existing layers
    Object.values(layerGroupRef.current).forEach((g) => g.remove());
    layerGroupRef.current = {};

    for (const layer of layers) {
      const path = layer.source?.path;
      if (!path) continue;

      const { data, error } = await supabase.storage.from("gis").download(path);
      if (error || !data) continue;

      try {
        const geojson = await data.text();
        const parsed = JSON.parse(geojson);

        const color =
          layer.admin_level === "ADM1"
            ? "blue"
            : layer.admin_level === "ADM2"
            ? "red"
            : "purple";

        const layerObj = L.geoJSON(parsed, {
          style: {
            color,
            weight: 1,
            fillOpacity: 0.05,
          },
        });

        layerObj.addTo(map);
        layerGroupRef.current[layer.id] = layerObj;
      } catch (err) {
        console.error("Invalid GeoJSON:", err);
      }
    }
  };

  // ---- Toggle Layer Visibility ----
  const toggleLayerVisibility = (layerId: string, visible: boolean) => {
    const map = mapRef.current;
    if (!map) return;

    const layer = layerGroupRef.current[layerId];
    if (!layer) return;

    if (visible) layer.addTo(map);
    else map.removeLayer(layer);
  };

  // ---- Header ----
  const headerProps = {
    title: `${country?.name ?? countryIso} – GIS Layers`,
    group: "country-config" as const,
    description:
      "Manage and visualize uploaded GIS datasets aligned to administrative boundaries.",
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
      {/* Dataset Versions Table */}
      <div className="border rounded-lg p-4 shadow-sm mb-6">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Layers className="w-5 h-5 text-green-600" />
            GIS Dataset Versions
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setOpenUpload(true)}
              className="flex items-center text-sm text-white bg-[color:var(--gsc-red)] px-3 py-1 rounded hover:opacity-90"
            >
              <Upload className="w-4 h-4 mr-1" /> Upload Dataset
            </button>
            <button
              onClick={() => setMapVisible((v) => !v)}
              className="text-sm text-gray-600 border px-2 py-1 rounded hover:bg-gray-50"
            >
              {mapVisible ? (
                <>
                  <EyeOff className="inline w-4 h-4 mr-1" />
                  Hide Map
                </>
              ) : (
                <>
                  <Eye className="inline w-4 h-4 mr-1" />
                  Show Map
                </>
              )}
            </button>
          </div>
        </div>

        {/* Version List */}
        {versions.length > 0 ? (
          <table className="w-full text-sm border mb-3">
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
          <p className="italic text-gray-500">No GIS datasets uploaded yet.</p>
        )}
      </div>

      {/* Map Section */}
      {mapVisible && (
        <div className="border rounded-lg shadow-sm mb-6">
          <div id="map-container" className="h-[500px] w-full rounded-b-lg" />
        </div>
      )}

      {/* Layers Table */}
      <div className="border rounded-lg p-4 shadow-sm">
        <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
          <Layers className="w-5 h-5 text-blue-600" /> Layers
        </h3>
        <table className="w-full text-sm border">
          <thead className="bg-gray-100">
            <tr>
              <th className="border px-2 py-1 text-left">Layer Name</th>
              <th className="border px-2 py-1 text-left">Admin Level</th>
              <th className="border px-2 py-1 text-left">Visible</th>
            </tr>
          </thead>
          <tbody>
            {layers.map((l) => (
              <tr key={l.id} className="hover:bg-gray-50">
                <td className="border px-2 py-1">{l.layer_name}</td>
                <td className="border px-2 py-1">{l.admin_level || "—"}</td>
                <td className="border px-2 py-1 text-center">
                  <input
                    type="checkbox"
                    defaultChecked
                    onChange={(e) =>
                      toggleLayerVisibility(l.id, e.target.checked)
                    }
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Upload Modal */}
      <UploadGISModal
        open={openUpload}
        onClose={() => setOpenUpload(false)}
        countryIso={countryIso}
        onUploaded={() => window.location.reload()}
      />
    </SidebarLayout>
  );
}

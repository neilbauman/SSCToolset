"use client";

import { useState, useEffect, useRef } from "react";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import UploadGISModal from "@/components/country/UploadGISModal";
import EditGISLayerModal from "@/components/country/EditGISLayerModal";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { Layers, Upload, Check, EyeOff, Eye, Edit } from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { CountryParams } from "@/app/country/types";

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
  feature_count: number | null;
  dataset_version_id: string;
  admin_level?: string | null;
  is_active: boolean;
  source: { path: string };
  created_at: string;
};

export default function GISPage({ params }: any) {
  const { id: countryIso } = params as CountryParams;
  const [country, setCountry] = useState<Country | null>(null);
  const [versions, setVersions] = useState<GISDatasetVersion[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<string | null>(null);
  const [layers, setLayers] = useState<GISLayer[]>([]);
  const [openUpload, setOpenUpload] = useState(false);
  const [editLayer, setEditLayer] = useState<GISLayer | null>(null);
  const [mapVisible, setMapVisible] = useState(true);
  const mapRef = useRef<L.Map | null>(null);

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
    const active = list.find((v) => v.is_active);
    setSelectedVersion(active?.id || list[0]?.id || null);
  };

  // ---- Load Layers ----
  const fetchLayers = async (versionId: string) => {
    const { data, error } = await supabase
      .from("gis_layers")
      .select("*")
      .eq("dataset_version_id", versionId);
    if (error) {
      console.error("Error loading GIS layers:", error);
      return;
    }
    setLayers((data || []) as GISLayer[]);
  };

  // ---- Initial load ----
  useEffect(() => {
    fetchVersions();
  }, [countryIso]);

  useEffect(() => {
    if (selectedVersion) fetchLayers(selectedVersion);
  }, [selectedVersion]);

  // ---- Render Map ----
  useEffect(() => {
    if (!mapVisible || !layers.length) return;

    // Remove existing map instance if any
    const container = L.DomUtil.get("map-container");
    if (container && (container as any)._leaflet_id) {
      (container as any)._leaflet_id = null;
    }

    const map = L.map("map-container").setView([12.8797, 121.774], 5);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(map);

    const activeLayers = layers.filter((l) => l.is_active !== false);

    activeLayers.forEach(async (layer) => {
      const { data, error } = await supabase.storage
        .from("gis")
        .download(layer.source.path);
      if (error || !data) return;
      const text = await data.text();
      const geojson = JSON.parse(text);
      const geoLayer = L.geoJSON(geojson, {
        style: {
          color: "#ff7800",
          weight: 1,
        },
      }).addTo(map);
      map.fitBounds(geoLayer.getBounds());
    });

    mapRef.current = map;
    return () => {
      map.remove();
    };
  }, [layers, mapVisible]);

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
          <div className="flex items-center gap-2">
            <button
              onClick={() => setOpenUpload(true)}
              className="flex items-center text-sm text-white bg-[color:var(--gsc-red)] px-3 py-1 rounded hover:opacity-90"
            >
              <Upload className="w-4 h-4 mr-1" /> Upload Dataset
            </button>
            <button
              onClick={() => setMapVisible((v) => !v)}
              className="flex items-center text-sm border px-2 py-1 rounded hover:bg-gray-50"
            >
              {mapVisible ? (
                <>
                  <EyeOff className="w-4 h-4 mr-1" /> Hide Map
                </>
              ) : (
                <>
                  <Eye className="w-4 h-4 mr-1" /> Show Map
                </>
              )}
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
                <tr
                  key={v.id}
                  className={`hover:bg-gray-50 ${
                    selectedVersion === v.id ? "bg-blue-50" : ""
                  }`}
                  onClick={() => setSelectedVersion(v.id)}
                >
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

      {/* Map Container */}
      {mapVisible && (
        <div className="border rounded-lg overflow-hidden mb-6 relative">
          <div id="map-container" className="w-full h-[500px]"></div>
        </div>
      )}

      {/* Layers Table */}
      {layers.length > 0 && (
        <div className="border rounded-lg p-4 shadow-sm">
          <h3 className="text-md font-semibold mb-3">Layers</h3>
          <table className="w-full text-sm border">
            <thead className="bg-gray-100">
              <tr>
                <th className="border px-2 py-1 text-left">Layer Name</th>
                <th className="border px-2 py-1 text-left">Admin Level</th>
                <th className="border px-2 py-1 text-center">Active</th>
                <th className="border px-2 py-1 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {layers.map((l) => (
                <tr key={l.id} className="hover:bg-gray-50">
                  <td className="border px-2 py-1">{l.layer_name}</td>
                  <td className="border px-2 py-1 text-center">
                    {l.admin_level || "—"}
                  </td>
                  <td className="border px-2 py-1 text-center">
                    {l.is_active ? (
                      <span className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs bg-green-600 text-white">
                        <Check className="w-3 h-3" /> Active
                      </span>
                    ) : (
                      <span className="inline-block rounded px-2 py-0.5 text-xs bg-gray-300 text-gray-700">
                        —
                      </span>
                    )}
                  </td>
                  <td className="border px-2 py-1 text-center">
                    <button
                      onClick={() => setEditLayer(l)}
                      className="flex items-center gap-1 text-sm text-blue-600 hover:underline mx-auto"
                    >
                      <Edit className="w-4 h-4" /> Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Upload Modal */}
      <UploadGISModal
        open={openUpload}
        onClose={() => setOpenUpload(false)}
        countryIso={countryIso}
        onUploaded={async () => {
          await fetchVersions();
          if (selectedVersion) await fetchLayers(selectedVersion);
        }}
      />

      {/* Edit Modal */}
      {editLayer && (
        <EditGISLayerModal
          open={!!editLayer}
          onClose={() => setEditLayer(null)}
          layer={editLayer}
          onSaved={async () => {
            await fetchLayers(editLayer.dataset_version_id);
          }}
        />
      )}
    </SidebarLayout>
  );
}

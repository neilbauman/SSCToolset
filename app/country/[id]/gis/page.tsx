"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { Layers, Plus, Upload, Pencil } from "lucide-react";
import type { CountryParams } from "@/app/country/types";
import type { GISDatasetVersion, GISLayer } from "@/types";
import GISDataHealthPanel from "@/components/country/GISDataHealthPanel";
import UploadGISModal from "@/components/country/UploadGISModal";
import CreateGISVersionModal from "@/components/country/CreateGISVersionModal";
import EditGISVersionModal from "@/components/country/EditGISVersionModal";

import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Dynamic Leaflet Components (safe for SSR)
const MapContainer = dynamic(() => import("react-leaflet").then(m => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import("react-leaflet").then(m => m.TileLayer), { ssr: false });
const GeoJSON = dynamic(() => import("react-leaflet").then(m => m.GeoJSON), { ssr: false });

export default function GISPage({ params }: { params: CountryParams }) {
  const { id } = params;
  const mapRef = useRef<L.Map | null>(null);

  const [versions, setVersions] = useState<GISDatasetVersion[]>([]);
  const [activeVersion, setActiveVersion] = useState<GISDatasetVersion | null>(null);
  const [layers, setLayers] = useState<GISLayer[]>([]);
  const [visible, setVisible] = useState<Record<number, boolean>>({
    0: false, 1: false, 2: false, 3: false, 4: false, 5: false,
  });

  const [openUpload, setOpenUpload] = useState(false);
  const [openNewVersion, setOpenNewVersion] = useState(false);
  const [openEditVersion, setOpenEditVersion] = useState(false);

  // ────────────── Fetch Dataset Versions ──────────────
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("gis_dataset_versions")
        .select("*")
        .eq("country_iso", id)
        .order("created_at", { ascending: false });
      setVersions(data || []);
      const active = data?.find(v => v.is_active);
      setActiveVersion(active || data?.[0] || null);
    })();
  }, [id]);

  // ────────────── Fetch Layers for Active Version ──────────────
  useEffect(() => {
    if (!activeVersion) return;
    (async () => {
      const { data } = await supabase
        .from("gis_layers")
        .select("*")
        .eq("country_iso", id)
        .eq("dataset_version_id", activeVersion.id);
      setLayers(data || []);
    })();
  }, [id, activeVersion]);

  // ────────────── Layer Visibility Change ──────────────
  const toggleLayer = (level: number) =>
    setVisible(prev => ({ ...prev, [level]: !prev[level] }));

  // ────────────── Fit Bounds When Layers Active ──────────────
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;
    const activeLayers = layers.filter(l => visible[l.admin_level_int]);
    if (activeLayers.length === 0) return;

    const boundsList: L.LatLngBounds[] = [];
    activeLayers.forEach(layer => {
      if (!layer.source?.url) return;
      fetch(layer.source.url)
        .then(res => res.json())
        .then(data => {
          const geo = L.geoJSON(data);
          boundsList.push(geo.getBounds());
          if (boundsList.length === activeLayers.length) {
            const merged = boundsList.reduce((acc, b) => acc.extend(b), boundsList[0]);
            map.fitBounds(merged.pad(0.05));
          }
        });
    });
  }, [visible, layers]);

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

  // ────────────── Render ──────────────
  return (
    <SidebarLayout headerProps={headerProps}>
      {/* Top Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        {/* Dataset Version */}
        <div className="p-4 rounded-lg border shadow-sm bg-white">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs text-gray-500 uppercase">Dataset Version</p>
            {activeVersion && (
              <button
                onClick={() => setOpenEditVersion(true)}
                className="text-[color:var(--gsc-blue)] hover:text-[color:var(--gsc-red)]"
                title="Edit Version"
              >
                <Pencil className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 mb-2">
            <select
              value={activeVersion?.id || ""}
              onChange={(e) => {
                const selected = versions.find(v => v.id === e.target.value);
                setActiveVersion(selected || null);
              }}
              className="text-sm border rounded p-1 flex-1"
            >
              {versions.map(v => (
                <option key={v.id} value={v.id}>
                  {v.title} {v.year ? `(${v.year})` : ""}
                </option>
              ))}
            </select>
            <button
              onClick={() => setOpenNewVersion(true)}
              className="px-3 py-1 text-sm text-white rounded hover:opacity-90"
              style={{ backgroundColor: "var(--gsc-blue)" }}
            >
              + New
            </button>
          </div>

          {activeVersion?.source_name && (
            <p className="text-sm text-gray-700">
              Source:&nbsp;
              {activeVersion.source_url ? (
                <a
                  href={activeVersion.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[color:var(--gsc-blue)] hover:underline"
                >
                  {activeVersion.source_name}
                </a>
              ) : (
                <span>{activeVersion.source_name}</span>
              )}
            </p>
          )}
        </div>

        {/* Active Layers */}
        <div className="p-4 rounded-lg border shadow-sm bg-white">
          <p className="text-xs text-gray-500 uppercase">Active Layers</p>
          <h3 className="text-lg font-semibold">{layers.length}</h3>
          <p className="text-sm text-gray-600">ADM0–ADM5 supported</p>
        </div>

        {/* Country */}
        <div className="p-4 rounded-lg border shadow-sm bg-white flex justify-between items-center">
          <div>
            <p className="text-xs text-gray-500 uppercase">Country</p>
            <h3 className="text-lg font-semibold">{id}</h3>
            <p className="text-sm text-gray-600">SSC GIS</p>
          </div>
          <button
            onClick={() => setOpenUpload(true)}
            className="px-4 py-2 text-sm text-white rounded hover:opacity-90"
            style={{ backgroundColor: "var(--gsc-red)" }}
          >
            <Upload className="inline w-4 h-4 mr-1" /> Upload GIS
          </button>
        </div>
      </div>

      {/* Data Health */}
      <GISDataHealthPanel layers={layers} />

      {/* Layer Table */}
      <div className="overflow-x-auto mb-4 border rounded-lg bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
            <tr>
              <th className="px-3 py-2 text-left">Level</th>
              <th className="px-3 py-2 text-left">Layer</th>
              <th className="px-3 py-2 text-left">Features</th>
              <th className="px-3 py-2 text-left">CRS</th>
              <th className="px-3 py-2 text-left">Format</th>
            </tr>
          </thead>
          <tbody>
            {layers.map(l => (
              <tr key={l.id} className="border-t hover:bg-gray-50">
                <td className="px-3 py-2 font-semibold">{l.admin_level}</td>
                <td className="px-3 py-2">{l.layer_name}</td>
                <td className="px-3 py-2 text-gray-700">{l.feature_count ?? "—"}</td>
                <td className="px-3 py-2 text-gray-700">{l.crs ?? "—"}</td>
                <td className="px-3 py-2 text-gray-700">{l.format ?? "json"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Map */}
      <div className="relative rounded-lg overflow-hidden border shadow-sm">
        <MapContainer
          ref={mapRef as any}
          center={[12.8797, 121.774]}
          zoom={5}
          style={{ height: "600px", width: "100%" }}
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          {layers.map(l =>
            visible[l.admin_level_int] && l.source?.url ? (
              <GeoJSON
                key={l.id}
                data={l.source.url as any}
                style={{
                  color: "#C72B2B",
                  weight: 1,
                  fillOpacity: 0.1,
                }}
              />
            ) : null
          )}
        </MapContainer>
        <div className="absolute top-2 left-2 bg-white rounded-lg shadow p-2">
          <p className="text-sm font-semibold flex items-center mb-1">
            <Layers className="w-4 h-4 mr-1" /> Layers
          </p>
          {layers.map(l => (
            <label key={l.id} className="block text-sm">
              <input
                type="checkbox"
                className="mr-1"
                checked={!!visible[l.admin_level_int]}
                onChange={() => toggleLayer(l.admin_level_int)}
              />
              {l.admin_level}
            </label>
          ))}
        </div>
      </div>

      {/* Modals */}
      {openUpload && (
        <UploadGISModal
          open={openUpload}
          onClose={() => setOpenUpload(false)}
          countryIso={id}
          onUploaded={() => window.location.reload()}
        />
      )}
      {openNewVersion && (
        <CreateGISVersionModal
          countryIso={id}
          onClose={() => setOpenNewVersion(false)}
          onCreated={() => window.location.reload()}
        />
      )}
      {openEditVersion && activeVersion && (
        <EditGISVersionModal
          version={activeVersion}
          onClose={() => setOpenEditVersion(false)}
          onUpdated={() => window.location.reload()}
        />
      )}
    </SidebarLayout>
  );
}

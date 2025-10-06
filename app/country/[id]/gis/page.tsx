"use client";

import { useState, useEffect } from "react";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import dynamic from "next/dynamic";
import "leaflet/dist/leaflet.css";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { Upload, Pencil } from "lucide-react";
import type { CountryParams } from "@/app/country/types";
import UploadGISModal from "@/components/country/UploadGISModal";
import CreateGISVersionModal from "@/components/country/CreateGISVersionModal";
import GISDataHealthPanel from "@/components/country/GISDataHealthPanel";
import { useGeoJSONLayers } from "@/lib/hooks/useGeoJSONLayers";

const MapContainer = dynamic(() => import("react-leaflet").then((m) => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import("react-leaflet").then((m) => m.TileLayer), { ssr: false });
const GeoJSON = dynamic(() => import("react-leaflet").then((m) => m.GeoJSON), { ssr: false });

export default async function GISPage({ params }: any) {
  const { id } = await params;

  const [versions, setVersions] = useState<any[]>([]);
  const [activeVersion, setActiveVersion] = useState<any | null>(null);
  const [layers, setLayers] = useState<any[]>([]);
  const [visible, setVisible] = useState<Record<number, boolean>>({});
  const [openUpload, setOpenUpload] = useState(false);
  const [openNewVersion, setOpenNewVersion] = useState(false);
  const [openEditVersion, setOpenEditVersion] = useState(false);
  const [loading, setLoading] = useState(false);

  // ─────────────── Fetch dataset versions ───────────────
  useEffect(() => {
    const fetchVersions = async () => {
      const { data } = await supabase
        .from("gis_dataset_versions")
        .select("*")
        .eq("country_iso", id)
        .order("created_at", { ascending: false });

      if (data) {
        setVersions(data);
        setActiveVersion(data.find((v) => v.is_active) || data[0] || null);
      }
    };
    fetchVersions();
  }, [id]);

  // ─────────────── Fetch layers for active version ───────────────
  useEffect(() => {
    const fetchLayers = async () => {
      if (!activeVersion) return;
      setLoading(true);

      const { data, error } = await supabase
        .from("gis_layers")
        .select("*")
        .eq("country_iso", id)
        .eq("is_active", true)
        .order("admin_level_int", { ascending: true });

      if (!error && data) {
        setLayers(data);
        const initialVisibility: Record<number, boolean> = {};
        data.forEach((l) => (initialVisibility[l.admin_level_int] = false));
        setVisible(initialVisibility);
      }

      setLoading(false);
    };
    fetchLayers();
  }, [id, activeVersion]);

  // ─────────────── Use Hook to Fetch GeoJSON Data ───────────────
  const geojsons = useGeoJSONLayers(layers, visible);

  // ─────────────── Header Props ───────────────
  const headerProps = {
    title: "GIS Datasets",
    group: "country-config" as const,
    description: "Manage and visualize GIS layers for the selected country.",
    breadcrumbs: (
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/dashboard" },
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
                const selected = versions.find((v) => v.id === e.target.value);
                setActiveVersion(selected || null);
              }}
              className="text-sm border rounded p-1 flex-1"
            >
              {versions.map((v) => (
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
          <p className="text-xs text-gray-500 uppercase mb-1">Active Layers</p>
          <h3 className="text-lg font-semibold">{layers.length}</h3>
          <p className="text-xs text-gray-500">ADM0–ADM5 supported</p>
        </div>

        {/* Country Info */}
        <div className="p-4 rounded-lg border shadow-sm bg-white">
          <p className="text-xs text-gray-500 uppercase mb-1">Country</p>
          <h3 className="text-lg font-semibold">{id}</h3>
          <p className="text-xs text-gray-500">SSC GIS</p>
        </div>
      </div>

      {/* Data Health Panel */}
      <GISDataHealthPanel layers={layers} />

      {/* Layers Table */}
      <div className="overflow-x-auto mb-4 border rounded-lg bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100 text-gray-700">
            <tr>
              <th className="px-3 py-2 text-left">LEVEL</th>
              <th className="px-3 py-2 text-left">LAYER</th>
              <th className="px-3 py-2 text-left">FEATURES</th>
              <th className="px-3 py-2 text-left">CRS</th>
              <th className="px-3 py-2 text-left">FORMAT</th>
              <th className="px-3 py-2 text-left">SOURCE</th>
            </tr>
          </thead>
          <tbody>
            {layers.map((l) => (
              <tr key={l.id} className="border-t hover:bg-gray-50">
                <td className="px-3 py-2">{l.admin_level}</td>
                <td className="px-3 py-2">{l.layer_name}</td>
                <td className="px-3 py-2">{l.feature_count ?? "—"}</td>
                <td className="px-3 py-2">{l.crs ?? "—"}</td>
                <td className="px-3 py-2">{l.format ?? "json"}</td>
                <td className="px-3 py-2">
                  {l.source?.path && (
                    <button
                      onClick={() => navigator.clipboard.writeText(l.source.path)}
                      className="text-xs px-2 py-1 bg-[color:var(--gsc-red)] text-white rounded hover:opacity-90"
                    >
                      Copy
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Map */}
      <div className="relative border rounded-lg overflow-hidden shadow-sm">
        <MapContainer center={[12.8797, 121.774]} zoom={5} style={{ height: "600px", width: "100%" }}>
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="&copy; OpenStreetMap contributors"
          />

          {layers.map((layer) => {
            if (!visible[layer.admin_level_int]) return null;
            const data = geojsons[layer.id];
            if (!data) return null;

            return (
              <GeoJSON
                key={layer.id}
                data={data}
                style={{ color: "#C72B2B", weight: 1, fillOpacity: 0.2 }}
              />
            );
          })}
        </MapContainer>

        <button
          onClick={() => setOpenUpload(true)}
          className="absolute bottom-4 right-4 px-4 py-2 text-sm text-white rounded shadow-lg hover:opacity-90"
          style={{ backgroundColor: "var(--gsc-red)" }}
        >
          <Upload className="inline w-4 h-4 mr-1" />
          Upload GIS
        </button>
      </div>

      {/* Modals */}
      {openUpload && (
        <UploadGISModal
          countryIso={id}
          onClose={() => setOpenUpload(false)}
          onUploaded={async () => {
            const { data } = await supabase
              .from("gis_layers")
              .select("*")
              .eq("country_iso", id)
              .eq("is_active", true);
            setLayers(data || []);
          }}
        />
      )}

      {openNewVersion && (
        <CreateGISVersionModal
          countryIso={id}
          onClose={() => setOpenNewVersion(false)}
          onCreated={async () => {
            const { data } = await supabase
              .from("gis_dataset_versions")
              .select("*")
              .eq("country_iso", id)
              .order("created_at", { ascending: false });
            setVersions(data || []);
            setActiveVersion(data?.[0] || null);
          }}
        />
      )}
    </SidebarLayout>
  );
}

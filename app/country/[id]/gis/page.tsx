"use client";

import { useState, useEffect, useRef } from "react";
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
import L from "leaflet";

const MapContainer = dynamic(() => import("react-leaflet").then((m) => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import("react-leaflet").then((m) => m.TileLayer), { ssr: false });
const GeoJSON = dynamic(() => import("react-leaflet").then((m) => m.GeoJSON), { ssr: false });

export default function GISPage({ params }: { params: CountryParams }) {
  const { id } = params;
  const mapRef = useRef<L.Map | null>(null);

  const [versions, setVersions] = useState<any[]>([]);
  const [activeVersion, setActiveVersion] = useState<any>(null);
  const [layers, setLayers] = useState<any[]>([]);
  const [openUpload, setOpenUpload] = useState(false);
  const [openNewVersion, setOpenNewVersion] = useState(false);
  const [visible, setVisible] = useState<Record<number, boolean>>({
    0: false,
    1: false,
    2: false,
    3: false,
    4: false,
    5: false,
  });

  // Fetch dataset versions
  useEffect(() => {
    const fetchVersions = async () => {
      const { data } = await supabase
        .from("gis_dataset_versions")
        .select("*")
        .eq("country_iso", id)
        .order("created_at", { ascending: false });

      if (data) {
        setVersions(data);
        const active = data.find((v: any) => v.is_active);
        if (active) setActiveVersion(active);
      }
    };
    fetchVersions();
  }, [id]);

  // Fetch layers
  useEffect(() => {
    const fetchLayers = async () => {
      if (!activeVersion) return;
      const { data } = await supabase
        .from("gis_layers")
        .select("*")
        .eq("country_iso", id)
        .eq("dataset_version_id", activeVersion.id)
        .order("admin_level_int", { ascending: true });
      if (data) setLayers(data);
    };
    fetchLayers();
  }, [id, activeVersion]);

  const handleVersionCreated = async () => {
    const { data } = await supabase
      .from("gis_dataset_versions")
      .select("*")
      .eq("country_iso", id)
      .order("created_at", { ascending: false });
    if (data) setVersions(data);
  };

  // useGeoJSONLayers Hook
  const { geoJsonLayers } = useGeoJSONLayers({
    supabase,
    layers,
    mapRef,
    visible,
  });

  const toggleVisibility = (lvl: number) =>
    setVisible((prev) => ({ ...prev, [lvl]: !prev[lvl] }));

  const GSC_RED = "var(--gsc-red)";

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
      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        {/* Dataset Version */}
        <div className="rounded-lg border p-4 shadow-sm">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-semibold uppercase text-gray-500">
              Dataset Version
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setOpenNewVersion(true)}
                className="flex items-center gap-1 rounded px-2 py-1 text-sm text-white hover:opacity-90"
                style={{ backgroundColor: GSC_RED }}
              >
                + New
              </button>
            </div>
          </div>
          <select
            value={activeVersion?.id || ""}
            onChange={(e) => {
              const selected = versions.find((v) => v.id === e.target.value);
              setActiveVersion(selected);
            }}
            className="w-full border rounded p-1 text-sm"
          >
            {versions.map((v) => (
              <option key={v.id} value={v.id}>
                {v.title} ({v.year || "n/a"})
              </option>
            ))}
          </select>
          {activeVersion?.source_name && (
            <p className="text-sm mt-2">
              Source:{" "}
              {activeVersion.source_url ? (
                <a
                  href={activeVersion.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  {activeVersion.source_name}
                </a>
              ) : (
                activeVersion.source_name
              )}
            </p>
          )}
        </div>

        {/* Active layers */}
        <div className="rounded-lg border p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase text-gray-500 mb-1">
            Active Layers
          </p>
          <p className="text-lg font-semibold">{layers.length}</p>
          <p className="text-sm text-gray-500">ADM0–ADM5 supported</p>
        </div>

        {/* Country info */}
        <div className="rounded-lg border p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase text-gray-500 mb-1">
            Country
          </p>
          <p className="text-lg font-semibold">{id}</p>
          <p className="text-sm text-gray-500">SSC GIS</p>
        </div>
      </div>

      {/* Data Health Summary */}
      <GISDataHealthPanel layers={layers} />

      {/* Layers Table */}
      <div className="overflow-x-auto mb-4 border rounded-lg bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 text-gray-700">
            <tr>
              <th className="text-left p-2">LEVEL</th>
              <th className="text-left p-2">LAYER</th>
              <th className="text-left p-2">FEATURES</th>
              <th className="text-left p-2">CRS</th>
              <th className="text-left p-2">FORMAT</th>
              <th className="text-left p-2">TOGGLE</th>
            </tr>
          </thead>
          <tbody>
            {layers.map((layer) => (
              <tr key={layer.id} className="border-t hover:bg-gray-50">
                <td className="p-2 font-semibold">{layer.admin_level}</td>
                <td className="p-2">{layer.layer_name}</td>
                <td className="p-2">{layer.feature_count ?? "—"}</td>
                <td className="p-2">{layer.crs ?? "—"}</td>
                <td className="p-2">{layer.format ?? "json"}</td>
                <td className="p-2">
                  <input
                    type="checkbox"
                    checked={visible[layer.admin_level_int] || false}
                    onChange={() => toggleVisibility(layer.admin_level_int)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Map */}
      <div className="relative rounded-lg overflow-hidden border shadow-sm">
        <MapContainer
          center={[12.8797, 121.774]}
          zoom={5}
          style={{ height: "600px", width: "100%" }}
          whenReady={(e) => {
            mapRef.current = e.target;
          }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="&copy; OpenStreetMap contributors"
          />
          {geoJsonLayers}
        </MapContainer>

        {/* Upload button floating bottom-right */}
        <div className="absolute bottom-4 right-4">
          <button
            onClick={() => setOpenUpload(true)}
            className="flex items-center gap-1 rounded px-3 py-2 text-sm text-white shadow-md hover:opacity-90"
            style={{ backgroundColor: GSC_RED }}
          >
            <Upload size={16} /> Upload GIS
          </button>
        </div>
      </div>

      {/* Modals */}
      {openUpload && (
        <UploadGISModal
          open={openUpload}
          onClose={() => setOpenUpload(false)}
          countryIso={id}
          onUploaded={async () => {
            window.location.reload();
          }}
        />
      )}

      {openNewVersion && (
        <CreateGISVersionModal
          countryIso={id}
          onClose={() => setOpenNewVersion(false)}
          onCreated={handleVersionCreated}
        />
      )}
    </SidebarLayout>
  );
}

"use client";

import { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import UploadGISModal from "@/components/country/UploadGISModal";
import CreateGISVersionModal from "@/components/country/CreateGISVersionModal";
import GISDataHealthPanel from "@/components/country/GISDataHealthPanel";
import { Layers, Plus } from "lucide-react";
import type {
  CountryParams,
  GISDatasetVersion,
  GISLayer,
} from "@/app/country/types";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

const MapContainer = dynamic(
  () => import("react-leaflet").then((m) => m.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import("react-leaflet").then((m) => m.TileLayer),
  { ssr: false }
);
const GeoJSON = dynamic(
  () => import("react-leaflet").then((m) => m.GeoJSON),
  { ssr: false }
);

interface GISPageProps {
  params: CountryParams;
}

export default function GISPage({ params }: GISPageProps) {
  const { id } = params;
  const mapRef = useRef<L.Map | null>(null);

  const [layers, setLayers] = useState<GISLayer[]>([]);
  const [visible, setVisible] = useState<Record<number, boolean>>({
    0: false,
    1: false,
    2: false,
    3: false,
    4: false,
    5: false,
  });
  const [versions, setVersions] = useState<GISDatasetVersion[]>([]);
  const [activeVersion, setActiveVersion] = useState<GISDatasetVersion | null>(
    null
  );
  const [openUpload, setOpenUpload] = useState(false);
  const [openNewVersion, setOpenNewVersion] = useState(false);

  // Fetch dataset versions
  useEffect(() => {
    const fetchVersions = async () => {
      const { data, error } = await supabase
        .from("gis_dataset_versions")
        .select("*")
        .eq("country_iso", id)
        .order("created_at", { ascending: false });

      if (!error && data) {
        setVersions(data);
        const active = data.find((v) => v.is_active);
        if (active) setActiveVersion(active);
      }
    };
    fetchVersions();
  }, [id]);

  // Fetch GIS layers
  useEffect(() => {
    const fetchLayers = async () => {
      const { data, error } = await supabase
        .from("gis_layers")
        .select("*")
        .eq("country_iso", id)
        .eq("is_active", true)
        .order("admin_level_int", { ascending: true });

      if (!error && data) setLayers(data);
    };
    fetchLayers();
  }, [id]);

  // Compute layer color
  const getColor = (lvl: number | null) => {
    const palette = [
      "#630710", // GSC Red for ADM0
      "#004b87", // Blue
      "#2e7d32", // Green
      "#d35400", // Orange
      "#374151", // Gray
      "#f5f2ee", // Beige
    ];
    return palette[lvl ?? 0] || "#999";
  };

  const toggleVisibility = (level: number) =>
    setVisible((prev) => ({ ...prev, [level]: !prev[level] }));

  const headerProps = {
    title: "GIS Layers",
    group: "country-config" as const,
    description: "Manage and visualize GIS layers for this country.",
    breadcrumbs: (
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Country Configuration", href: "/country" },
          { label: id },
          { label: "GIS Layers" },
        ]}
      />
    ),
  };

  return (
    <SidebarLayout headerProps={headerProps}>
      {/* Top bar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-4 gap-3">
        <div>
          {activeVersion ? (
            <p className="text-sm text-gray-700">
              <strong>Active Version:</strong> {activeVersion.title}{" "}
              {activeVersion.year && `(${activeVersion.year})`}
              {activeVersion.source_name && (
                <>
                  {" — "}
                  <span className="text-gray-600">
                    Source:{" "}
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
                      activeVersion.source_name
                    )}
                  </span>
                </>
              )}
            </p>
          ) : (
            <p className="text-sm text-gray-500 italic">
              No active version selected.
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setOpenNewVersion(true)}
            className="flex items-center gap-1 rounded px-3 py-1.5 text-sm text-white hover:opacity-90"
            style={{ backgroundColor: "var(--gsc-blue)" }}
          >
            <Plus className="w-4 h-4" /> New Version
          </button>
          <button
            onClick={() => setOpenUpload(true)}
            className="flex items-center gap-1 rounded px-3 py-1.5 text-sm text-white hover:opacity-90"
            style={{ backgroundColor: "var(--gsc-red)" }}
          >
            <Layers className="w-4 h-4" /> Upload GIS Layer
          </button>
        </div>
      </div>

      <GISDataHealthPanel layers={layers} />

      <div className="overflow-x-auto mb-4 border rounded-lg bg-white shadow-sm">
        <table className="min-w-full text-sm text-left">
          <thead className="bg-gray-50 text-gray-700">
            <tr>
              <th className="px-4 py-2">Adm. Level</th>
              <th className="px-4 py-2">Layer Name</th>
              <th className="px-4 py-2 text-center">Features</th>
              <th className="px-4 py-2 text-center">CRS</th>
              <th className="px-4 py-2 text-center">Visible</th>
            </tr>
          </thead>
          <tbody>
            {layers.map((layer) => (
              <tr key={layer.id} className="border-t hover:bg-gray-50">
                <td className="px-4 py-2 font-medium text-gray-700">
                  {layer.admin_level || `ADM${layer.admin_level_int ?? "?"}`}
                </td>
                <td className="px-4 py-2">{layer.layer_name}</td>
                <td className="px-4 py-2 text-center">
                  {layer.feature_count ?? "—"}
                </td>
                <td className="px-4 py-2 text-center">{layer.crs ?? "—"}</td>
                <td className="px-4 py-2 text-center">
                  <input
                    type="checkbox"
                    checked={visible[layer.admin_level_int ?? 0]}
                    onChange={() =>
                      toggleVisibility(layer.admin_level_int ?? 0)
                    }
                    className="w-4 h-4 accent-[color:var(--gsc-red)] cursor-pointer"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="relative border rounded-lg overflow-hidden shadow-sm">
        <MapContainer
          center={[12.8797, 121.774]}
          zoom={5}
          style={{ height: "600px", width: "100%" }}
          whenReady={(mapEvent: any) => {
            mapRef.current = mapEvent.target;
          }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="&copy; OpenStreetMap contributors"
          />
          {layers.map((layer) => {
            const lvl = layer.admin_level_int ?? 0;
            if (!visible[lvl]) return null;

            const path = layer.source?.path;
            if (!path) return null;

            const url = `https://ergsggprgtlsrrsmwtkf.supabase.co/storage/v1/object/public/gis_raw/${path}`;
            return (
              <GeoJSON
                key={layer.id}
                data={undefined as any}
                style={{ color: getColor(lvl), weight: 1, fillOpacity: 0.2 }}
                onAdd={async (event) => {
                  try {
                    const res = await fetch(url);
                    const geojson = await res.json();
                    event.target.clearLayers();
                    event.target.addData(geojson);
                  } catch (e) {
                    console.error("Failed to load GeoJSON:", e);
                  }
                }}
              />
            );
          })}
        </MapContainer>
      </div>

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
    </SidebarLayout>
  );
}

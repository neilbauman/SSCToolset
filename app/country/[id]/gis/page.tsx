"use client";

import { useEffect, useState, useRef } from "react";
import dynamic from "next/dynamic";
import L, { GeoJSON as LeafletGeoJSON, Map as LeafletMap } from "leaflet";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import UploadGISModal from "@/components/country/UploadGISModal";
import GISDataHealthPanel from "@/components/country/GISDataHealthPanel";
import type { CountryParams, GISLayer, GISDatasetVersion } from "@/types";
import { Layers, Upload } from "lucide-react";
import "leaflet/dist/leaflet.css";
import { GeoJsonObject } from "geojson";

const MapContainer = dynamic(() => import("react-leaflet").then((m) => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import("react-leaflet").then((m) => m.TileLayer), { ssr: false });
const GeoJSON = dynamic(() => import("react-leaflet").then((m) => m.GeoJSON), { ssr: false });

const GSC_RED = "var(--gsc-red)";
const GSC_BLUE = "var(--gsc-blue)";

export default function GISPage({ params }: { params: CountryParams }) {
  const { id } = params;
  const mapRef = useRef<LeafletMap | null>(null);

  const [country, setCountry] = useState<any>(null);
  const [layers, setLayers] = useState<GISLayer[]>([]);
  const [geoJsonData, setGeoJsonData] = useState<Record<string, GeoJsonObject | null>>({});
  const [versions, setVersions] = useState<GISDatasetVersion[]>([]);
  const [activeVersion, setActiveVersion] = useState<GISDatasetVersion | null>(null);
  const [openUpload, setOpenUpload] = useState(false);
  const [visible, setVisible] = useState<Record<number, boolean>>({});

  // ────────────────────────────────────────────────
  // Fetch country and layers
  // ────────────────────────────────────────────────
  useEffect(() => {
    const fetchCountry = async () => {
      const { data } = await supabase.from("countries").select("*").eq("iso_code", id).single();
      if (data) setCountry(data);
    };

    const fetchGISData = async () => {
      const { data: versionData } = await supabase
        .from("gis_dataset_versions")
        .select("*")
        .eq("country_iso", id)
        .order("created_at", { ascending: false });

      if (versionData) {
        setVersions(versionData);
        const active = versionData.find((v) => v.is_active);
        setActiveVersion(active || versionData[0] || null);
      }

      const { data: layerData } = await supabase
        .from("gis_layers")
        .select("*")
        .eq("country_iso", id)
        .eq("is_active", true)
        .order("admin_level_int", { ascending: true });

      if (layerData) {
        setLayers(layerData);
        const defaults: Record<number, boolean> = {};
        layerData.forEach((l) => {
          if (l.admin_level_int != null) defaults[l.admin_level_int] = false;
        });
        setVisible(defaults);
      }
    };

    fetchCountry();
    fetchGISData();
  }, [id]);

  // ────────────────────────────────────────────────
  // Fetch GeoJSON when visibility toggles on
  // ────────────────────────────────────────────────
  useEffect(() => {
    const loadGeoJSON = async () => {
      for (const layer of layers) {
        const level = layer.admin_level_int ?? -1;
        if (visible[level] && layer.source?.path) {
          try {
            const url = `https://ergsggprgtlsrrsmwtkf.supabase.co/storage/v1/object/public/${layer.source.path}`;
            const res = await fetch(url);
            const json = (await res.json()) as GeoJsonObject;
            setGeoJsonData((prev) => ({ ...prev, [layer.id]: json }));
          } catch (err) {
            console.error(`Failed to fetch GeoJSON for ${layer.layer_name}`, err);
          }
        }
      }
    };
    loadGeoJSON();
  }, [visible, layers]);

  const toggleVisibility = (lvl: number) => {
    setVisible((prev) => ({ ...prev, [lvl]: !prev[lvl] }));
  };

  const headerProps = {
    title: `${country?.name ?? id} – GIS Layers`,
    group: "country-config" as const,
    description: "Manage and inspect geospatial layers for this country.",
    breadcrumbs: (
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Country Configuration", href: "/country" },
          { label: country?.name ?? id },
          { label: "GIS Layers" },
        ]}
      />
    ),
  };

  return (
    <SidebarLayout headerProps={headerProps}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold flex items-center gap-2 text-[color:var(--gsc-blue)]">
          <Layers size={18} /> Active GIS Version
        </h2>
        <button
          onClick={() => setOpenUpload(true)}
          className="flex items-center gap-2 bg-[color:var(--gsc-red)] text-white text-sm px-3 py-1.5 rounded hover:opacity-90"
        >
          <Upload size={16} /> Upload GIS Layer
        </button>
      </div>

      {activeVersion && (
        <div className="border rounded-lg p-3 bg-white shadow-sm mb-4">
          <p className="font-semibold text-sm">{activeVersion.title}</p>
          <p className="text-xs text-gray-600">
            Year: {activeVersion.year ?? "—"} | Date: {activeVersion.dataset_date ?? "—"}
          </p>
          {activeVersion.source_name && (
            <p className="text-xs text-gray-700 mt-1">
              Source:{" "}
              {activeVersion.source_url ? (
                <a
                  href={activeVersion.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[color:var(--gsc-blue)] underline"
                >
                  {activeVersion.source_name}
                </a>
              ) : (
                activeVersion.source_name
              )}
            </p>
          )}
        </div>
      )}

      <GISDataHealthPanel layers={layers} />

      <div className="overflow-x-auto border rounded-lg bg-white shadow-sm mb-4">
        <table className="min-w-full text-sm text-left">
          <thead className="bg-[color:var(--gsc-light-gray)] text-gray-700">
            <tr>
              <th className="p-2">Adm Level</th>
              <th className="p-2">Layer Name</th>
              <th className="p-2 text-center">CRS</th>
              <th className="p-2 text-center">Features</th>
              <th className="p-2 text-center">Visible</th>
            </tr>
          </thead>
          <tbody>
            {layers.map((l) => (
              <tr key={l.id} className="border-t hover:bg-gray-50">
                <td className="p-2">{l.admin_level || `ADM${l.admin_level_int}`}</td>
                <td className="p-2">{l.layer_name}</td>
                <td className="p-2 text-center">{l.crs ?? "—"}</td>
                <td className="p-2 text-center">{l.feature_count ?? "—"}</td>
                <td className="p-2 text-center">
                  <input
                    type="checkbox"
                    checked={visible[l.admin_level_int ?? -1] || false}
                    onChange={() => toggleVisibility(l.admin_level_int ?? -1)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="border rounded-lg p-2 bg-white shadow-sm">
        <MapContainer
          center={[12.8797, 121.774]}
          zoom={5}
          style={{ height: "600px", width: "100%" }}
          whenReady={() => {
            mapRef.current = mapRef.current ?? null;
          }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="&copy; OpenStreetMap contributors"
          />

          {layers.map(
            (l) =>
              visible[l.admin_level_int ?? -1] &&
              geoJsonData[l.id] && (
                <GeoJSON
                  key={l.id}
                  data={geoJsonData[l.id] as GeoJsonObject}
                  style={{ color: GSC_RED, weight: 1, fillOpacity: 0.2 }}
                />
              )
          )}
        </MapContainer>
      </div>

      {openUpload && (
        <UploadGISModal
          onClose={() => setOpenUpload(false)}
          countryIso={id}
          onUploaded={async () => {
            setOpenUpload(false);
            window.location.reload();
          }}
        />
      )}
    </SidebarLayout>
  );
}

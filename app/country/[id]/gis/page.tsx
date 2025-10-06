"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { Database, Layers, Upload } from "lucide-react";
import UploadGISModal from "@/components/country/UploadGISModal";
import type { CountryParams } from "@/app/country/types";

const MapContainer = dynamic(() => import("react-leaflet").then(m => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import("react-leaflet").then(m => m.TileLayer), { ssr: false });
const GeoJSON = dynamic(() => import("react-leaflet").then(m => m.GeoJSON), { ssr: false });

type GISVersion = {
  id: string;
  country_iso: string;
  title: string;
  year: number | null;
  dataset_date: string | null;
  source: string | null;
  is_active: boolean | null;
  created_at: string;
};

type Country = {
  iso_code: string;
  name: string;
};

type LayerData = {
  level: string;
  geojson: GeoJSON.FeatureCollection;
};

export default function GISPage({ params }: { params: CountryParams }) {
  const { id: countryIso } = params;
  const mapRef = useRef<L.Map | null>(null);

  const [country, setCountry] = useState<Country | null>(null);
  const [versions, setVersions] = useState<GISVersion[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<GISVersion | null>(null);
  const [layers, setLayers] = useState<LayerData[]>([]);
  const [visibleLayers, setVisibleLayers] = useState<Record<string, boolean>>({});
  const [openUpload, setOpenUpload] = useState(false);

  // Fetch country metadata
  useEffect(() => {
    const fetchCountry = async () => {
      const { data } = await supabase.from("countries").select("*").eq("iso_code", countryIso).single();
      if (data) setCountry(data as Country);
    };
    fetchCountry();
  }, [countryIso]);

  // Fetch dataset versions
  const fetchVersions = async () => {
    const { data, error } = await supabase
      .from("gis_dataset_versions")
      .select("*")
      .eq("country_iso", countryIso)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching GIS versions:", error);
      return;
    }

    const list = (data ?? []) as GISVersion[];
    setVersions(list);

    const active = list.find(v => v.is_active);
    const initial = active || list[0] || null;
    setSelectedVersion(initial);

    if (initial) fetchLayerData(initial.id);
    else setLayers([]);
  };

  // Fetch all layers for selected version (ADM1–ADM5)
  const fetchLayerData = async (versionId: string) => {
    try {
      const { data, error } = await supabase
        .from("admin_units")
        .select("level,metadata")
        .eq("dataset_version_id", versionId);

      if (error) throw error;

      // Simulated loading of geojsons from storage (or metadata)
      const mockLevels = ["ADM1", "ADM2", "ADM3", "ADM4", "ADM5"];
      const layerResults: LayerData[] = mockLevels.map(level => ({
        level,
        geojson: {
          type: "FeatureCollection",
          features: [],
        },
      }));

      setLayers(layerResults);
      setVisibleLayers(Object.fromEntries(mockLevels.map(l => [l, false])));
    } catch (err) {
      console.error("Error fetching GIS layers:", err);
      setLayers([]);
    }
  };

  // Fetch versions initially
  useEffect(() => {
    fetchVersions();
  }, [countryIso]);

  const toggleLayer = (level: string) => {
    setVisibleLayers(prev => ({ ...prev, [level]: !prev[level] }));
  };

  // Header for layout
  const headerProps = {
    title: `${country?.name ?? countryIso} – GIS Layers`,
    group: "country-config" as const,
    description: "Manage GIS dataset versions and visualize administrative boundaries.",
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
      {/* --- Versions Section --- */}
      <div className="border rounded-lg p-4 shadow-sm mb-6">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Database className="w-5 h-5 text-blue-600" /> Dataset Versions
          </h2>
          <button
            onClick={() => setOpenUpload(true)}
            className="flex items-center text-sm text-white bg-[color:var(--gsc-red)] px-3 py-1 rounded hover:opacity-90"
          >
            <Upload className="w-4 h-4 mr-1" /> Upload Dataset
          </button>
        </div>

        {versions.length ? (
          <select
            className="border rounded px-2 py-1 text-sm"
            value={selectedVersion?.id || ""}
            onChange={e => {
              const v = versions.find(v => v.id === e.target.value);
              setSelectedVersion(v || null);
              if (v) fetchLayerData(v.id);
            }}
          >
            {versions.map(v => (
              <option key={v.id} value={v.id}>
                {v.title} {v.is_active ? "(Active)" : ""}
              </option>
            ))}
          </select>
        ) : (
          <p className="italic text-gray-500">No GIS dataset versions found.</p>
        )}
      </div>

      {/* --- Map Visualization Section --- */}
      <div className="border rounded-lg shadow-sm">
        <div className="flex justify-between items-center border-b p-3 bg-gray-50">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Layers className="w-5 h-5 text-green-600" /> GIS Visualization
          </h2>
          {layers.length > 0 && (
            <div className="flex gap-2">
              {layers.map(layer => (
                <label key={layer.level} className="flex items-center text-sm gap-1">
                  <input
                    type="checkbox"
                    checked={visibleLayers[layer.level] || false}
                    onChange={() => toggleLayer(layer.level)}
                  />
                  {layer.level}
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="w-full h-[600px] relative z-0">
          <MapContainer
            center={[12.8797, 121.774]} // Example: Philippines center
            zoom={6}
            style={{ height: "600px", width: "100%" }}
            className="rounded-b-lg"
            whenReady={map => {
              mapRef.current = map.target;
            }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/">OSM</a> contributors'
            />

            {layers.map(
              layer =>
                visibleLayers[layer.level] && (
                  <GeoJSON key={layer.level} data={layer.geojson} />
                )
            )}
          </MapContainer>
        </div>
      </div>

      {/* --- Upload Modal --- */}
      <UploadGISModal
        open={openUpload}
        onClose={() => setOpenUpload(false)}
        countryIso={countryIso}
        onUploaded={fetchVersions}
      />
    </SidebarLayout>
  );
}

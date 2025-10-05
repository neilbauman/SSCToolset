"use client";

import { useState, useEffect, useRef } from "react";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import UploadGISModal from "@/components/country/UploadGISModal";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { Layers, Upload, Check, Map as MapIcon } from "lucide-react";
import type { CountryParams } from "@/app/country/types";
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
  layer_name: string;
  format: string;
  source: { path: string };
  dataset_version_id: string;
};

export default function GISPage({ params }: any) {
  const { id: countryIso } = params as CountryParams;
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);

  const [country, setCountry] = useState<Country | null>(null);
  const [versions, setVersions] = useState<GISDatasetVersion[]>([]);
  const [activeLayer, setActiveLayer] = useState<GISLayer | null>(null);
  const [openUpload, setOpenUpload] = useState(false);
  const [showMap, setShowMap] = useState(true);
  const [mapReady, setMapReady] = useState(false);

  // ---- Load country ----
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

  // ---- Load GIS versions ----
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

    setVersions(data || []);

    const active = (data || []).find((v) => v.is_active);
    if (active) fetchActiveLayer(active.id);
  };

  // ---- Load associated layer ----
  const fetchActiveLayer = async (versionId: string) => {
    const { data, error } = await supabase
      .from("gis_layers")
      .select("*")
      .eq("dataset_version_id", versionId)
      .maybeSingle();

    if (error) {
      console.error("Error fetching GIS layer:", error);
      return;
    }

    if (data) setActiveLayer(data as GISLayer);
  };

  useEffect(() => {
    fetchVersions();
  }, [countryIso]);

  // ---- Initialize / Update Map ----
  useEffect(() => {
    if (!activeLayer || !showMap) return;

    const initMap = async () => {
      if (!mapContainerRef.current) return;

      // Clear any existing map
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }

      // Initialize
      const map = L.map(mapContainerRef.current, {
        zoomControl: true,
        scrollWheelZoom: true,
      }).setView([12.8797, 121.774], 5);
      mapRef.current = map;

      // Add basemap
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors",
      }).addTo(map);

      // Load GeoJSON
      const { data, error } = await supabase.storage
        .from("gis_raw")
        .download(activeLayer.source.path);

      if (error || !data) {
        console.error("Failed to download GeoJSON:", error);
        return;
      }

      try {
        const text = await data.text();
        const geojson = JSON.parse(text);

        const geoLayer = L.geoJSON(geojson, {
          style: {
            color: "#cc0000",
            weight: 1,
            fillOpacity: 0.15,
          },
        }).addTo(map);

        map.fitBounds(geoLayer.getBounds(), { padding: [30, 30] });
        setMapReady(true);
      } catch (e) {
        console.error("Invalid GeoJSON:", e);
      }
    };

    initMap();
  }, [activeLayer, showMap]);

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
      <div className="relative border rounded-lg p-4 shadow-sm mb-6">
        {/* Upload always visible above map */}
        <div className="flex justify-between items-center mb-3 relative z-50">
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
          </div>
        </div>

        {/* Table */}
        {versions.length > 0 ? (
          <table className="w-full text-sm border mb-3">
            <thead className="bg-gray-100">
              <tr>
                <th className="border px-2 py-1 text-left">Title</th>
                <th className="border px-2 py-1 text-left">Source</th>
                <th className="border px-2 py-1 text-left">Year</th>
                <th className="border px-2 py-1 text-left">Created</th>
                <th className="border px-2 py-1 text-left">Layers</th>
                <th className="border px-2 py-1 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {versions.map((v) => (
                <tr key={v.id} className="hover:bg-gray-50">
                  <td className="border px-2 py-1">{v.title}</td>
                  <td className="border px-2 py-1">{v.source || "—"}</td>
                  <td className="border px-2 py-1">{v.year || "—"}</td>
                  <td className="border px-2 py-1">
                    {new Date(v.created_at).toLocaleDateString()}
                  </td>
                  <td className="border px-2 py-1 text-center">1</td>
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

        {/* Map section */}
        {activeLayer && (
          <div className="relative border rounded-lg overflow-hidden shadow-sm mt-4">
            <div className="absolute top-2 left-2 z-[60]">
              <button
                onClick={() => setShowMap(!showMap)}
                className="bg-white text-sm px-3 py-1 rounded shadow hover:bg-gray-100"
              >
                {showMap ? "Hide Map" : "Show Map"}
              </button>
            </div>

            {showMap && (
              <div
                ref={mapContainerRef}
                id="map-container"
                className="w-full relative z-10"
                style={{ height: "600px" }}
              />
            )}
          </div>
        )}
      </div>

      {/* Upload Modal — forced top z-index */}
      {openUpload && (
        <div className="z-[9999] relative">
          <UploadGISModal
            open={openUpload}
            onClose={() => setOpenUpload(false)}
            countryIso={countryIso}
            onUploaded={fetchVersions}
          />
        </div>
      )}
    </SidebarLayout>
  );
}

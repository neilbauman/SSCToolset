"use client";

import { useState, useEffect, useRef } from "react";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import UploadGISModal from "@/components/country/UploadGISModal";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { Layers, Upload, Check, Map as MapIcon } from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { CountryParams } from "@/app/country/types";

type Country = { iso_code: string; name: string; };
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
  layer_name: string;
  admin_level?: number | null;
  format: string;
  source: { path: string };
  dataset_version_id: string;
};

export default function GISPage({ params }: any) {
  const { id: countryIso } = params as CountryParams;
  const [country, setCountry] = useState<Country | null>(null);
  const [versions, setVersions] = useState<GISDatasetVersion[]>([]);
  const [layers, setLayers] = useState<GISLayer[]>([]);
  const [activeVersion, setActiveVersion] = useState<GISDatasetVersion | null>(null);
  const [openUpload, setOpenUpload] = useState(false);
  const [showMap, setShowMap] = useState(true);
  const [visibleLevels, setVisibleLevels] = useState<Record<number, boolean>>({});
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const layerGroupsRef = useRef<Record<number, L.GeoJSON>>({});

  // Load Country Info
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

  // Load Versions
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

    const list = data || [];
    setVersions(list);
    const active = list.find((v) => v.is_active) || list[0];
    setActiveVersion(active || null);
    if (active) await fetchLayers(active.id);
  };

  // Load Layers
  const fetchLayers = async (versionId: string) => {
    const { data, error } = await supabase
      .from("gis_layers")
      .select("*")
      .eq("dataset_version_id", versionId);

    if (error) {
      console.error("Error loading GIS layers:", error);
      return;
    }

    setLayers(data || []);
    const uniqueLevels = Array.from(
      new Set((data || []).map((l) => l.admin_level ?? 0))
    );
    const visibility = Object.fromEntries(uniqueLevels.map((lvl) => [lvl, true]));
    setVisibleLevels(visibility);
  };

  useEffect(() => {
    fetchVersions();
  }, [countryIso]);

  // Initialize + Render Map
  useEffect(() => {
    if (!showMap || !activeVersion) return;
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
      layerGroupsRef.current = {};
    }

    const map = L.map(mapContainerRef.current as HTMLElement).setView(
      [12.8797, 121.774],
      5
    );
    mapRef.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(map);

    (async () => {
      for (const layer of layers) {
        const level = layer.admin_level ?? 0;
        const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${layer.source.path}`;
        const res = await fetch(url);
        if (!res.ok) continue;
        const geojson = await res.json();

        const gLayer = L.geoJSON(geojson, {
          style: {
            color: ["#0044cc", "#d00", "#228B22", "#ff9900"][level] ?? "#d00",
            weight: 1,
            fillOpacity: 0.1,
          },
        });

        layerGroupsRef.current[level] = gLayer;
        if (visibleLevels[level]) gLayer.addTo(map);
      }

      const allBounds = Object.values(layerGroupsRef.current)
        .map((l) => l.getBounds?.())
        .filter(Boolean);
      if (allBounds.length > 0) {
        const combined = allBounds.reduce((a, b) => a.extend(b), allBounds[0]);
        map.fitBounds(combined, { padding: [20, 20] });
      }
    })();
  }, [layers, showMap]);

  // Toggle Layer Visibility
  const toggleLevel = (level: number) => {
    setVisibleLevels((prev) => {
      const next = { ...prev, [level]: !prev[level] };
      const map = mapRef.current;
      if (!map) return next;
      const layer = layerGroupsRef.current[level];
      if (layer) {
        if (next[level]) layer.addTo(map);
        else layer.removeFrom(map);
      }
      return next;
    });
  };

  // Header
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
          <button
            onClick={() => setOpenUpload(true)}
            className="flex items-center text-sm text-white bg-[color:var(--gsc-red)] px-3 py-1 rounded hover:opacity-90"
          >
            <Upload className="w-4 h-4 mr-1" /> Upload Dataset
          </button>
        </div>

        {versions.length > 0 ? (
          <table className="w-full text-sm border">
            <thead className="bg-gray-100">
              <tr>
                <th className="border px-2 py-1 text-left">Title</th>
                <th className="border px-2 py-1 text-left">Source</th>
                <th className="border px-2 py-1 text-left">Created</th>
                <th className="border px-2 py-1 text-center">Status</th>
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
                  <td className="border px-2 py-1 text-center">
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

      {/* Map Controls */}
      {activeVersion && (
        <div className="mt-4 border rounded-lg shadow-sm overflow-hidden relative">
          <div className="flex justify-between items-center bg-gray-50 border-b px-3 py-2">
            <span className="font-medium flex items-center gap-2 text-gray-700">
              <MapIcon className="w-4 h-4 text-green-600" /> Map Preview
            </span>
            <button
              onClick={() => setShowMap(!showMap)}
              className="bg-white border text-sm px-3 py-1 rounded shadow-sm hover:bg-gray-100"
            >
              {showMap ? "Hide Map" : "Show Map"}
            </button>
          </div>

          {/* Layer Toggles */}
          {showMap && (
            <div className="absolute top-3 left-3 z-[1000] bg-white shadow p-2 rounded text-xs">
              <strong className="block mb-1 text-gray-700">Layers</strong>
              {Object.keys(visibleLevels).map((lvl) => (
                <label key={lvl} className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={visibleLevels[Number(lvl)]}
                    onChange={() => toggleLevel(Number(lvl))}
                  />
                  Adm{lvl}
                </label>
              ))}
            </div>
          )}

          {showMap && (
            <div
              ref={mapContainerRef}
              className="relative"
              style={{ height: "600px", zIndex: 1 }}
            />
          )}
        </div>
      )}

      {/* Upload Modal */}
      <UploadGISModal
        open={openUpload}
        onClose={() => setOpenUpload(false)}
        countryIso={countryIso}
        onUploaded={fetchVersions}
      />
    </SidebarLayout>
  );
}

// app/country/[id]/gis/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";

import DatasetHealth from "@/components/country/DatasetHealth";
// (Keep UploadGISModal etc. out for now to stabilize builds)

// Icons
import { Database, FileDown, Layers as LayersIcon } from "lucide-react";

// Map
import { MapContainer, TileLayer, GeoJSON } from "react-leaflet";
import type { FeatureCollection, Polygon, MultiPolygon, GeoJsonObject } from "geojson";
import "leaflet/dist/leaflet.css";

import type { CountryParams } from "@/app/country/types";

type Country = {
  iso_code: string;
  name: string;
};

type GisVersion = {
  id: string;
  country_iso: string;
  title: string | null;
  year: number | null;
  dataset_date: string | null;
  source: string | null;
  is_active: boolean | null;
  created_at: string;
};

type GisLayer = {
  id: string;
  dataset_version_id: string | null;
  admin_level: "ADM0" | "ADM1" | "ADM2" | "ADM3" | "ADM4" | "ADM5";
};

const ALL_LEVELS: GisLayer["admin_level"][] = ["ADM0", "ADM1", "ADM2", "ADM3", "ADM4", "ADM5"];

export default function GISPage({ params }: { params: CountryParams }) {
  const { id: countryIso } = params;

  const [country, setCountry] = useState<Country | null>(null);
  const [versions, setVersions] = useState<GisVersion[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<GisVersion | null>(null);

  // Layers available for the selected version (from gis_layers)
  const [availableLevels, setAvailableLevels] = useState<GisLayer["admin_level"][]>([]);
  // Visibility toggles
  const [visibleLevels, setVisibleLevels] = useState<Set<GisLayer["admin_level"]>>(new Set());

  // --- Fetch country metadata
  useEffect(() => {
    const run = async () => {
      const { data } = await supabase
        .from("countries")
        .select("iso_code,name")
        .eq("iso_code", countryIso)
        .single();
      if (data) setCountry(data as Country);
    };
    run();
  }, [countryIso]);

  // --- Fetch GIS dataset versions for this country
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

    const list = (data ?? []) as GisVersion[];
    setVersions(list);

    const active = list.find((v) => v.is_active);
    const initial = active || list[0] || null;
    setSelectedVersion(initial);
  };

  useEffect(() => {
    fetchVersions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countryIso]);

  // --- Fetch layers (admin levels) for the selected version
  useEffect(() => {
    const run = async () => {
      if (!selectedVersion?.id) {
        setAvailableLevels([]);
        setVisibleLevels(new Set());
        return;
      }
      const { data, error } = await supabase
        .from("gis_layers")
        .select("id,dataset_version_id,admin_level")
        .eq("dataset_version_id", selectedVersion.id);

      if (error) {
        console.error("Error fetching GIS layers:", error);
        setAvailableLevels([]);
        setVisibleLevels(new Set());
        return;
      }

      const levels = (data ?? [])
        .map((r) => r.admin_level)
        .filter((v): v is GisLayer["admin_level"] => ALL_LEVELS.includes(v as any));

      // If table is empty, don’t show any toggles by default (keeps UI honest)
      setAvailableLevels(levels);
      setVisibleLevels(new Set()); // default to off as requested
    };
    run();
  }, [selectedVersion?.id]);

  // --- Header for SidebarLayout
  const headerProps = {
    title: `${country?.name ?? countryIso} – GIS Layers`,
    group: "country-config" as const,
    description: "Manage and visualize uploaded administrative boundary layers.",
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

  // --- UI helpers
  const handleToggle = (lvl: GisLayer["admin_level"]) => {
    setVisibleLevels((prev) => {
      const next = new Set(prev);
      if (next.has(lvl)) next.delete(lvl);
      else next.add(lvl);
      return next;
    });
  };

  const downloadTemplate = () => {
    // Simple CSV manifest example (kept generic for now)
    const csv = ["admin_level,storage_path", "ADM0,countries/ADM0.geojson"].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "GIS_Layers_Template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  // --- Dummy FeatureCollections per admin level (UI preview only)
  const dummyGeoByLevel = useMemo<Record<GisLayer["admin_level"], FeatureCollection>>(() => {
    // A few rough boxes over the Philippines area so you can see something when toggling.
    // Coordinates are arbitrary, just for visual differentiation.
    const makeBox = (west: number, south: number, east: number, north: number): Polygon => ({
      type: "Polygon",
      coordinates: [
        [
          [west, south],
          [east, south],
          [east, north],
          [west, north],
          [west, south],
        ],
      ],
    });

    const mkFeature = (poly: Polygon | MultiPolygon, props: Record<string, any>) => ({
      type: "Feature" as const,
      geometry: poly,
      properties: props,
    });

    const fc = (features: any[]): FeatureCollection => ({
      type: "FeatureCollection",
      features,
    });

    return {
      ADM0: fc([mkFeature(makeBox(118, 7, 126, 19), { name: "ADM0 dummy" })]),
      ADM1: fc([
        mkFeature(makeBox(118, 7, 121.5, 13), { name: "ADM1 - A" }),
        mkFeature(makeBox(121.7, 7, 126, 13), { name: "ADM1 - B" }),
        mkFeature(makeBox(118, 13.2, 122, 19), { name: "ADM1 - C" }),
        mkFeature(makeBox(122.2, 13.2, 126, 19), { name: "ADM1 - D" }),
      ]),
      ADM2: fc([
        mkFeature(makeBox(118, 7, 119.8, 10), { name: "ADM2 1" }),
        mkFeature(makeBox(120, 7, 121.8, 10), { name: "ADM2 2" }),
        mkFeature(makeBox(123, 10.5, 124.8, 13.5), { name: "ADM2 3" }),
        mkFeature(makeBox(124.9, 10.5, 126, 13.5), { name: "ADM2 4" }),
      ]),
      ADM3: fc([
        mkFeature(makeBox(118.2, 7.2, 118.9, 8.0), { name: "ADM3 a" }),
        mkFeature(makeBox(119.0, 7.2, 119.7, 8.0), { name: "ADM3 b" }),
        mkFeature(makeBox(121.0, 8.2, 121.7, 9.0), { name: "ADM3 c" }),
        mkFeature(makeBox(122.0, 8.2, 122.7, 9.0), { name: "ADM3 d" }),
      ]),
      ADM4: fc([
        mkFeature(makeBox(118.25, 7.25, 118.5, 7.6), { name: "ADM4 i" }),
        mkFeature(makeBox(118.6, 7.25, 118.85, 7.6), { name: "ADM4 ii" }),
        mkFeature(makeBox(121.05, 8.25, 121.3, 8.6), { name: "ADM4 iii" }),
        mkFeature(makeBox(121.4, 8.25, 121.65, 8.6), { name: "ADM4 iv" }),
      ]),
      ADM5: fc([
        mkFeature(makeBox(118.30, 7.30, 118.38, 7.40), { name: "ADM5 1" }),
        mkFeature(makeBox(118.42, 7.30, 118.50, 7.40), { name: "ADM5 2" }),
        mkFeature(makeBox(121.10, 8.30, 121.18, 8.40), { name: "ADM5 3" }),
        mkFeature(makeBox(121.22, 8.30, 121.30, 8.40), { name: "ADM5 4" }),
      ]),
    };
  }, []);

  const totalVisible = visibleLevels.size;

  const totalRecords = useMemo(() => {
    // for DatasetHealth display; using number of available layers only
    return availableLevels.length;
  }, [availableLevels.length]);

  return (
    <SidebarLayout headerProps={headerProps}>
      {/* --- Versions Section --- */}
      <div className="border rounded-lg p-4 shadow-sm mb-6">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Database className="w-5 h-5 text-green-600" /> GIS Dataset Versions
          </h2>
          <div className="flex gap-2">
            <button
              onClick={downloadTemplate}
              className="flex items-center text-sm border px-3 py-1 rounded hover:bg-gray-50"
            >
              <FileDown className="w-4 h-4 mr-1" /> Download Template
            </button>
            {/* Upload button intentionally omitted for stability */}
          </div>
        </div>

        {versions.length ? (
          <table className="w-full text-sm border">
            <thead className="bg-gray-100">
              <tr>
                <th className="border px-2 py-1 text-left">Title</th>
                <th className="border px-2 py-1 text-left">Year</th>
                <th className="border px-2 py-1 text-left">Date</th>
                <th className="border px-2 py-1 text-left">Source</th>
                <th className="border px-2 py-1 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {versions.map((v) => {
                const isSelected = selectedVersion?.id === v.id;
                const isActive = !!v.is_active;
                return (
                  <tr
                    key={v.id}
                    className={`hover:bg-gray-50 cursor-pointer ${isSelected ? "bg-blue-50" : ""}`}
                    onClick={() => setSelectedVersion(v)}
                  >
                    <td className="border px-2 py-1">{v.title || "—"}</td>
                    <td className="border px-2 py-1">{v.year ?? "—"}</td>
                    <td className="border px-2 py-1">{v.dataset_date || "—"}</td>
                    <td className="border px-2 py-1">{v.source || "—"}</td>
                    <td className="border px-2 py-1">
                      {isActive ? (
                        <span className="inline-block text-xs px-2 py-0.5 rounded bg-green-100 text-green-800">
                          Active
                        </span>
                      ) : (
                        <span className="inline-block text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-700">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <p className="italic text-gray-500">No versions uploaded yet</p>
        )}
      </div>

      {/* --- Dataset Health --- */}
      <DatasetHealth totalUnits={totalRecords} />

      {/* --- Layers list (per selected version) --- */}
      <div className="border rounded-lg p-4 shadow-sm mt-4 mb-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <LayersIcon className="w-5 h-5 text-blue-600" />
            Layers (toggle visibility)
          </h2>
          <div className="text-xs text-gray-500">
            Showing {totalVisible} / {availableLevels.length} toggled on
          </div>
        </div>

        {selectedVersion ? (
          availableLevels.length ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-y-2">
              {availableLevels.map((lvl) => (
                <label key={lvl} className="inline-flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={visibleLevels.has(lvl)}
                    onChange={() => handleToggle(lvl)}
                  />
                  {lvl}
                </label>
              ))}
            </div>
          ) : (
            <p className="italic text-gray-500">No layers registered for this version.</p>
          )
        ) : (
          <p className="italic text-gray-500">Select a dataset version to see its layers.</p>
        )}
      </div>

      {/* --- Map --- */}
      <div className="border rounded-lg p-2 shadow-sm">
        <div className="h-[560px] w-full overflow-hidden rounded-md">
          <MapContainer
            center={[12.8797, 121.7740]} // Philippines-ish center
            zoom={6}
            style={{ height: "100%", width: "100%" }}
            // Avoid whenReady/whenCreated to keep typings happy
          >
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

            {/* Render dummy features for toggled levels */}
            {Array.from(visibleLevels).map((lvl) => {
              const data: GeoJsonObject = dummyGeoByLevel[lvl];
              // style per level (subtle differences)
              const style = {
                color: "#630710",
                weight: lvl === "ADM0" ? 2 : 1,
                opacity: 0.9,
                fillOpacity: 0.1,
              };
              return <GeoJSON key={lvl} data={data} style={() => style} />;
            })}
          </MapContainer>
        </div>

        {!visibleLevels.size && (
          <div className="py-6 text-center text-sm text-gray-500">
            GIS visualization will appear here once layers are toggled on.
          </div>
        )}
      </div>
    </SidebarLayout>
  );
}

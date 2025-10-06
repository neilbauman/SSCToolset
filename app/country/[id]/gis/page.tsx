// app/country/[id]/gis/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";

import DatasetHealth from "@/components/country/DatasetHealth";
import {
  Database,
  FileDown,
  Layers as LayersIcon,
  Upload,
  PlusCircle,
  Edit,
  Trash2,
} from "lucide-react";

import { MapContainer, TileLayer, GeoJSON } from "react-leaflet";
import type { FeatureCollection, Polygon, MultiPolygon, GeoJsonObject } from "geojson";
import "leaflet/dist/leaflet.css";

import type { CountryParams } from "@/app/country/types";

type Country = { iso_code: string; name: string };

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
  source?: any;
  created_at?: string;
  updated_at?: string;
};

const ALL_LEVELS: GisLayer["admin_level"][] = ["ADM0", "ADM1", "ADM2", "ADM3", "ADM4", "ADM5"];

export default function GISPage({ params }: { params: CountryParams }) {
  const { id: countryIso } = params;

  const [country, setCountry] = useState<Country | null>(null);
  const [versions, setVersions] = useState<GisVersion[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<GisVersion | null>(null);

  const [availableLevels, setAvailableLevels] = useState<GisLayer["admin_level"][]>([]);
  const [visibleLevels, setVisibleLevels] = useState<Set<GisLayer["admin_level"]>>(new Set());
  const [layerMetadata, setLayerMetadata] = useState<GisLayer[]>([]);

  // ─────────────────────────────── Fetch metadata ───────────────────────────────
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

  const fetchVersions = async () => {
    const { data, error } = await supabase
      .from("gis_dataset_versions")
      .select("*")
      .eq("country_iso", countryIso)
      .order("created_at", { ascending: false });
    if (error) return console.error(error);

    const list = (data ?? []) as GisVersion[];
    setVersions(list);
    const active = list.find((v) => v.is_active);
    const initial = active || list[0] || null;
    setSelectedVersion(initial);
  };

  useEffect(() => {
    fetchVersions();
  }, [countryIso]);

  // ─────────────────────────────── Fetch layers ───────────────────────────────
  useEffect(() => {
    const run = async () => {
      if (!selectedVersion?.id) {
        setAvailableLevels([]);
        setVisibleLevels(new Set());
        setLayerMetadata([]);
        return;
      }

      const { data, error } = await supabase
        .from("gis_layers")
        .select("id,admin_level,source,created_at,updated_at")
        .eq("dataset_version_id", selectedVersion.id);
      if (error) return console.error(error);

      const layers = (data ?? []) as GisLayer[];
      const lvls = layers
        .map((r) => r.admin_level)
        .filter((v): v is GisLayer["admin_level"] => ALL_LEVELS.includes(v as any));

      setAvailableLevels(lvls);
      setLayerMetadata(layers);
      setVisibleLevels(new Set());
    };
    run();
  }, [selectedVersion?.id]);

  // ─────────────────────────────── Header config ───────────────────────────────
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

  // ─────────────────────────────── UI helpers ───────────────────────────────
  const handleToggle = (lvl: GisLayer["admin_level"]) => {
    setVisibleLevels((prev) => {
      const next = new Set(prev);
      next.has(lvl) ? next.delete(lvl) : next.add(lvl);
      return next;
    });
  };

  const downloadTemplate = () => {
    const csv = ["admin_level,storage_path", "ADM0,countries/ADM0.geojson"].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "GIS_Layers_Template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  // ─────────────────────────────── Dummy geometries ───────────────────────────────
  const dummyGeoByLevel = useMemo<Record<GisLayer["admin_level"], FeatureCollection>>(() => {
    const makeBox = (w: number, s: number, e: number, n: number): Polygon => ({
      type: "Polygon",
      coordinates: [[[w, s], [e, s], [e, n], [w, n], [w, s]]],
    });
    const mkFeature = (poly: Polygon | MultiPolygon, props: any) => ({
      type: "Feature" as const,
      geometry: poly,
      properties: props,
    });
    const fc = (f: any[]): FeatureCollection => ({ type: "FeatureCollection", features: f });

    return {
      ADM0: fc([mkFeature(makeBox(118, 7, 126, 19), { name: "ADM0 dummy" })]),
      ADM1: fc([
        mkFeature(makeBox(118, 7, 121.5, 13), { name: "ADM1A" }),
        mkFeature(makeBox(121.7, 7, 126, 13), { name: "ADM1B" }),
      ]),
      ADM2: fc([mkFeature(makeBox(120, 10, 123, 12), { name: "ADM2" })]),
      ADM3: fc([mkFeature(makeBox(121, 11, 122, 12), { name: "ADM3" })]),
      ADM4: fc([mkFeature(makeBox(121.2, 11.2, 121.5, 11.5), { name: "ADM4" })]),
      ADM5: fc([mkFeature(makeBox(121.25, 11.25, 121.35, 11.35), { name: "ADM5" })]),
    };
  }, []);

  const totalRecords = availableLevels.length;

  // ─────────────────────────────── Render ───────────────────────────────
  return (
    <SidebarLayout headerProps={headerProps}>
      {/* Dataset Versions */}
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
            <button
              disabled
              className="flex items-center text-sm text-white bg-[color:var(--gsc-red)] px-3 py-1 rounded opacity-70 cursor-not-allowed"
            >
              <Upload className="w-4 h-4 mr-1" /> Upload GIS Dataset
            </button>
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
                        <span className="inline-block text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-700">
                          —
                        </span>
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

      {/* Dataset Health */}
      <DatasetHealth totalUnits={totalRecords} />

      {/* Layers Panel */}
      <div className="border rounded-lg p-4 shadow-sm mt-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <LayersIcon className="w-5 h-5 text-blue-600" /> Layers in Selected Version
          </h2>
          <button
            disabled
            className="flex items-center text-sm text-white bg-[color:var(--gsc-red)] px-3 py-1 rounded opacity-70 cursor-not-allowed"
          >
            <PlusCircle className="w-4 h-4 mr-1" /> Add GIS Layer
          </button>
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

      {/* Layer Metadata Table */}
      <div className="border rounded-lg p-4 shadow-sm mb-6">
        <h2 className="text-lg font-semibold flex items-center gap-2 mb-3">
          <LayersIcon className="w-5 h-5 text-blue-600" /> Layer Metadata
        </h2>

        {selectedVersion ? (
          layerMetadata.length ? (
            <table className="w-full text-sm border">
              <thead className="bg-gray-100">
                <tr>
                  <th className="border px-2 py-1 text-left">Admin Level</th>
                  <th className="border px-2 py-1 text-left">Storage Path</th>
                  <th className="border px-2 py-1 text-left">Created</th>
                  <th className="border px-2 py-1 text-left">Updated</th>
                  <th className="border px-2 py-1 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {layerMetadata.map((l) => (
                  <tr key={l.id} className="hover:bg-gray-50">
                    <td className="border px-2 py-1">{l.admin_level}</td>
                    <td className="border px-2 py-1 text-gray-700">
                      {l.source?.path || l.source?.file || "—"}
                    </td>
                    <td className="border px-2 py-1">
                      {l.created_at ? new Date(l.created_at).toLocaleDateString() : "—"}
                    </td>
                    <td className="border px-2 py-1">
                      {l.updated_at ? new Date(l.updated_at).toLocaleDateString() : "—"}
                    </td>
                    <td className="border px-2 py-1">
                      <div className="flex gap-2 text-gray-400">
                        <button disabled title="Edit disabled">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button disabled title="Delete disabled">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="italic text-gray-500">
              No layer metadata found for this dataset version.
            </p>
          )
        ) : (
          <p className="italic text-gray-500">Select a version to view layer metadata.</p>
        )}
      </div>

      {/* Map Display */}
      <div className="border rounded-lg p-2 shadow-sm">
        <div className="h-[560px] w-full overflow-hidden rounded-md">
          <MapContainer
            center={[12.8797, 121.774]}
            zoom={6}
            style={{ height: "100%", width: "100%" }}
          >
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            {Array.from(visibleLevels).map((lvl) => {
              const data: GeoJsonObject = dummyGeoByLevel[lvl];
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

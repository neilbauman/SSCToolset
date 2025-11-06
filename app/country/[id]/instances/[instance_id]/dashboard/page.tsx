"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { MapContainer, TileLayer, GeoJSON, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { ChevronRight } from "lucide-react";

// Dynamic import (avoid SSR issues)
const LeafletMap = dynamic(() => Promise.resolve(MapContainer), { ssr: false });

type Dataset = {
  id: string;
  title: string;
  result_table: string;
  admin_level: string;
  category: string;
  subcategory: string;
};

export default function DashboardPage({
  params,
}: {
  params: { id: string; instance_id: string };
}) {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [geoData, setGeoData] = useState<any>(null);
  const [baseGeoData, setBaseGeoData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);

  // Load base GIS features once
  useEffect(() => {
    loadBaseGeo();
  }, []);

  // Load datasets linked to instance
  useEffect(() => {
    loadDatasets();
  }, []);

  async function loadBaseGeo() {
    const { data, error } = await supabase.from("gis_features").select("geom, pcode, name");
    if (error) {
      console.error("Error loading GIS features:", error);
      return;
    }
    if (data) {
      const geojson = {
        type: "FeatureCollection",
        features: data.map((f: any) => ({
          type: "Feature",
          geometry: f.geom,
          properties: { pcode: f.pcode, name: f.name },
        })),
      };
      setBaseGeoData(geojson);
    }
  }

  async function loadDatasets() {
    const { data, error } = await supabase
      .from("instance_layers")
      .select("id, result_table, category, subcategory")
      .eq("instance_id", params.instance_id);

    if (error) {
      console.error("Error loading datasets:", error);
      return;
    }
    if (!data) return;
    const formatted = data.map((d) => ({
      id: d.id,
      title: `${d.category} — ${d.result_table}`,
      result_table: d.result_table,
      admin_level: d.subcategory || "ADM3",
      category: d.category,
      subcategory: d.subcategory,
    }));
    setDatasets(formatted);
  }

  async function loadMapData(result_table: string) {
    if (!result_table) return;
    setLoading(true);
    const { data, error } = await supabase.rpc("get_geojson_for_result_table", {
      p_result_table: result_table,
    });
    setLoading(false);
    if (error) {
      console.error("Error loading dataset:", error);
      return;
    }
    setGeoData(data);
  }

  useEffect(() => {
    if (selected) loadMapData(selected);
  }, [selected]);

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* === Sidebar === */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r">
        <div className="p-4 text-lg font-semibold text-[color:var(--gsc-green)]">
          SSC Toolset
        </div>
        <nav className="flex-1 overflow-y-auto text-sm">
          <ul>
            <li>
              <Link
                href={`/country/${params.id}`}
                className="block px-4 py-2 text-gray-700 hover:bg-gray-100"
              >
                Country Overview
              </Link>
            </li>
            <li>
              <Link
                href={`/country/${params.id}/instances/${params.instance_id}`}
                className="block px-4 py-2 text-gray-700 hover:bg-gray-100"
              >
                Instance Overview
              </Link>
            </li>
            <li>
              <Link
                href={`/country/${params.id}/instances/${params.instance_id}/dashboard`}
                className="block px-4 py-2 bg-[color:var(--gsc-green)] text-white"
              >
                Dashboard
              </Link>
            </li>
          </ul>
        </nav>
      </aside>

      {/* === Main content === */}
      <main className="flex-1 flex flex-col">
        {/* Header + breadcrumbs */}
        <header className="border-b bg-white px-5 py-3 flex flex-col gap-1 print:hidden">
          <nav className="text-xs text-gray-500 flex items-center gap-1">
            <Link href={`/country/${params.id}`} className="hover:underline">
              Country
            </Link>
            <ChevronRight className="w-3 h-3 text-gray-400" />
            <Link
              href={`/country/${params.id}/instances/${params.instance_id}`}
              className="hover:underline"
            >
              Instance
            </Link>
            <ChevronRight className="w-3 h-3 text-gray-400" />
            <span className="text-gray-700 font-medium">Dashboard</span>
          </nav>
          <h1 className="text-lg font-semibold text-gray-800">SSC Dashboard</h1>
          <p className="text-xs text-gray-500">
            Visualize SSC datasets and derived indicators across administrative levels.
          </p>
        </header>

        {/* Dataset selector */}
        <div className="p-3 bg-white border-b flex items-center justify-between print:hidden">
          <div>
            <label className="block text-xs text-gray-500">Select dataset</label>
            <select
              className="border rounded px-2 py-1 text-sm"
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
            >
              <option value="">— Select —</option>
              {datasets.map((d) => (
                <option key={d.id} value={d.result_table}>
                  {d.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* === Map and legend === */}
        <div className="flex-1 relative bg-white">
          {loading ? (
            <div className="p-10 text-center text-gray-500">Loading map data…</div>
          ) : geoData ? (
            <MapContainer
              center={[12.8797, 121.774]} // Default center (Philippines)
              zoom={6}
              className="w-full h-full"
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution="© OpenStreetMap contributors"
              />
              {baseGeoData && (
                <GeoJSON
                  data={baseGeoData}
                  style={{
                    color: "#aaa",
                    weight: 0.4,
                    fillOpacity: 0,
                  }}
                />
              )}
              <GeoJSON
                data={geoData}
                style={(feature: any) => ({
                  fillColor: getColor(feature.properties.score),
                  color: "#555",
                  weight: 0.8,
                  fillOpacity: 0.75,
                })}
              />
            </MapContainer>
          ) : (
            <div className="p-10 text-gray-500 text-center">
              Select a dataset to view the map.
            </div>
          )}

          {geoData && (
            <div className="absolute bottom-5 right-5 bg-white/90 backdrop-blur p-3 rounded shadow text-xs print:border">
              <h3 className="font-semibold mb-1 text-gray-700">Legend (Score)</h3>
              {[1, 2, 3, 4, 5].map((s) => (
                <div key={s} className="flex items-center gap-2">
                  <span
                    className="inline-block w-4 h-4 rounded-sm"
                    style={{ backgroundColor: getColor(s) }}
                  />
                  <span>{s}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <footer className="p-2 border-t text-[10px] text-gray-500 text-center print:hidden">
          Generated by SSC Toolset — {new Date().toLocaleDateString()}
        </footer>
      </main>
    </div>
  );
}

// Color scale (SSC 1–5)
function getColor(v: number) {
  if (v === 1) return "#006837";
  if (v === 2) return "#31a354";
  if (v === 3) return "#78c679";
  if (v === 4) return "#c2e699";
  return "#ffffcc";
}

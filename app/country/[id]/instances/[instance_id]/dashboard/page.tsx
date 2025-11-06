"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import type { Map as LeafletMap } from "leaflet";
import type { FeatureCollection } from "geojson";
import L from "leaflet";

const MapContainer = dynamic(() => import("react-leaflet").then(m => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import("react-leaflet").then(m => m.TileLayer), { ssr: false });
const GeoJSON = dynamic(() => import("react-leaflet").then(m => m.GeoJSON), { ssr: false });

type InstanceLayer = {
  id: string;
  result_table: string;
  category: string | null;
  subcategory: string | null;
};

type AdminLevel = "AUTO" | "ADM0" | "ADM1" | "ADM2" | "ADM3" | "ADM4";

export default function DashboardPage({ params }: { params: { id: string; instance_id: string } }) {
  const countryIso = params.id;
  const instanceId = params.instance_id;
  const mapRef = useRef<LeafletMap | null>(null);

  const [datasets, setDatasets] = useState<InstanceLayer[]>([]);
  const [selectedDataset, setSelectedDataset] = useState<string>("");
  const [adminLevel, setAdminLevel] = useState<AdminLevel>("AUTO");
  const [geojson, setGeojson] = useState<FeatureCollection | null>(null);
  const [loading, setLoading] = useState(false);

  // ───────────────────────────────────────────────
  // Load datasets for this SSC instance
  // ───────────────────────────────────────────────
  useEffect(() => {
    const fetchDatasets = async () => {
      const { data, error } = await supabase
        .from("instance_layers")
        .select("id, result_table, category, subcategory")
        .eq("instance_id", instanceId);

      if (error) console.error(error);
      else setDatasets((data || []).filter(d => d.result_table && d.result_table.trim() !== ""));
    };
    fetchDatasets();
  }, [instanceId]);

  // Dataset groups for cleaner labels
  const grouped = {
    "P1 – Shelter": datasets.filter(d => d.category === "ssc_p1"),
    "P2 – Living Conditions": datasets.filter(d => d.category === "ssc_p2"),
    "P3 – Population / Exposure": datasets.filter(d => d.category === "ssc_p3"),
    "Hazard": datasets.filter(d => d.category?.toLowerCase().includes("hazard")),
    "Underlying Vulnerabilities": datasets.filter(d => d.category?.toLowerCase().includes("underlying")),
  };

  // Pretty naming for result tables
  function labelFor(table: string) {
    if (!table) return "Unknown";
    const t = table.toLowerCase();
    if (t.includes("20pct")) return "Building Typologies (20% Rule)";
    if (t.includes("typology_ssc")) return "Weighted Building Typologies";
    if (t.includes("population_density")) return "Population Density";
    if (t.includes("layer_results")) return "Population / Exposure Result";
    if (t.includes("poverty") || t.includes("underlying")) return "Underlying Vulnerability";
    return table;
  }

  // Auto-detect ADM level from result_table name (fallback to ADM3)
  function inferLevel(table: string): Exclude<AdminLevel, "AUTO"> {
    const m = table.toLowerCase().match(/adm([0-4])/);
    if (m) return (`ADM${m[1]}` as AdminLevel) ?? "ADM3";
    // common heuristics: P3 → ADM4, typology → ADM3
    if (table.toLowerCase().includes("population") || table.toLowerCase().includes("layer_results")) return "ADM4";
    return "ADM3";
  }

  // When dataset changes and adminLevel is AUTO, update inferred level
  useEffect(() => {
    if (selectedDataset && adminLevel === "AUTO") {
      setAdminLevel(inferLevel(selectedDataset));
    }
  }, [selectedDataset, adminLevel]);

  // ───────────────────────────────────────────────
  // Fetch GeoJSON with level-aware RPC
  // ───────────────────────────────────────────────
  const fetchGeoJson = useCallback(async () => {
    if (!selectedDataset) return;

    const levelToUse: Exclude<AdminLevel, "AUTO"> =
      adminLevel === "AUTO" ? inferLevel(selectedDataset) : adminLevel;

    try {
      setLoading(true);

      // Preferred: geometry-aware RPC (we just created)
      let { data, error } = await supabase.rpc("get_geojson_for_result_table_level", {
        p_result_table: selectedDataset,
        p_admin_level: levelToUse,
      });

      // Fallback: old RPC if the new one isn't present
      if (error && /function .* does not exist/i.test(String(error?.message))) {
        const legacy = await supabase.rpc("get_geojson_for_result_table", {
          p_result_table: selectedDataset,
        });
        error = legacy.error;
        data = legacy.data;
      }

      setLoading(false);
      if (error) throw error;
      if (!data) throw new Error("No data returned from RPC");

      const geo = typeof data === "string" ? JSON.parse(data) : data;
      setGeojson(geo);

      if (mapRef.current && geo?.features?.length) {
        const layer = L.geoJSON(geo as any);
        mapRef.current.fitBounds(layer.getBounds(), { padding: [20, 20] });
      }
    } catch (err: any) {
      console.error("⚠️ Failed to load GeoJSON:", err);
      alert("⚠️ Failed to load map data. Please check if the dataset has valid geometry.");
    }
  }, [selectedDataset, adminLevel]);

  useEffect(() => {
    fetchGeoJson();
  }, [fetchGeoJson]);

  // ───────────────────────────────────────────────
  // Render
  // ───────────────────────────────────────────────
  return (
    <SidebarLayout
      headerProps={{
        title: `${countryIso} – SSC Dashboard`,
        group: "country-config",
        breadcrumbs: (
          <Breadcrumbs
            items={[
              { label: "Country", href: `/country/${countryIso}` },
              { label: "Instance", href: `/country/${countryIso}/instances/${instanceId}` },
              { label: "Dashboard", href: "#" },
            ]}
          />
        ),
      }}
    >
      <div className="p-6 space-y-4">
        <h2 className="text-lg font-semibold">SSC Dashboard</h2>
        <p className="text-xs text-gray-500">Visualize SSC datasets by pillar and administrative level.</p>

        {/* Controls */}
        <div className="bg-white border rounded-md p-3 flex flex-wrap gap-6 items-end text-sm shadow-sm">
          <div>
            <label className="block text-xs text-gray-600 mb-1">Dataset</label>
            <select
              className="border rounded px-2 py-1 text-sm min-w-[300px]"
              value={selectedDataset}
              onChange={(e) => setSelectedDataset(e.target.value)}
            >
              <option value="">Select dataset</option>
              {Object.entries(grouped).map(([group, arr]) =>
                arr.length ? (
                  <optgroup key={group} label={group}>
                    {arr.map((d) => (
                      <option key={d.id} value={d.result_table}>
                        {labelFor(d.result_table)} — <span className="text-gray-500">{d.result_table}</span>
                      </option>
                    ))}
                  </optgroup>
                ) : null
              )}
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-600 mb-1">Admin Level</label>
            <select
              className="border rounded px-2 py-1 text-sm"
              value={adminLevel}
              onChange={(e) => setAdminLevel(e.target.value as AdminLevel)}
              title="AUTO chooses level from the dataset name (e.g., *_adm3 / *_adm4)."
            >
              <option value="AUTO">AUTO (infer)</option>
              <option value="ADM0">ADM0</option>
              <option value="ADM1">ADM1</option>
              <option value="ADM2">ADM2</option>
              <option value="ADM3">ADM3</option>
              <option value="ADM4">ADM4</option>
            </select>
          </div>
        </div>

        {/* Map */}
        <div className="h-[600px] w-full rounded-md overflow-hidden border relative">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/70 z-10">
              <span className="text-gray-600 text-sm">Loading map data…</span>
            </div>
          )}
          <MapContainer center={[12.8797, 121.774]} zoom={6} style={{ height: "100%", width: "100%" }} ref={mapRef}>
            <TileLayer
              attribution='&copy; <a href="https://osm.org">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {geojson && (
              <GeoJSON
                data={geojson as any}
                style={(feature: any) => ({
                  fillColor: getColor(feature.properties.score),
                  color: "#555",
                  weight: 0.6,
                  fillOpacity: 0.85,
                })}
                onEachFeature={(feature, layer) => {
                  const p = feature.properties;
                  layer.bindTooltip(
                    `<b>${p.admin_name ?? p.admin_pcode}</b><br/>Score: ${p.score ?? "—"}<br/>Raw: ${p.raw_value ?? "—"}`,
                    { direction: "auto", sticky: true }
                  );
                }}
              />
            )}
          </MapContainer>

          {/* Legend */}
          {geojson && (
            <div className="absolute bottom-4 right-4 bg-white p-3 rounded-md shadow text-xs z-20">
              <h3 className="font-semibold mb-1">Legend (Score)</h3>
              {[1, 2, 3, 4, 5].map((v) => (
                <div key={v} className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-sm" style={{ backgroundColor: getColor(v) }}></span>
                  <span>{v}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </SidebarLayout>
  );
}

// Color ramp (green → yellow → red)
function getColor(v: number) {
  if (v === 1) return "#006837";
  if (v === 2) return "#78c679";
  if (v === 3) return "#ffff99";
  if (v === 4) return "#fdae61";
  if (v === 5) return "#d73027";
  return "#cccccc";
}

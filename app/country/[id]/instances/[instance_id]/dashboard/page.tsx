"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import type { Map as LeafletMap } from "leaflet";
import type { FeatureCollection } from "geojson";
import L from "leaflet";

// Lazy-load Leaflet components (prevents SSR crash)
const MapContainer = dynamic(() => import("react-leaflet").then((m) => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import("react-leaflet").then((m) => m.TileLayer), { ssr: false });
const GeoJSON = dynamic(() => import("react-leaflet").then((m) => m.GeoJSON), { ssr: false });
const Tooltip = dynamic(() => import("react-leaflet").then((m) => m.Tooltip), { ssr: false });

export default function DashboardPage({ params }: { params: { id: string; instance_id: string } }) {
  const countryIso = params.id;
  const instanceId = params.instance_id;
  const mapRef = useRef<LeafletMap | null>(null);

  const [datasets, setDatasets] = useState<any[]>([]);
  const [selectedDataset, setSelectedDataset] = useState<string>("");
  const [geojson, setGeojson] = useState<FeatureCollection | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  // ───────────────────────────────────────────────
  // Load datasets linked to this SSC instance
  // ───────────────────────────────────────────────
  useEffect(() => {
    const fetchDatasets = async () => {
      const { data, error } = await supabase
        .from("instance_layers")
        .select("id, result_table, category, subcategory")
        .eq("instance_id", instanceId);
      if (error) console.error(error);
      else setDatasets(data || []);
    };
    fetchDatasets();
  }, [instanceId]);

  // ───────────────────────────────────────────────
  // Fetch GeoJSON for selected dataset
  // ───────────────────────────────────────────────
  const fetchGeoJson = useCallback(async () => {
    if (!selectedDataset) return;
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc("get_geojson_for_result_table", {
        p_result_table: selectedDataset,
      });
      setLoading(false);

      if (error) throw error;
      if (!data) throw new Error("No data returned from RPC");

      const geo = typeof data === "string" ? JSON.parse(data) : data;
      setGeojson(geo);

      // Auto-zoom to bounds
      if (mapRef.current && geo?.features?.length) {
        const layer = L.geoJSON(geo as any);
        mapRef.current.fitBounds(layer.getBounds(), { padding: [20, 20] });
      }
    } catch (err) {
      console.error("Failed to load GeoJSON:", err);
      alert("⚠️ Failed to load map data. Check console for details.");
    }
  }, [selectedDataset]);

  useEffect(() => {
    fetchGeoJson();
  }, [fetchGeoJson]);

  // ───────────────────────────────────────────────
  // Render Map
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
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">SSC Dashboard</h2>
            <p className="text-xs text-gray-500">
              Visualize derived indicators and categorical vulnerability layers.
            </p>
          </div>
        </div>

        {/* Dataset selector */}
        <div className="bg-white border rounded-md p-3 flex flex-wrap items-center gap-4 text-sm shadow-sm">
          <div>
            <label className="block text-xs text-gray-600 mb-1">Dataset</label>
            <select
              className="border rounded px-2 py-1 text-sm min-w-[240px]"
              value={selectedDataset}
              onChange={(e) => setSelectedDataset(e.target.value)}
            >
              <option value="">Select dataset</option>
              {datasets.map((d) => (
                <option key={d.id} value={d.result_table}>
                  {d.category} — {d.result_table}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Map Display */}
        <div className="h-[600px] w-full rounded-md overflow-hidden border relative">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/70 z-10">
              <span className="text-gray-600 text-sm">Loading map data…</span>
            </div>
          )}

          <MapContainer
            center={[12.8797, 121.774]}
            zoom={6}
            style={{ height: "100%", width: "100%" }}
            ref={mapRef}
          >
            <TileLayer
              attribution='&copy; <a href="https://osm.org">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {geojson && (
              <GeoJSON
                data={geojson as any}
                style={(feature: any) => {
                  const p = feature.properties;
                  if (p.is_unmatched) {
                    return { color: "#ccc", weight: 0.5, fillOpacity: 0.2 };
                  }
                  return {
                    fillColor: getColor(p.score),
                    color: "#555",
                    weight: 0.6,
                    fillOpacity: 0.8,
                  };
                }}
                onEachFeature={(feature, layer) => {
                  const p = feature.properties;
                  if (p.admin_name) {
                    layer.bindTooltip(
                      `<b>${p.admin_name}</b><br/>Score: ${p.score ?? "N/A"}<br/>Raw: ${p.raw_value ?? "—"}`,
                      { direction: "auto", sticky: true }
                    );
                  }
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
                  <span
                    className="w-4 h-4 rounded-sm"
                    style={{ backgroundColor: getColor(v) }}
                  ></span>
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

// ───────────────────────────────────────────────
// SSC color ramp
// ───────────────────────────────────────────────
function getColor(v: number) {
  if (v === 1) return "#006837"; // dark green
  if (v === 2) return "#31a354"; // medium green
  if (v === 3) return "#78c679"; // light green
  if (v === 4) return "#c2e699"; // yellowish
  if (v === 5) return "#ffffcc"; // pale yellow
  return "#f0f0f0";
}

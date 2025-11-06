"use client";

import { useEffect, useState, useRef } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { ChevronRight } from "lucide-react";
import type { Map as LeafletMap } from "leaflet";
import type { FeatureCollection } from "geojson";

// Lazy-load Leaflet to prevent SSR issues
const MapContainer = dynamic(() => import("react-leaflet").then(m => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import("react-leaflet").then(m => m.TileLayer), { ssr: false });
const GeoJSON = dynamic(() => import("react-leaflet").then(m => m.GeoJSON), { ssr: false });

export default function SSCDashboard({ params }: { params: { id: string; instance_id: string } }) {
  const countryIso = params.id;
  const instanceId = params.instance_id;

  const [datasets, setDatasets] = useState<any[]>([]);
  const [selectedDataset, setSelectedDataset] = useState<string>("");
  const [adminLevel, setAdminLevel] = useState<string>("ADM3");
  const [geojsonUnderlay, setGeojsonUnderlay] = useState<FeatureCollection | null>(null);
  const [geojsonOverlay, setGeojsonOverlay] = useState<FeatureCollection | null>(null);
  const [loading, setLoading] = useState(false);
  const mapRef = useRef<LeafletMap | null>(null);

  // ────────────────────────────────
  // Load available datasets linked to this instance
  // ────────────────────────────────
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

  // ────────────────────────────────
  // Load GIS underlay for selected admin level
  // ────────────────────────────────
  useEffect(() => {
    const fetchUnderlay = async () => {
      const { data, error } = await supabase
        .from("gis_features")
        .select("geom, pcode, name, admin_level")
        .eq("admin_level", adminLevel)
        .limit(10000);

      if (error) console.error(error);
      else {
        const fc: FeatureCollection = {
          type: "FeatureCollection",
          features: (data || []).map((f: any) => ({
            type: "Feature",
            geometry: f.geom,
            properties: { pcode: f.pcode, name: f.name },
          })),
        };
        setGeojsonUnderlay(fc);
      }
    };
    fetchUnderlay();
  }, [adminLevel]);

  // ────────────────────────────────
  // Load overlay data for selected dataset
  // ────────────────────────────────
  useEffect(() => {
    const fetchOverlay = async () => {
      if (!selectedDataset) return;
      setLoading(true);
      const { data, error } = await supabase.rpc("get_geojson_for_result_table", {
        p_result_table: selectedDataset,
      });
      setLoading(false);
      if (error) console.error(error);
      else setGeojsonOverlay(data);
    };
    fetchOverlay();
  }, [selectedDataset]);

  // ────────────────────────────────
  // Render map
  // ────────────────────────────────
  return (
    <SidebarLayout
      headerProps={{
        title: `${countryIso} – SSC Dashboard`,
        group: "country",
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
              View datasets and vulnerability layers across administrative boundaries.
            </p>
          </div>
        </div>

        {/* Dataset and Admin selector */}
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

          <div>
            <label className="block text-xs text-gray-600 mb-1">Admin Level</label>
            <select
              className="border rounded px-2 py-1 text-sm"
              value={adminLevel}
              onChange={(e) => setAdminLevel(e.target.value)}
            >
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
            {geojsonUnderlay && (
              <GeoJSON
                data={geojsonUnderlay as any}
                style={{
                  color: "#999",
                  weight: 0.4,
                  fillOpacity: 0,
                }}
              />
            )}
            {geojsonOverlay && (
              <GeoJSON
                data={geojsonOverlay as any}
                style={(feature: any) => ({
                  fillColor: getColor(feature.properties.score),
                  color: "#444",
                  weight: 0.6,
                  fillOpacity: 0.75,
                })}
              />
            )}
          </MapContainer>

          {/* Legend */}
          {geojsonOverlay && (
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

// Simple SSC 1–5 ramp
function getColor(v: number) {
  return v === 1
    ? "#006837"
    : v === 2
    ? "#31a354"
    : v === 3
    ? "#78c679"
    : v === 4
    ? "#c2e699"
    : "#ffffcc";
}

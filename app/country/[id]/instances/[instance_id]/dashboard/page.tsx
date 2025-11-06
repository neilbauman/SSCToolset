"use client";

import { useEffect, useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import type { FeatureCollection, Geometry } from "geojson";

// Dynamic import for Leaflet components (client-only)
const MapContainer = dynamic(() => import("react-leaflet").then(m => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import("react-leaflet").then(m => m.TileLayer), { ssr: false });
const GeoJSON = dynamic(() => import("react-leaflet").then(m => m.GeoJSON), { ssr: false });

type CountryInstanceParams = { id: string; instance_id: string };

type InstanceLayer = {
  id: string;
  instance_id: string;
  category: string | null;
  subcategory: string | null;
  result_table: string | null;
  dataset_id: string | null;
};

type DatasetOption = {
  id: string;
  label: string;
  result_table: string;
  category: string;
  subcategory: string;
  admin_level: string | null;
};

export default function SSCDashboardPage({ params }: { params: CountryInstanceParams }) {
  const countryIso = params.id;
  const instanceId = params.instance_id;

  const [datasets, setDatasets] = useState<DatasetOption[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [geojson, setGeojson] = useState<FeatureCollection<Geometry> | null>(null);
  const [loading, setLoading] = useState(false);

  // ────────────────────────────────
  // Fetch available datasets for this instance
  // ────────────────────────────────
  const loadDatasets = async () => {
    const { data, error } = await supabase
      .from("instance_layers")
      .select("id,instance_id,category,subcategory,result_table,dataset_id")
      .eq("instance_id", instanceId);

    if (error) {
      console.error("⚠️ Failed to load instance_layers:", error);
      return;
    }

    if (!data?.length) {
      console.warn("⚠️ No datasets found for instance", instanceId);
      setDatasets([]);
      return;
    }

    const options = data
      .filter(d => d.result_table)
      .map(d => {
        const level =
          d.result_table?.toLowerCase().includes("adm4")
            ? "ADM4"
            : d.result_table?.toLowerCase().includes("adm3")
            ? "ADM3"
            : d.result_table?.toLowerCase().includes("adm2")
            ? "ADM2"
            : d.result_table?.toLowerCase().includes("adm1")
            ? "ADM1"
            : null;

        const label = `${(d.category || "").toUpperCase()} — ${d.subcategory || ""}`.trim();
        return {
          id: d.id,
          label: label || d.result_table!,
          result_table: d.result_table!,
          category: d.category || "OTHER",
          subcategory: d.subcategory || "",
          admin_level: level,
        };
      });

    console.log("✅ Loaded datasets:", options);
    setDatasets(options);
  };

  // ────────────────────────────────
  // Fetch GeoJSON for selected dataset
  // ────────────────────────────────
  const loadGeoJSON = async (result_table: string, admin_level: string | null) => {
    if (!result_table) return;
    setLoading(true);
    setGeojson(null);

    try {
      const { data, error } = await supabase.rpc("get_geojson_for_result_table", {
        p_iso: countryIso,
        p_result_table: result_table,
        p_admin_level: admin_level,
        p_limit: 100000,
      });

      if (error) throw error;
      if (data && data.type === "FeatureCollection") {
        setGeojson(data);
        console.log("✅ Loaded GeoJSON:", data.features?.length || 0, "features");
      } else {
        alert("⚠️ No valid GeoJSON returned — check dataset geometry linkage.");
      }
    } catch (e: any) {
      console.error("❌ GeoJSON load failed:", e.message);
      alert("Failed to load map data.");
    } finally {
      setLoading(false);
    }
  };

  // ────────────────────────────────
  // Derive grouped options (P1/P3/etc.)
  // ────────────────────────────────
  const grouped = useMemo(() => {
    const groups: Record<string, DatasetOption[]> = {};
    for (const d of datasets) {
      const g = d.category || "OTHER";
      if (!groups[g]) groups[g] = [];
      groups[g].push(d);
    }
    return groups;
  }, [datasets]);

  useEffect(() => {
    loadDatasets();
  }, []);

  return (
    <SidebarLayout
      headerProps={{
        title: `${countryIso} — SSC Map Dashboard`,
        group: "country-config",
        breadcrumbs: (
          <Breadcrumbs
            items={[
              { label: "Dashboard", href: "/" },
              { label: "Country", href: `/country/${countryIso}` },
              { label: "Instance", href: `/country/${countryIso}/instances/${instanceId}` },
              { label: "Map Dashboard", href: "#" },
            ]}
          />
        ),
      }}
    >
      <div className="p-6 space-y-4">
        {/* Dataset selector */}
        <div>
          <label className="text-sm font-semibold text-gray-700">Select Dataset</label>
          <select
            value={selected}
            onChange={(e) => {
              const val = e.target.value;
              setSelected(val);
              const layer = datasets.find(d => d.result_table === val);
              if (layer) loadGeoJSON(layer.result_table, layer.admin_level);
            }}
            className="block w-full border rounded px-3 py-2 mt-1"
          >
            <option value="">Select dataset...</option>
            {Object.entries(grouped).map(([cat, arr]) => (
              <optgroup key={cat} label={cat.toUpperCase()}>
                {arr.map(d => (
                  <option key={d.result_table} value={d.result_table}>
                    {d.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        {/* Map display */}
        <div className="h-[600px] w-full border rounded overflow-hidden relative">
          <MapContainer
            center={[12.8797, 121.774]}
            zoom={5}
            style={{ height: "100%", width: "100%" }}
          >
            <TileLayer
              attribution='&copy; <a href="https://osm.org">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {geojson && (
              <GeoJSON
                key={selected}
                data={geojson as any}
                style={(feature: any) => {
                  const s = Number(feature?.properties?.score ?? 0);
                  const colors = ["#00A000", "#8DC63F", "#FFD700", "#FF8C00", "#CC0000"];
                  const color = s >= 1 && s <= 5 ? colors[s - 1] : "#AAAAAA";
                  return { color: "#000", weight: 0.5, fillColor: color, fillOpacity: 0.7 };
                }}
                onEachFeature={(feature, layer) => {
                  const p = feature.properties;
                  layer.bindTooltip(
                    `${p.admin_name || p.admin_pcode}<br/>Score: ${p.score ?? "—"}<br/>Raw: ${p.raw_value ?? "—"}`,
                    { sticky: true }
                  );
                }}
              />
            )}
          </MapContainer>
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/70 text-gray-600 text-sm">
              Loading map…
            </div>
          )}
        </div>
      </div>
    </SidebarLayout>
  );
}

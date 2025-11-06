"use client";

import { useEffect, useState, useRef } from "react";
import dynamic from "next/dynamic";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { RefreshCw } from "lucide-react";

const MapContainer = dynamic(() => import("react-leaflet").then(m => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import("react-leaflet").then(m => m.TileLayer), { ssr: false });
const GeoJSON = dynamic(() => import("react-leaflet").then(m => m.GeoJSON), { ssr: false });

type CountryInstanceParams = { id: string; instance_id: string };
type LayerOption = {
  id: string;
  label: string;
  result_table: string;
  category: string;
  subcategory?: string | null;
  admin_level?: string | null;
};

export default function SSCDashboardPage({ params }: { params: CountryInstanceParams }) {
  const countryIso = params.id;
  const instanceId = params.instance_id;

  const [layers, setLayers] = useState<LayerOption[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [geojson, setGeojson] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const mapRef = useRef<any>(null);

  // Load datasets linked to this instance
  const fetchLayerCatalogue = async () => {
    const { data, error } = await supabase
      .from("instance_layers")
      .select(`
        id,
        category,
        subcategory,
        result_table,
        dataset_id,
        ssc_dataset_catalog(title, source_note)
      `)
      .eq("instance_id", instanceId);

    if (error) {
      console.error("⚠️ Could not load layers", error);
      return;
    }

    const opts = (data || []).map((r: any) => ({
      id: r.id,
      category: r.category?.toUpperCase() || "OTHER",
      subcategory: r.subcategory || "",
      result_table: r.result_table,
      label:
        r.ssc_dataset_catalog?.title
          ? `${r.ssc_dataset_catalog.title} — ${r.subcategory || r.category}`
          : `${r.category} — ${r.subcategory || ""}`,
      admin_level:
        r.result_table?.toLowerCase().includes("adm4")
          ? "ADM4"
          : r.result_table?.toLowerCase().includes("adm3")
          ? "ADM3"
          : null,
    }));

    setLayers(opts);
  };

  // Fetch GeoJSON via Supabase RPC
  const fetchGeoJSON = async (table: string, level?: string) => {
    setLoading(true);
    console.log("🛰️ Fetching GeoJSON:", { countryIso, table, level });
    try {
      const { data, error } = await supabase.rpc("get_geojson_for_result_table", {
        p_country_iso: countryIso,
        p_result_table: table,
        p_admin_level: level ?? undefined,
      });
      if (error) throw error;
      if (!data || !data.features || data.features.length === 0) {
        console.warn("⚠️ No matching geometries returned for:", table);
      }
      setGeojson(data);
    } catch (err) {
      console.error("❌ GeoJSON load failed:", err);
      setGeojson(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLayerCatalogue();
  }, []);

  const handleSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const table = e.target.value;
    setSelected(table);
    const sel = layers.find(l => l.result_table === table);
    if (sel) fetchGeoJSON(sel.result_table, sel.admin_level ?? undefined);
  };

  const colorForScore = (score: number | null | undefined) => {
    if (score == null) return "#cccccc";
    const c = ["#00aa00", "#88cc00", "#ffee00", "#ff8800", "#cc0000"];
    const idx = Math.max(1, Math.min(5, Math.round(score))) - 1;
    return c[idx];
  };

  return (
    <SidebarLayout
      headerProps={{
        title: `${countryIso} – SSC Dashboard`,
        group: "country-config",
        breadcrumbs: (
          <Breadcrumbs
            items={[
              { label: "Dashboard", href: "/" },
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
          <h2 className="text-lg font-semibold">SSC Map Visualization</h2>
          <button
            onClick={() => selected && fetchGeoJSON(selected)}
            disabled={!selected || loading}
            className="flex items-center gap-1 px-3 py-1.5 rounded bg-[#640811] text-white hover:opacity-90 text-sm"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </button>
        </div>

        {/* Dataset selector */}
        <div className="flex flex-wrap gap-2">
          <select
            className="border rounded px-3 py-2 text-sm w-full sm:w-1/2"
            onChange={handleSelect}
            value={selected || ""}
          >
            <option value="">Select Dataset…</option>
            {layers
              .filter(l => !!l.result_table)
              .sort((a, b) => a.category.localeCompare(b.category))
              .map(l => (
                <option key={l.id} value={l.result_table}>
                  {l.label}
                </option>
              ))}
          </select>
        </div>

        {/* Map */}
        <div className="h-[600px] w-full border rounded overflow-hidden">
          <MapContainer
            center={[12.8797, 121.774]}
            zoom={5}
            style={{ height: "100%", width: "100%" }}
            ref={mapRef}
          >
            <TileLayer
              attribution='&copy; <a href="https://osm.org">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {geojson && (
              <GeoJSON
                key={selected}
                data={geojson}
                style={(feature: any) => ({
                  color: "#000",
                  weight: 0.5,
                  fillColor: colorForScore(feature?.properties?.score),
                  fillOpacity: 0.75,
                })}
                onEachFeature={(feature, layer) => {
                  const p = feature.properties;
                  const label = `${p.admin_name || p.admin_pcode}<br/>Score: ${p.score ?? "—"}<br/>Raw: ${
                    p.raw_value ?? "—"
                  }`;
                  layer.bindTooltip(label, { sticky: true });
                }}
              />
            )}
          </MapContainer>
        </div>

        {/* Legend */}
        <div className="bg-white border rounded p-3 shadow w-fit text-sm">
          <div className="font-semibold mb-1">Legend (score → color)</div>
          <div className="flex gap-3">
            <span className="flex items-center gap-1"><span className="w-4 h-4 bg-[#00aa00] inline-block rounded-sm"></span>1 (Low)</span>
            <span className="flex items-center gap-1"><span className="w-4 h-4 bg-[#88cc00] inline-block rounded-sm"></span>2</span>
            <span className="flex items-center gap-1"><span className="w-4 h-4 bg-[#ffee00] inline-block rounded-sm"></span>3</span>
            <span className="flex items-center gap-1"><span className="w-4 h-4 bg-[#ff8800] inline-block rounded-sm"></span>4</span>
            <span className="flex items-center gap-1"><span className="w-4 h-4 bg-[#cc0000] inline-block rounded-sm"></span>5 (High)</span>
          </div>
        </div>
      </div>
    </SidebarLayout>
  );
}

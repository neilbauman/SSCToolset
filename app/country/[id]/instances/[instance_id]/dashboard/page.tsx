"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { RefreshCw } from "lucide-react";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";

// Leaflet (client-only)
const MapContainer = dynamic(() => import("react-leaflet").then(m => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import("react-leaflet").then(m => m.TileLayer), { ssr: false });
const GeoJSON = dynamic(() => import("react-leaflet").then(m => m.GeoJSON), { ssr: false });

// GREEN -> RED (1..5)
const SCORE_COLORS = {
  0: "#ffffff",
  1: "#1a9850",
  2: "#a6d96a",
  3: "#ffffbf",
  4: "#fdae61",
  5: "#d73027",
};

type LayerRow = {
  id: string;
  title: string | null;
  result_table: string | null;
  category: string | null;
  subcategory: string | null;
};

type GeoFeature = {
  type: "Feature";
  geometry: any;
  properties: Record<string, any>;
};
type GeoJSONType = { type: "FeatureCollection"; features: GeoFeature[] };

export default function Page({
  params,
}: {
  params: { id: string; instance_id: string };
}) {
  const { id: countryId, instance_id } = params;

  const headerProps = useMemo(
    () => ({
      title: "SSC Consolidated Dashboard",
      group: "country-config" as const,
      description:
        "Filter affected ADM2 regions, switch map layers, and see summary totals.",
      breadcrumbs: (
        <Breadcrumbs
          items={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Country", href: `/country/${countryId}` },
            { label: "Instances", href: `/country/${countryId}/instances` },
            { label: "Dashboard" },
          ]}
        />
      ),
    }),
    [countryId]
  );

  // UI state
  const [layers, setLayers] = useState<LayerRow[]>([]);
  const [selectedLayer, setSelectedLayer] = useState<LayerRow | null>(null);

  const [geojson, setGeojson] = useState<GeoJSONType | null>(null);
  const [adm2Options, setAdm2Options] = useState<{ code: string; name: string }[]>([]);
  const [selectedAdm2, setSelectedAdm2] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // Load available layers for this instance
  const loadLayers = async () => {
    const { data, error } = await supabase
      .from("instance_layers")
      .select("id, title, result_table, category, subcategory")
      .eq("instance_id", instance_id)
      .order("title", { ascending: true });

    if (error) {
      console.error(error);
      setLayers([]);
      setSelectedLayer(null);
      return;
    }

    const usable = (data || []).filter(d => d.result_table);
    setLayers(usable as LayerRow[]);
    setSelectedLayer(usable[0] || null);
  };

  // Load GeoJSON for a selected layer
  const loadGeoJSON = async (layer: LayerRow | null) => {
    setGeojson(null);
    if (!layer?.result_table) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("get_geojson_for_result_table", {
        p_iso: null, // set "PHL" here if your RPC requires it
        p_result_table: layer.result_table!,
        p_admin_level: "ADM3",
        p_limit: 200000,
      });
      if (error) throw error;

      const gj: GeoJSONType = (data as any) ?? { type: "FeatureCollection", features: [] };
      setGeojson(gj);

      // Build ADM2 list from properties
      const map = new Map<string, string>();
      for (const f of gj.features || []) {
        const p = f.properties || {};
        const code =
          p.admin_pcode_adm2 || p.adm2_pcode || p.adm2_code || p.admin2Pcode || p.ADM2_PCODE;
        const name =
          p.admin_name_adm2 || p.adm2_name || p.admin2Name || p.ADM2_EN || code;
        if (code) map.set(String(code), String(name ?? code));
      }
      const opts = Array.from(map.entries())
        .map(([code, name]) => ({ code, name }))
        .sort((a, b) => a.name.localeCompare(b.name));
      setAdm2Options(opts);
      setSelectedAdm2(prev => prev.filter(c => map.has(c)));
    } catch (e) {
      console.error(e);
      setGeojson({ type: "FeatureCollection", features: [] });
      setAdm2Options([]);
      setSelectedAdm2([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLayers();
  }, []);

  useEffect(() => {
    loadGeoJSON(selectedLayer);
  }, [selectedLayer?.id, selectedLayer?.result_table]);

  const toggleAdm2 = (code: string) => {
    setSelectedAdm2(prev =>
      prev.includes(code) ? prev.filter(v => v !== code) : [...prev, code]
    );
  };

  const filteredFeatures = useMemo(() => {
    if (!geojson?.features?.length) return [];
    if (!selectedAdm2.length) return geojson.features;
    return geojson.features.filter(f => {
      const p = f.properties || {};
      const code =
        p.admin_pcode_adm2 || p.adm2_pcode || p.adm2_code || p.admin2Pcode || p.ADM2_PCODE;
      return code ? selectedAdm2.includes(String(code)) : false;
    });
  }, [geojson, selectedAdm2]);

  const summary = useMemo(() => {
    if (!filteredFeatures.length) {
      return {
        totalPop: null as number | null,
        popGte3: null as number | null,
        poorGte3: null as number | null,
      };
    }

    const getPop = (p: any) =>
      p.population ?? p.pop ?? p.pop_total ?? p.tot_pop ?? null;
    const getPovRate = (p: any) =>
      p.poverty_rate ?? p.pov_rate ?? p.poverty ?? null;
    const getScore = (p: any) =>
      p.score ?? p.SCORE ?? p.index ?? p.value ?? 0;

    let totalPop = 0;
    let popG3 = 0;
    let poorG3 = 0;
    let hasPop = false;
    let hasPov = false;

    for (const f of filteredFeatures) {
      const p = f.properties || {};
      const pop = Number(getPop(p));
      const rate = Number(getPovRate(p));
      const score = Number(getScore(p));

      if (!Number.isNaN(pop)) {
        hasPop = true;
        totalPop += pop;
        if (score >= 3) {
          popG3 += pop;
          if (!Number.isNaN(rate)) {
            hasPov = true;
            poorG3 += pop * rate;
          }
        }
      }
    }

    return {
      totalPop: hasPop ? Math.round(totalPop) : null,
      popGte3: hasPop ? Math.round(popG3) : null,
      poorGte3: hasPov ? Math.round(poorG3) : null,
    };
  }, [filteredFeatures]);

  return (
    <SidebarLayout headerProps={headerProps}>
      <div className="max-w-7xl mx-auto p-4 space-y-4">

        <div className="flex items-center justify-between">
          <div className="flex gap-3 items-center">
            <select
              className="border rounded-md px-3 py-2 text-sm"
              value={selectedLayer?.id ?? ""}
              onChange={(e) => {
                const next = layers.find(l => l.id === e.target.value) || null;
                setSelectedLayer(next);
              }}
            >
              {layers.length === 0 && <option value="">Consolidated (ADM3)</option>}
              {layers.map(l => (
                <option key={l.id} value={l.id}>
                  {l.title || `${l.category} — ${l.subcategory}`}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => {
              loadLayers().then(() => loadGeoJSON(selectedLayer));
            }}
            className="flex items-center gap-2 text-sm text-gray-700 hover:text-gray-900"
            title="Reload lists and map"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>

        <div className="border rounded-md p-3">
          <div className="font-semibold mb-2">Affected Area (ADM2)</div>
          {adm2Options.length === 0 ? (
            <div className="text-sm text-gray-500">No ADM2 list found in this layer.</div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 max-h-56 overflow-y-auto">
              {adm2Options.map(opt => (
                <label key={opt.code} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="rounded border-gray-400"
                    checked={selectedAdm2.includes(opt.code)}
                    onChange={() => toggleAdm2(opt.code)}
                  />
                  {opt.name}
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="border rounded-md overflow-hidden" style={{ height: 600 }}>
          <MapContainer
            style={{ height: "100%", width: "100%" }}
            center={[12.8797, 121.774]}
            zoom={6}
            scrollWheelZoom
          >
            <TileLayer
              attribution='&copy; OpenStreetMap'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {geojson && (
              <GeoJSON
                key={selectedLayer?.id || "layer"}
                data={filteredFeatures.length ? { type: "FeatureCollection", features: filteredFeatures } : geojson}
                style={(feat: any) => {
                  const s = Number(
                    feat?.properties?.score ??
                      feat?.properties?.SCORE ??
                      feat?.properties?.index ??
                      0
                  );
                  const clamped = Math.max(0, Math.min(5, s)) as 0|1|2|3|4|5;
                  return {
                    color: "#555",
                    weight: 0.6,
                    fillColor: SCORE_COLORS[clamped],
                    fillOpacity: 0.7,
                  };
                }}
              />
            )}
          </MapContainer>
        </div>

        <div className="border rounded-md">
          <div className="px-4 py-3 border-b font-semibold">
            Summary — {selectedAdm2.length ? "Selected ADM2" : "All ADM3"}
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-2">Metric</th>
                <th className="text-right px-4 py-2">Value</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t">
                <td className="px-4 py-2">Total population in affected area</td>
                <td className="px-4 py-2 text-right">
                  {summary.totalPop !== null ? summary.totalPop.toLocaleString() : "—"}
                </td>
              </tr>
              <tr className="border-t">
                <td className="px-4 py-2">Population in ADM3 areas with score ≥ 3</td>
                <td className="px-4 py-2 text-right">
                  {summary.popGte3 !== null ? summary.popGte3.toLocaleString() : "—"}
                </td>
              </tr>
              <tr className="border-t">
                <td className="px-4 py-2">Poor people (poverty rate × population) with score ≥ 3</td>
                <td className="px-4 py-2 text-right">
                  {summary.poorGte3 !== null ? summary.poorGte3.toLocaleString() : "—"}
                </td>
              </tr>
            </tbody>
          </table>
          <div className="px-4 py-2 text-xs text-gray-500 border-t">
            Notes: Calculated client-side from feature properties. Expected fields include
            <code className="mx-1">population</code>/<code>pop</code>,
            <code className="mx-1">poverty_rate</code>, and <code className="mx-1">score</code>.
          </div>
        </div>
      </div>
    </SidebarLayout>
  );
}

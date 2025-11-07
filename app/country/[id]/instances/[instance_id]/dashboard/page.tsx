"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import type { FeatureCollection, Geometry } from "geojson";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";

// Dynamic import for Leaflet (client-only)
const MapContainer = dynamic(() => import("react-leaflet").then(m => m.MapContainer), { ssr: false });
const TileLayer     = dynamic(() => import("react-leaflet").then(m => m.TileLayer),     { ssr: false });
const GeoJSON       = dynamic(() => import("react-leaflet").then(m => m.GeoJSON),       { ssr: false });

type CountryInstanceParams = { id: string; instance_id: string };

type DatasetOption = {
  id: string;                // instance_layers.id or synthetic id
  label: string;             // UI label
  result_table: string;      // e.g. "derived.derived_overall_adm3"
  category: string;          // grouping key in UI
  subcategory: string;       // optional
  admin_level: "ADM1" | "ADM2" | "ADM3" | "ADM4" | null;
};

export default function SSCDashboardPage({ params }: { params: CountryInstanceParams }) {
  const countryIso = params.id;
  const instanceId = params.instance_id;

  const [datasets, setDatasets] = useState<DatasetOption[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [geojson, setGeojson] = useState<FeatureCollection<Geometry> | null>(null);
  const [loading, setLoading] = useState(false);

  // ──────────────────────────────────────────────────────────────
  // Helpers
  // ──────────────────────────────────────────────────────────────
  const inferLevel = (table?: string | null): DatasetOption["admin_level"] => {
    const t = (table || "").toLowerCase();
    if (t.includes("adm4")) return "ADM4";
    if (t.includes("adm3")) return "ADM3";
    if (t.includes("adm2")) return "ADM2";
    if (t.includes("adm1")) return "ADM1";
    return null;
  };

  const loadGeoJSON = async (result_table: string, admin_level: DatasetOption["admin_level"]) => {
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
        setGeojson(data as FeatureCollection<Geometry>);
        // Auto-zoom is optional; keeping a fixed start for now.
      } else {
        alert("⚠️ No valid GeoJSON returned — check dataset geometry linkage.");
      }
    } catch (e: any) {
      console.error("❌ GeoJSON load failed:", e?.message || e);
      alert("Failed to load map data.");
    } finally {
      setLoading(false);
    }
  };

  // Probe for consolidated “overall” tables and add them if present.
  const probeAndAddConsolidated = async (): Promise<DatasetOption[]> => {
    const candidates: Array<{ table: string; level: DatasetOption["admin_level"]; label: string }> = [
      { table: "derived.derived_overall_adm3", level: "ADM3", label: "OVERALL — Consolidated (ADM3)" },
      { table: "derived.derived_overall_adm2", level: "ADM2", label: "OVERALL — Consolidated (ADM2)" },
    ];

    const checks = await Promise.allSettled(
      candidates.map(async c => {
        const { data, error } = await supabase.rpc("get_geojson_for_result_table", {
          p_iso: countryIso,
          p_result_table: c.table,
          p_admin_level: c.level,
          p_limit: 1,
        });
        if (error) return null;
        if (data?.type === "FeatureCollection" && (data.features?.length ?? 0) >= 0) {
          const opt: DatasetOption = {
            id: `overall-${c.level}`,
            label: c.label,
            result_table: c.table,
            category: "OVERALL",
            subcategory: "Consolidated",
            admin_level: c.level,
          };
          return opt;
        }
        return null;
      })
    );

    return checks
      .map(r => (r.status === "fulfilled" ? r.value : null))
      .filter(Boolean) as DatasetOption[];
  };

  // Load all selectable datasets for this instance + consolidated (if available)
  const loadDatasets = async () => {
    const { data, error } = await supabase
      .from("instance_layers")
      .select("id,instance_id,category,subcategory,result_table,dataset_id")
      .eq("instance_id", instanceId);

    if (error) {
      console.error("⚠️ Failed to load instance_layers:", error);
      setDatasets([]);
      return;
    }

    const fromInstance = (data || [])
      .filter(d => d.result_table)
      .map(d => {
        const level = inferLevel(d.result_table);
        const label =
          `${(d.category || "").toUpperCase()} — ${d.subcategory || ""}`.trim() || d.result_table!;
        return {
          id: d.id,
          label,
          result_table: d.result_table!,
          category: d.category || "OTHER",
          subcategory: d.subcategory || "",
          admin_level: level,
        } as DatasetOption;
      });

    const consolidated = await probeAndAddConsolidated();

    // De-dup by result_table then sort by category/label
    const merged = [...consolidated, ...fromInstance].reduce<DatasetOption[]>((acc, cur) => {
      if (!acc.find(a => a.result_table === cur.result_table)) acc.push(cur);
      return acc;
    }, []);

    merged.sort((a, b) =>
      a.category === b.category ? a.label.localeCompare(b.label) : a.category.localeCompare(b.category)
    );

    setDatasets(merged);

    // Default-select overall if present; else first item
    const prefer = merged.find(d => d.category === "OVERALL") || merged[0];
    if (prefer) {
      setSelected(prefer.result_table);
      loadGeoJSON(prefer.result_table, prefer.admin_level);
    }
  };

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
            center={[12.8797, 121.774]} // Philippines
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
                  const p: any = feature.properties || {};
                  const lines = [
                    `<strong>${p.admin_name || p.admin_pcode || "—"}</strong>`,
                    `Score: ${p.score ?? "—"}`,
                    `Raw: ${p.raw_value ?? "—"}`,
                  ];

                  // If consolidated fields exist, show them
                  if (p.p1_score ?? p.p3_score ?? p.hazard_score ?? p.vuln_score) {
                    lines.push(
                      `<hr style="margin:4px 0;"/>`,
                      `<div><em>Components</em></div>`,
                      `P1: ${p.p1_score ?? "—"}`,
                      `P3: ${p.p3_score ?? "—"}`,
                      `Hazard: ${p.hazard_score ?? "—"}`,
                      `Vulnerability: ${p.vuln_score ?? "—"}`
                    );
                  }
                  if (p.population !== undefined) lines.push(`Population: ${p.population}`);
                  if (p.vulnerable_people !== undefined) lines.push(`Vulnerable people: ${p.vulnerable_people}`);

                  layer.bindTooltip(lines.join("<br/>"), { sticky: true });
                }}
              />
            )}
          </MapContainer>

          {/* Simple legend */}
          <div className="absolute bottom-3 left-3 bg-white/90 rounded shadow px-2 py-1 text-xs">
            <div className="font-semibold mb-1">Score (1–5)</div>
            <div className="flex items-center gap-2">
              {[
                { c: "#00A000", t: "1" },
                { c: "#8DC63F", t: "2" },
                { c: "#FFD700", t: "3" },
                { c: "#FF8C00", t: "4" },
                { c: "#CC0000", t: "5" },
              ].map(k => (
                <div key={k.t} className="flex items-center gap-1">
                  <span className="inline-block w-4 h-4 rounded" style={{ background: k.c }} />
                  <span>{k.t}</span>
                </div>
              ))}
            </div>
          </div>

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

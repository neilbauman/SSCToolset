"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import type { FeatureCollection, Geometry } from "geojson";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";

// Leaflet (client-only)
const MapContainer = dynamic(
  () => import("react-leaflet").then((m) => m.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import("react-leaflet").then((m) => m.TileLayer),
  { ssr: false }
);
const GeoJSON = dynamic(
  () => import("react-leaflet").then((m) => m.GeoJSON),
  { ssr: false }
);

type CountryInstanceParams = { id: string; instance_id: string };

type DatasetOption = {
  id: string;
  label: string;
  result_table: string;
  category: string;
  subcategory: string;
  admin_level: string | null;
};

type AdmOption = { pcode: string; name: string };

// --- Utilities
const formatInt = (n: number | null | undefined) =>
  typeof n === "number" && Number.isFinite(n)
    ? n.toLocaleString()
    : "—";

export default function SSCDashboardPage({
  params,
}: {
  params: CountryInstanceParams;
}) {
  const countryIso = params.id;
  const instanceId = params.instance_id;

  // Layers (from instance_layers)
  const [datasets, setDatasets] = useState<DatasetOption[]>([]);
  const grouped = useMemo(() => {
    const g: Record<string, DatasetOption[]> = {};
    for (const d of datasets) {
      const key = (d.category || "OTHER").toUpperCase();
      if (!g[key]) g[key] = [];
      g[key].push(d);
    }
    return g;
  }, [datasets]);

  const [selectedTable, setSelectedTable] = useState<string>("");
  const [selectedAdminLevel, setSelectedAdminLevel] = useState<string | null>(
    null
  );

  // Affected filter (ADM2 multi-select) and derived ADM3 pcodes
  const [adm2Options, setAdm2Options] = useState<AdmOption[]>([]);
  const [selectedAdm2, setSelectedAdm2] = useState<string[]>([]);
  const [affectedAdm3PCodes, setAffectedAdm3PCodes] = useState<string[]>([]);

  // Map data
  const [geojsonFull, setGeojsonFull] =
    useState<FeatureCollection<Geometry> | null>(null);
  const [geojsonFiltered, setGeojsonFiltered] =
    useState<FeatureCollection<Geometry> | null>(null);
  const [loading, setLoading] = useState(false);

  // Summary numbers
  const [totalPop, setTotalPop] = useState<number | null>(null);
  const [popScore3Plus, setPopScore3Plus] = useState<number | null>(null);
  const [totalPoor, setTotalPoor] = useState<number | null>(null);

  // ────────────────────────────────────────────────────────────
  // 1) Load datasets for this instance
  // ────────────────────────────────────────────────────────────
  const loadDatasets = async () => {
    const { data, error } = await supabase
      .from("instance_layers")
      .select(
        "id,instance_id,category,subcategory,result_table,dataset_id"
      )
      .eq("instance_id", instanceId);

    if (error) {
      console.error("Failed to load instance_layers:", error);
      setDatasets([]);
      return;
    }

    const opts: DatasetOption[] =
      (data || [])
        .filter((d) => d.result_table)
        .map((d) => {
          const rt = (d.result_table || "").toLowerCase();
          const level = rt.includes("adm4")
            ? "ADM4"
            : rt.includes("adm3")
            ? "ADM3"
            : rt.includes("adm2")
            ? "ADM2"
            : rt.includes("adm1")
            ? "ADM1"
            : null;

          const label = `${(d.category || "").toUpperCase()} — ${
            d.subcategory || d.result_table || ""
          }`.trim();

          return {
            id: d.id,
            label: label || d.result_table!,
            result_table: d.result_table!,
            category: d.category || "OTHER",
            subcategory: d.subcategory || "",
            admin_level: level,
          };
        }) || [];

    setDatasets(opts);
  };

  // ────────────────────────────────────────────────────────────
  // 2) Load ADM2 options for the affected area filter
  // ────────────────────────────────────────────────────────────
  const loadAdm2Options = async () => {
    const { data, error } = await supabase
      .from("gis_features")
      .select("admin_pcode,name")
      .eq("country_iso", countryIso)
      .eq("admin_level", "ADM2")
      .order("name", { ascending: true });

    if (error) {
      console.error("Failed to load ADM2 options:", error);
      setAdm2Options([]);
      return;
    }

    const options: AdmOption[] = (data || []).map((r) => ({
      pcode: r.admin_pcode,
      name: r.name || r.admin_pcode,
    }));
    setAdm2Options(options);
  };

  // ────────────────────────────────────────────────────────────
  // 3) Given selected ADM2s, derive ADM3 pcodes belonging to them
  // ────────────────────────────────────────────────────────────
  const refreshAffectedAdm3 = async (adm2Pcodes: string[]) => {
    if (!adm2Pcodes?.length) {
      setAffectedAdm3PCodes([]);
      return;
    }

    // If your schema has parent pcodes, prefer that.
    // Here we assume ADM3 admin_pcode starts with ADM2 code (prefix).
    // We fetch all ADM3s and filter by LIKE any-of-selected prefixes.
    // Using OR’d like patterns via PostgREST: we can call multiple .or() groups, but
    // simplest is fetch all ADM3 for the country and filter client-side.
    const { data, error } = await supabase
      .from("gis_features")
      .select("admin_pcode")
      .eq("country_iso", countryIso)
      .eq("admin_level", "ADM3")
      .limit(200000);

    if (error) {
      console.error("Failed to get ADM3 list:", error);
      setAffectedAdm3PCodes([]);
      return;
    }

    const prefixes = new Set(adm2Pcodes);
    const a3 = (data || [])
      .map((r) => r.admin_pcode)
      .filter((pc) => {
        // Treat exact ADM2 pcode as prefix
        for (const pre of prefixes) {
          if (pc?.startsWith(pre)) return true;
        }
        return false;
      });

    setAffectedAdm3PCodes(a3);
  };

  // ────────────────────────────────────────────────────────────
  // 4) Load GeoJSON for selected table (then filter to affected)
  // ────────────────────────────────────────────────────────────
  const loadGeoJSON = async (result_table: string, admin_level: string | null) => {
    if (!result_table) return;
    setLoading(true);
    setGeojsonFull(null);
    setGeojsonFiltered(null);

    try {
      const { data, error } = await supabase.rpc(
        "get_geojson_for_result_table",
        {
          p_iso: countryIso,
          p_result_table: result_table,
          p_admin_level: admin_level,
          p_limit: 100000,
        }
      );

      if (error) throw error;

      // Expecting a FeatureCollection
      if (data && data.type === "FeatureCollection") {
        setGeojsonFull(data as FeatureCollection<Geometry>);
      } else {
        alert("No valid GeoJSON returned — check dataset geometry linkage.");
      }
    } catch (e: any) {
      console.error("GeoJSON load failed:", e?.message || e);
      alert("Failed to load map data.");
    } finally {
      setLoading(false);
    }
  };

  // When underlying full GeoJSON OR affected list changes, produce filtered FeatureCollection
  useEffect(() => {
    if (!geojsonFull) {
      setGeojsonFiltered(null);
      return;
    }
    // If no affected filter, show everything (only for ADM3 layers we filter; other levels pass through)
    const level = selectedAdminLevel || "";
    const needFilter =
      level.toUpperCase() === "ADM3" && affectedAdm3PCodes.length > 0;

    if (!needFilter) {
      setGeojsonFiltered(geojsonFull);
      return;
    }

    const allowed = new Set(affectedAdm3PCodes);
    const feats = (geojsonFull.features || []).filter((f: any) =>
      allowed.has(f?.properties?.admin_pcode)
    );

    setGeojsonFiltered({
      type: "FeatureCollection",
      features: feats,
    } as FeatureCollection<Geometry>);
  }, [geojsonFull, affectedAdm3PCodes, selectedAdminLevel]);

  // ────────────────────────────────────────────────────────────
  // 5) Summary metrics for affected area
  //    Uses population_unified and poverty + (score from selected layer
  //    if it has a numeric "score" column; otherwise consolidated overall)
  // ────────────────────────────────────────────────────────────
  const refreshSummary = async () => {
    // Need ADM3 pcodes for affected area
    if (affectedAdm3PCodes.length === 0) {
      // No filter selected: compute across all ADM3 in the country
      // Get country ADM3 pcodes
      const { data: a3, error: e3 } = await supabase
        .from("gis_features")
        .select("admin_pcode")
        .eq("country_iso", countryIso)
        .eq("admin_level", "ADM3")
        .limit(200000);

      if (e3) {
        console.error("ADM3 list error:", e3);
        setTotalPop(null);
        setPopScore3Plus(null);
        setTotalPoor(null);
        return;
      }
      const allAdm3 = (a3 || []).map((r) => r.admin_pcode);
      await computeSummaryForPCodes(allAdm3);
      return;
    }

    await computeSummaryForPCodes(affectedAdm3PCodes);
  };

  const computeSummaryForPCodes = async (adm3List: string[]) => {
    try {
      // 5.1 Total population in affected area
      const { data: popRows, error: popErr } = await supabase
        .from("population_unified")
        .select("admin_pcode,population")
        .in("admin_pcode", adm3List)
        .limit(200000);

      if (popErr) throw popErr;
      const totalPopulation = (popRows || []).reduce((acc, r: any) => {
        const v = Number(r.population || 0);
        return acc + (Number.isFinite(v) ? v : 0);
      }, 0);

      // 5.2 Population in ADM3 with score >= 3
      // Strategy:
      // - If selected layer is ADM3 and has a numeric "score" column, use it.
      // - Else, fall back to consolidated overall table "derived.derived_overall_adm3".
      let scorePCodes: string[] = [];
      let usedConsolidated = false;

      const useSelectedLayer =
        selectedTable &&
        (selectedAdminLevel || "").toUpperCase() === "ADM3";

      if (useSelectedLayer) {
        // Try to read score>=3 from selected table
        const { data: srows, error: serr } = await supabase
          .from(selectedTable)
          .select("admin_pcode,score")
          .in("admin_pcode", adm3List)
          .gte("score", 3)
          .limit(200000);

        if (!serr && srows) {
          scorePCodes = srows.map((r: any) => r.admin_pcode);
        } else {
          console.warn("Falling back to consolidated overall (score):", serr);
          usedConsolidated = true;
        }
      }

      if (!useSelectedLayer || usedConsolidated) {
        const { data: srows2, error: serr2 } = await supabase
          .from("derived.derived_overall_adm3")
          .select("admin_pcode,score")
          .in("admin_pcode", adm3List)
          .gte("score", 3)
          .limit(200000);
        if (serr2) throw serr2;
        scorePCodes = srows2?.map((r: any) => r.admin_pcode) || [];
      }

      // Now sum populations only for those ADM3s
      const scoreSet = new Set(scorePCodes);
      const popScore3 = (popRows || []).reduce((acc, r: any) => {
        if (scoreSet.has(r.admin_pcode)) {
          const v = Number(r.population || 0);
          return acc + (Number.isFinite(v) ? v : 0);
        }
        return acc;
      }, 0);

      // 5.3 Total poor = sum(population * poverty_rate)
      const { data: povRows, error: povErr } = await supabase
        .from("derived.derived_poverty_vulnerability_adm3")
        .select("admin_pcode,raw_value")
        .in("admin_pcode", adm3List)
        .limit(200000);

      if (povErr) throw povErr;

      // Build pop map
      const popMap = new Map<string, number>();
      (popRows || []).forEach((r: any) => {
        const v = Number(r.population || 0);
        popMap.set(r.admin_pcode, Number.isFinite(v) ? v : 0);
      });

      // raw_value is assumed to be poverty_rate in percent (0–100)
      const totalPoorPeople = (povRows || []).reduce((acc, r: any) => {
        const ratePct = Number(r.raw_value || 0);
        const pop = popMap.get(r.admin_pcode) || 0;
        const poor = pop * (Number.isFinite(ratePct) ? ratePct : 0) / 100;
        return acc + poor;
      }, 0);

      setTotalPop(totalPopulation);
      setPopScore3Plus(popScore3);
      setTotalPoor(totalPoorPeople);
    } catch (err) {
      console.error("Summary computation error:", err);
      setTotalPop(null);
      setPopScore3Plus(null);
      setTotalPoor(null);
    }
  };

  // ────────────────────────────────────────────────────────────
  // Effects
  // ────────────────────────────────────────────────────────────
  useEffect(() => {
    loadDatasets();
    loadAdm2Options();
  }, []);

  useEffect(() => {
    // When dataset selection changes, load map data
    if (!selectedTable) {
      setGeojsonFull(null);
      setGeojsonFiltered(null);
      return;
    }
    loadGeoJSON(selectedTable, selectedAdminLevel);
  }, [selectedTable, selectedAdminLevel]);

  useEffect(() => {
    // Recompute summary whenever affected set changes or dataset changes
    refreshSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [affectedAdm3PCodes, selectedTable]);

  // ────────────────────────────────────────────────────────────
  // Render
  // ────────────────────────────────────────────────────────────
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
              {
                label: "Instance",
                href: `/country/${countryIso}/instances/${instanceId}`,
              },
              { label: "Map Dashboard", href: "#" },
            ]}
          />
        ),
      }}
    >
      <div className="p-6 space-y-6">
        {/* Controls */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Dataset selector */}
          <div>
            <label className="text-sm font-semibold text-gray-700">
              Select dataset
            </label>
            <select
              value={selectedTable}
              onChange={(e) => {
                const rt = e.target.value;
                setSelectedTable(rt);
                // infer admin level from stored options
                const found = datasets.find((d) => d.result_table === rt);
                setSelectedAdminLevel(found?.admin_level ?? null);
              }}
              className="block w-full border rounded px-3 py-2 mt-1"
            >
              <option value="">Select dataset…</option>
              {Object.entries(grouped).map(([cat, arr]) => (
                <optgroup key={cat} label={cat}>
                  {arr.map((d) => (
                    <option key={d.result_table} value={d.result_table}>
                      {d.label} {d.admin_level ? `(${d.admin_level})` : ""}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          {/* Affected area filter (ADM2 multi-select) */}
          <div>
            <label className="text-sm font-semibold text-gray-700">
              Affected area (ADM2)
            </label>
            <div className="mt-1 flex gap-2">
              <button
                type="button"
                className="border rounded px-2 py-1 text-sm"
                onClick={() => {
                  const all = adm2Options.map((o) => o.pcode);
                  setSelectedAdm2(all);
                  refreshAffectedAdm3(all);
                }}
              >
                Select all
              </button>
              <button
                type="button"
                className="border rounded px-2 py-1 text-sm"
                onClick={() => {
                  setSelectedAdm2([]);
                  setAffectedAdm3PCodes([]);
                }}
              >
                Clear
              </button>
            </div>
            <div className="mt-2 max-h-48 overflow-auto border rounded p-2">
              {adm2Options.length === 0 && (
                <div className="text-sm text-gray-500">No ADM2 options.</div>
              )}
              {adm2Options.map((opt) => {
                const checked = selectedAdm2.includes(opt.pcode);
                return (
                  <label
                    key={opt.pcode}
                    className="flex items-center gap-2 text-sm py-0.5"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        const next = e.target.checked
                          ? Array.from(new Set([...selectedAdm2, opt.pcode]))
                          : selectedAdm2.filter((p) => p !== opt.pcode);
                        setSelectedAdm2(next);
                        refreshAffectedAdm3(next);
                      }}
                    />
                    <span className="truncate">
                      {opt.name} <span className="text-gray-400">({opt.pcode})</span>
                    </span>
                  </label>
                );
              })}
            </div>
            <div className="mt-1 text-xs text-gray-500">
              {selectedAdm2.length > 0
                ? `Selected ${selectedAdm2.length} ADM2 → ${
                    affectedAdm3PCodes.length
                  } ADM3`
                : "No filter: includes all ADM3 nationwide"}
            </div>
          </div>
        </div>

        {/* Map */}
        <div className="h-[640px] w-full border rounded overflow-hidden relative">
          <MapContainer
            center={[12.8797, 121.774]}
            zoom={5}
            style={{ height: "100%", width: "100%" }}
          >
            <TileLayer
              attribution='&copy; <a href="https://osm.org">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {geojsonFiltered && (
              <GeoJSON
                key={selectedTable + (affectedAdm3PCodes.length || 0)}
                data={geojsonFiltered as any}
                style={(feature: any) => {
                  const s = Number(feature?.properties?.score ?? 0);
                  const colors = [
                    "#00A000",
                    "#8DC63F",
                    "#FFD700",
                    "#FF8C00",
                    "#CC0000",
                  ];
                  const color = s >= 1 && s <= 5 ? colors[s - 1] : "#AAAAAA";
                  return {
                    color: "#000",
                    weight: 0.5,
                    fillColor: color,
                    fillOpacity: 0.7,
                  };
                }}
                onEachFeature={(feature: any, layer: any) => {
                  const p = feature?.properties || {};
                  layer.bindTooltip(
                    `${p.admin_name || p.admin_pcode}<br/>Score: ${
                      p.score ?? "—"
                    }<br/>Raw: ${p.raw_value ?? "—"}`,
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

        {/* Summary table */}
        <div className="border rounded">
          <div className="px-4 py-3 border-b font-semibold">
            Summary — {affectedAdm3PCodes.length > 0 ? "Affected area" : "All ADM3"}
          </div>
          <div className="p-4 overflow-x-auto">
            <table className="min-w-[560px] w-full text-sm">
              <thead>
                <tr className="text-left text-gray-600">
                  <th className="py-2 pr-4">Metric</th>
                  <th className="py-2">Value</th>
                </tr>
              </thead>
              <tbody className="[&>tr:nth-child(odd)]:bg-gray-50">
                <tr>
                  <td className="py-2 pr-4">Total population in affected area</td>
                  <td className="py-2">{formatInt(totalPop)}</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4">
                    Total population in ADM3 areas that score ≥ 3
                    <div className="text-xs text-gray-500">
                      {selectedAdminLevel?.toUpperCase() === "ADM3" && selectedTable
                        ? `Uses score from ${selectedTable}`
                        : "Uses consolidated overall (derived.derived_overall_adm3)"}
                    </div>
                  </td>
                  <td className="py-2">{formatInt(popScore3Plus)}</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4">
                    Total poor people (poverty rate × population)
                  </td>
                  <td className="py-2">{formatInt(totalPoor)}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t text-xs text-gray-500">
            Notes: Population sourced from <code>population_unified</code>.
            Poverty rate from <code>derived.derived_poverty_vulnerability_adm3</code>.
            Scores from the selected layer if it is ADM3, otherwise from{" "}
            <code>derived.derived_overall_adm3</code>.
          </div>
        </div>
      </div>
    </SidebarLayout>
  );
}

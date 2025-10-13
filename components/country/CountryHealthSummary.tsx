"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Database,
  Map,
  Users,
  Layers,
  Info,
} from "lucide-react";

export default function CountryHealthSummary({
  countryIso,
}: {
  countryIso: string;
}) {
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data: admins } = await supabase
          .from("admin_units")
          .select("id, level")
          .eq("country_iso", countryIso);
        // 🧭 Population — fetch full record count
const { data: pop, count: popCount } = await supabase
  .from("population_data")
  .select("pcode, population", { count: "exact" })
  .eq("country_iso", countryIso)
  .limit(100000); // arbitrary high cap to ensure full range

// 🗺️ GIS — count all uploaded layers
const { data: gis, count: gisCount } = await supabase
  .from("gis_layers")
  .select("id, layer_type", { count: "exact" })
  .eq("country_iso", countryIso);
        const { data: dh } = await supabase
          .from("data_health_summary")
          .select("dataset_id, completeness_pct")
          .eq("country_iso", countryIso);
        const { data: datasets } = await supabase
          .from("dataset_metadata")
          .select("id")
          .eq("country_iso", countryIso);

        const adminHealth = (() => {
          if (!admins?.length) return { pct: 0, count: 0, label: "Missing" };
          const lvls = new Set(admins.map((a) => a.level));
          const required = ["ADM0", "ADM1", "ADM2"];
          const have = required.filter((l) => lvls.has(l));
          const pct = (have.length / required.length) * 100;
          return { pct, count: lvls.size, label: pct >= 100 ? "Complete" : "Partial" };
        })();

        const popHealth = (() => {
          if (!pop?.length) return { pct: 0, count: 0, label: "Missing" };
          const filled = pop.filter((p) => p.population && p.population > 0);
          const pct = (filled.length / pop.length) * 100;
          return { pct, count: pop.length, label: pct >= 95 ? "Complete" : "Partial" };
        })();

        const gisHealth = (() => {
  if (!gisCount) return { pct: 0, count: 0, label: "Missing" };
  const valid = gis?.filter((g) => g.layer_type) || [];
  const pct = (valid.length / gisCount) * 100;
  return {
    pct,
    count: gisCount,
    label: pct >= 95 ? "Complete" : "Partial",
  };
})();

        const otherHealth = (() => {
          if (!datasets?.length) return { pct: 0, count: 0, label: "Missing" };
          const vals = dh?.map((r) => r.completeness_pct || 0) || [];
          const avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
          return { pct: avg, count: datasets.length, label: avg >= 90 ? "Complete" : "Partial" };
        })();

        const overallPct =
          (adminHealth.pct + popHealth.pct + gisHealth.pct + otherHealth.pct) / 4;

        setSummary({
          adminHealth,
          popHealth,
          gisHealth,
          otherHealth,
          overallPct,
        });
      } catch (e) {
        console.error("CountryHealthSummary error:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, [countryIso]);

  if (loading)
    return (
      <div className="mb-6 p-4 rounded-lg border bg-white shadow-sm flex items-center gap-2 text-gray-600 text-sm">
        <Activity className="w-4 h-4 animate-spin" /> Checking data health…
      </div>
    );

  if (!summary) return null;

  const icon =
    summary.overallPct > 90 ? (
      <CheckCircle2 className="w-5 h-5 text-green-600" />
    ) : summary.overallPct > 70 ? (
      <AlertTriangle className="w-5 h-5 text-yellow-600" />
    ) : (
      <XCircle className="w-5 h-5 text-red-600" />
    );

  const cell = (
    label: string,
    iconEl: JSX.Element,
    pct: number,
    desc: string,
    count: number
  ) => (
    <div
      className="flex flex-col items-center relative group"
      title={`${label}: ${count} records • ${desc}`}
    >
      {iconEl}
      <p className="text-sm font-medium mt-1">{label}</p>
      <p
        className={`text-sm font-semibold ${
          pct >= 90
            ? "text-green-600"
            : pct >= 70
            ? "text-yellow-600"
            : "text-red-600"
        }`}
      >
        {pct.toFixed(1)}%
      </p>
      <div className="opacity-0 group-hover:opacity-100 absolute bottom-12 bg-gray-800 text-white text-xs px-2 py-1 rounded shadow-md pointer-events-none transition">
        {count} entries • {desc}
      </div>
    </div>
  );

  return (
    <div className="mb-6 p-4 rounded-lg border bg-white shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-[color:var(--gsc-gray)] flex items-center gap-1">
          Country Data Health Overview
          {/* ✅ FIX: tooltip wrapper instead of title prop */}
          <div title="Summarizes completeness across baseline datasets">
            <Info className="w-4 h-4 text-gray-400" />
          </div>
        </h2>
        {icon}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 text-center gap-4">
        {cell("Admin Units", <Map className="w-5 h-5 text-green-700" />, summary.adminHealth.pct, summary.adminHealth.label, summary.adminHealth.count)}
        {cell("Population", <Users className="w-5 h-5 text-gray-700" />, summary.popHealth.pct, summary.popHealth.label, summary.popHealth.count)}
        {cell("GIS Layers", <Layers className="w-5 h-5 text-yellow-700" />, summary.gisHealth.pct, summary.gisHealth.label, summary.gisHealth.count)}
        {cell("Other Datasets", <Database className="w-5 h-5 text-blue-700" />, summary.otherHealth.pct, summary.otherHealth.label, summary.otherHealth.count)}
      </div>

      <div className="mt-3 text-center text-xs text-gray-600">
        Overall Completeness:{" "}
        <span
          className={`font-semibold ${
            summary.overallPct >= 90
              ? "text-green-600"
              : summary.overallPct >= 70
              ? "text-yellow-600"
              : "text-red-600"
          }`}
        >
          {summary.overallPct.toFixed(1)}%
        </span>
      </div>
    </div>
  );
}

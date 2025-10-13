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
} from "lucide-react";

/**
 * CountryHealthSummary
 * ------------------------------------------------------------
 * Aggregates data completeness across baseline datasets:
 *  - Admin Units
 *  - Population
 *  - GIS Layers
 *  - Other Datasets (from dataset_metadata)
 *
 * Draws from multiple tables to reflect national readiness.
 */
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
        // 🔹 Admin Units
        const { data: admins } = await supabase
          .from("admin_units")
          .select("id, level, name, pcode")
          .eq("country_iso", countryIso);

        // 🔹 Population
        const { data: pop } = await supabase
          .from("population_data")
          .select("pcode, population")
          .eq("country_iso", countryIso);

        // 🔹 GIS Layers
        const { data: gis } = await supabase
          .from("gis_layers")
          .select("id, layer_type, country_iso")
          .eq("country_iso", countryIso);

        // 🔹 Datasets (with precomputed health if available)
        const { data: dh } = await supabase
          .from("data_health_summary")
          .select("dataset_id, completeness_pct, missing_admins_pct")
          .eq("country_iso", countryIso);

        const { data: datasets } = await supabase
          .from("dataset_metadata")
          .select("id, title, admin_level, indicator_id, country_iso")
          .eq("country_iso", countryIso);

        // ✅ Compute metrics
        const adminHealth = (() => {
          if (!admins?.length) return { pct: 0, label: "Missing" };
          const lvls = new Set(admins.map((a) => a.level));
          const expected = ["ADM0", "ADM1", "ADM2"];
          const have = expected.filter((l) => lvls.has(l));
          const pct = (have.length / expected.length) * 100;
          return { pct, label: pct >= 100 ? "Complete" : "Partial" };
        })();

        const popHealth = (() => {
          if (!pop?.length) return { pct: 0, label: "Missing" };
          const filled = pop.filter((p) => p.population && p.population > 0);
          const pct = (filled.length / pop.length) * 100;
          return { pct, label: pct >= 95 ? "Complete" : "Partial" };
        })();

        const gisHealth = (() => {
          if (!gis?.length) return { pct: 0, label: "Missing" };
          const valid = gis.filter((g) => g.layer_type);
          const pct = (valid.length / gis.length) * 100;
          return { pct, label: pct >= 95 ? "Complete" : "Partial" };
        })();

        const otherHealth = (() => {
          if (!datasets?.length) return { pct: 0, label: "Missing" };
          const vals = dh?.map((r) => r.completeness_pct || 0) || [];
          const avg = vals.length
            ? vals.reduce((a, b) => a + b, 0) / vals.length
            : 0;
          return { pct: avg, label: avg >= 90 ? "Complete" : "Partial" };
        })();

        const overallPct =
          (adminHealth.pct + popHealth.pct + gisHealth.pct + otherHealth.pct) /
          4;

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

  if (loading) {
    return (
      <div className="mb-6 p-4 rounded-lg border bg-white shadow-sm flex items-center gap-2 text-gray-600 text-sm">
        <Activity className="w-4 h-4 animate-spin" /> Checking data health…
      </div>
    );
  }

  if (!summary) return null;

  const icon =
    summary.overallPct > 90 ? (
      <CheckCircle2 className="w-5 h-5 text-green-600" />
    ) : summary.overallPct > 70 ? (
      <AlertTriangle className="w-5 h-5 text-yellow-600" />
    ) : (
      <XCircle className="w-5 h-5 text-red-600" />
    );

  const cell = (label: string, icon: JSX.Element, pct: number, desc: string) => (
    <div className="flex flex-col items-center">
      {icon}
      <p className="text-sm font-medium mt-1">{label}</p>
      <p className="text-xs text-gray-500">{desc}</p>
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
    </div>
  );

  return (
    <div className="mb-6 p-4 rounded-lg border bg-white shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-[color:var(--gsc-gray)]">
          Country Data Health Overview
        </h2>
        {icon}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 text-center gap-3">
        {cell("Admin Units", <Map className="w-5 h-5 text-green-700" />, summary.adminHealth.pct, summary.adminHealth.label)}
        {cell("Population", <Users className="w-5 h-5 text-gray-700" />, summary.popHealth.pct, summary.popHealth.label)}
        {cell("GIS Layers", <Layers className="w-5 h-5 text-yellow-700" />, summary.gisHealth.pct, summary.gisHealth.label)}
        {cell("Other Datasets", <Database className="w-5 h-5 text-blue-700" />, summary.otherHealth.pct, summary.otherHealth.label)}
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

"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import {
  Map,
  Users,
  Layers,
  Database,
  Info,
  XCircle,
} from "lucide-react";

/**
 * CountryHealthSummary
 * Summarizes completeness across Admin, Population, GIS, and Other Datasets.
 */
export default function CountryHealthSummary({ countryIso }: { countryIso: string }) {
  const [health, setHealth] = useState({
    admins: 0,
    population: 0,
    gis: 0,
    other: 0,
    overall: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!countryIso) return;
    const loadHealth = async () => {
      try {
        setLoading(true);

        // --- ADMIN HEALTH ---
        const { count: adminCount } = await supabase
          .from("admin_units")
          .select("id", { count: "exact", head: true })
          .eq("country_iso", countryIso);

        // For simplicity, assume completeness = proportion of ADM levels 0–3
        const { data: adminLevels } = await supabase
          .from("admin_units")
          .select("level")
          .eq("country_iso", countryIso);

        const levels = new Set((adminLevels || []).map((r) => r.level));
        const completenessAdmin =
          adminCount && adminCount > 0
            ? Math.min((levels.size / 3) * 100, 100)
            : 0;

        // --- POPULATION HEALTH (active version only) ---
        const { data: popVersion } = await supabase
          .from("population_dataset_versions")
          .select("id")
          .eq("country_iso", countryIso)
          .eq("is_active", true)
          .maybeSingle();

        let completenessPop = 0;
        if (popVersion?.id) {
          const { count: popCount } = await supabase
            .from("population_data")
            .select("pcode", { count: "exact", head: true })
            .eq("dataset_version_id", popVersion.id);

          completenessPop = popCount && popCount > 0 ? 100 : 0;
        }

        // --- GIS HEALTH (active version only) ---
        const { data: gisVersion } = await supabase
          .from("gis_dataset_versions")
          .select("id")
          .eq("country_iso", countryIso)
          .eq("is_active", true)
          .maybeSingle();

        let completenessGIS = 0;
        if (gisVersion?.id) {
          const { count: gisCount } = await supabase
            .from("gis_layers")
            .select("id", { count: "exact", head: true })
            .eq("dataset_version_id", gisVersion.id);

          completenessGIS = gisCount && gisCount > 0 ? 100 : 0;
        }

        // --- OTHER DATASETS HEALTH ---
        const { data: otherHealth } = await supabase
          .from("data_health_summary")
          .select("completeness_pct")
          .eq("country_iso", countryIso);

        const completenessOther =
          otherHealth && otherHealth.length
            ? Math.round(
                otherHealth.reduce((s, d) => s + (d.completeness_pct || 0), 0) /
                  otherHealth.length
              )
            : 0;

        // --- OVERALL ---
        const overall =
          (completenessAdmin + completenessPop + completenessGIS + completenessOther) /
          4;

        setHealth({
          admins: completenessAdmin,
          population: completenessPop,
          gis: completenessGIS,
          other: completenessOther,
          overall,
        });
      } catch (e) {
        console.error("Error loading health:", e);
      } finally {
        setLoading(false);
      }
    };

    loadHealth();
  }, [countryIso]);

  if (loading)
    return (
      <div className="border rounded-lg p-4 bg-white text-sm text-gray-500">
        Loading country data health…
      </div>
    );

  const Metric = ({
    label,
    value,
    icon,
  }: {
    label: string;
    value: number;
    icon: JSX.Element;
  }) => {
    const color =
      value >= 90 ? "text-green-600" : value >= 50 ? "text-yellow-600" : "text-red-600";
    return (
      <div className="flex flex-col items-center">
        {icon}
        <p className="text-sm mt-1">{label}</p>
        <p className={`font-semibold ${color}`}>{value.toFixed(1)}%</p>
      </div>
    );
  };

  return (
    <div className="border rounded-lg bg-white p-4 shadow-sm">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-base font-semibold text-[color:var(--gsc-gray)] flex items-center gap-2">
          Country Data Health Overview
          <Info className="w-4 h-4 text-gray-400" />
        </h2>
        <XCircle className="w-5 h-5 text-red-400" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
        <Metric
          label="Admin Units"
          value={health.admins}
          icon={<Map className="w-6 h-6 text-green-600" />}
        />
        <Metric
          label="Population"
          value={health.population}
          icon={<Users className="w-6 h-6 text-gray-600" />}
        />
        <Metric
          label="GIS Layers"
          value={health.gis}
          icon={<Layers className="w-6 h-6 text-amber-600" />}
        />
        <Metric
          label="Other Datasets"
          value={health.other}
          icon={<Database className="w-6 h-6 text-blue-600" />}
        />
      </div>

      <p className="text-center text-sm mt-3">
        Overall Completeness:{" "}
        <span
          className={`font-semibold ${
            health.overall >= 90
              ? "text-green-600"
              : health.overall >= 50
              ? "text-yellow-600"
              : "text-red-600"
          }`}
        >
          {health.overall.toFixed(1)}%
        </span>
      </p>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { Activity, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";

/**
 * CountryHealthSummary
 * ------------------------------------------------------------
 * Shows an overview of data health for all datasets in a country.
 * Pulls aggregated values from `data_health_summary` view.
 */
export default function CountryHealthSummary({ countryIso }: { countryIso: string }) {
  const [summary, setSummary] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("data_health_summary")
        .select("*")
        .eq("country_iso", countryIso);
      if (error) console.error("Health summary error:", error);
      setSummary(data || []);
      setLoading(false);
    })();
  }, [countryIso]);

  if (loading) {
    return (
      <div className="mb-6 p-4 rounded-lg border bg-white shadow-sm flex items-center gap-2 text-gray-600 text-sm">
        <Activity className="w-4 h-4 animate-spin" /> Checking data health…
      </div>
    );
  }

  if (!summary.length) return null; // Hide gracefully if nothing to show

  // Aggregate averages
  const avgCompleteness =
    summary.reduce((sum, s) => sum + (s.completeness_pct || 0), 0) /
    summary.length;

  const avgMissing =
    summary.reduce((sum, s) => sum + (s.missing_admins_pct || 0), 0) /
    summary.length;

  const icon =
    avgCompleteness > 90 ? (
      <CheckCircle2 className="w-5 h-5 text-green-600" />
    ) : avgCompleteness > 70 ? (
      <AlertTriangle className="w-5 h-5 text-yellow-600" />
    ) : (
      <XCircle className="w-5 h-5 text-red-600" />
    );

  return (
    <div className="mb-6 p-4 rounded-lg border bg-white shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-semibold text-[color:var(--gsc-gray)]">
          Data Health Summary
        </h2>
        {icon}
      </div>
      <div className="grid grid-cols-3 text-center text-sm">
        <div>
          <p className="font-medium">{summary.length}</p>
          <p className="text-xs text-gray-500">Datasets</p>
        </div>
        <div>
          <p className="font-medium">{avgCompleteness.toFixed(1)}%</p>
          <p className="text-xs text-gray-500">Avg Completeness</p>
        </div>
        <div>
          <p className="font-medium">{avgMissing.toFixed(1)}%</p>
          <p className="text-xs text-gray-500">Missing Admins</p>
        </div>
      </div>
    </div>
  );
}

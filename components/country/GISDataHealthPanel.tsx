"use client";

import React, { useMemo } from "react";

/**
 * Props: expects the `layers` array already loaded in GISPage
 * (Each layer includes admin_level_int, crs, feature_count, created_at)
 */
type GISLayer = {
  id: string;
  layer_name: string;
  admin_level_int: number | null;
  admin_level: string | null;
  crs: string | null;
  feature_count: number | null;
  created_at?: string;
};

export default function GISDataHealthPanel({ layers }: { layers: GISLayer[] }) {
  // Compute metrics once per render
  const metrics = useMemo(() => {
    if (!layers || !layers.length) return null;

    // CRS consistency
    const crsSet = new Set(layers.map((l) => l.crs || "unknown"));
    const crsConsistent = crsSet.size === 1 && !crsSet.has("unknown");
    const crsValue = [...crsSet].join(", ");

    // Feature count summary
    const totalFeatures = layers.reduce((sum, l) => sum + (l.feature_count || 0), 0);
    const featureCounts = layers.map((l) => ({
      level: l.admin_level || `ADM${l.admin_level_int ?? ""}`,
      count: l.feature_count ?? 0,
    }));

    // Layer completeness (ADM0–ADM5)
    const presentLevels = new Set(layers.map((l) => l.admin_level_int ?? -1));
    const completeness =
      presentLevels.size >= 4 ? "Good coverage" : presentLevels.size > 0 ? "Partial" : "Missing";

    // Data freshness (most recent upload)
    const timestamps = layers
      .map((l) => (l.created_at ? new Date(l.created_at).getTime() : 0))
      .filter((t) => t > 0);
    const latest = timestamps.length ? new Date(Math.max(...timestamps)) : null;

    return {
      crsConsistent,
      crsValue,
      totalFeatures,
      featureCounts,
      completeness,
      latest,
    };
  }, [layers]);

  if (!metrics) return null;

  // Utility to format date
  const fmtDate = (d: Date | null) =>
    d ? d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : "—";

  // Style helpers (GSC branding)
  const cardBase =
    "flex flex-col justify-between p-4 rounded-lg border shadow-sm bg-white min-w-[150px]";
  const label = "text-xs uppercase text-gray-500 mb-1";
  const value = "text-lg font-semibold";
  const statusBadge = (ok: boolean) =>
    ok
      ? "bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs font-medium"
      : "bg-red-100 text-red-700 px-2 py-0.5 rounded text-xs font-medium";

  return (
    <div className="mb-4">
      <h3
        className="text-base font-semibold mb-3"
        style={{ color: "var(--gsc-blue)" }}
      >
        Data Health Summary
      </h3>

      <div className="flex flex-wrap gap-4">
        {/* CRS Consistency */}
        <div className={cardBase}>
          <span className={label}>CRS Consistency</span>
          <div className="flex items-center justify-between">
            <span className={value}>{metrics.crsValue}</span>
            <span className={statusBadge(metrics.crsConsistent)}>
              {metrics.crsConsistent ? "OK" : "Mixed"}
            </span>
          </div>
        </div>

        {/* Feature Counts */}
        <div className={cardBase}>
          <span className={label}>Total Features</span>
          <span className={value}>{metrics.totalFeatures.toLocaleString()}</span>
          <div className="text-xs mt-1 text-gray-600">
            {metrics.featureCounts.map((f) => (
              <div key={f.level}>
                {f.level}: {f.count.toLocaleString()}
              </div>
            ))}
          </div>
        </div>

        {/* Completeness */}
        <div className={cardBase}>
          <span className={label}>Layer Coverage</span>
          <span
            className={`${value} ${
              metrics.completeness === "Good coverage"
                ? "text-green-700"
                : metrics.completeness === "Partial"
                ? "text-yellow-600"
                : "text-red-700"
            }`}
          >
            {metrics.completeness}
          </span>
          <span className="text-xs text-gray-600 mt-1">
            {presentLevelSummary(layers)}
          </span>
        </div>

        {/* Latest Upload */}
        <div className={cardBase}>
          <span className={label}>Most Recent Upload</span>
          <span className={value}>{fmtDate(metrics.latest)}</span>
        </div>
      </div>
    </div>
  );
}

/**
 * Helper: returns a summary like "ADM0–ADM3 present"
 */
function presentLevelSummary(layers: GISLayer[]): string {
  const lvls = Array.from(
    new Set(
      layers
        .map((l) => l.admin_level_int)
        .filter((n) => n !== null && n !== undefined)
        .sort((a, b) => (a ?? 0) - (b ?? 0))
    )
  );
  if (!lvls.length) return "No layers";
  const first = lvls[0];
  const last = lvls[lvls.length - 1];
  return lvls.length === 1 ? `ADM${first}` : `ADM${first}–ADM${last} present`;
}

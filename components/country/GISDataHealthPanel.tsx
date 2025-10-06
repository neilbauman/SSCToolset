"use client";

import React, { useMemo } from "react";

type GISLayer = {
  id: string;
  layer_name: string;
  admin_level_int: number | null;
  admin_level: string | null;
  crs: string | null;
  feature_count: number | null;
  created_at?: string;
  source?: { url?: string };
};

export default function GISDataHealthPanel({ layers }: { layers: GISLayer[] }) {
  const metrics = useMemo(() => {
    if (!layers || !layers.length) return null;

    // ─── CRS consistency
    const crsSet = new Set(layers.map((l) => l.crs || "unknown"));
    const crsConsistent = crsSet.size === 1 && !crsSet.has("unknown");
    const crsValue = [...crsSet].join(", ");

    // ─── Feature counts
    const totalFeatures = layers.reduce((sum, l) => sum + (l.feature_count || 0), 0);
    const featureCounts = layers.map((l) => ({
      level: l.admin_level || `ADM${l.admin_level_int ?? ""}`,
      count: l.feature_count ?? 0,
    }));

    // ─── Coverage completeness (ADM0–ADM5)
    const presentLevels = new Set(layers.map((l) => l.admin_level_int ?? -1));
    const completeness =
      presentLevels.size >= 4 ? "Good coverage" : presentLevels.size > 0 ? "Partial" : "Missing";

    // ─── Freshness
    const timestamps = layers
      .map((l) => (l.created_at ? new Date(l.created_at).getTime() : 0))
      .filter((t) => t > 0);
    const latest = timestamps.length ? new Date(Math.max(...timestamps)) : null;

    // ─── Validation checks
    const validations: {
      severity: "ok" | "warn" | "error";
      message: string;
      layer?: string;
    }[] = [];

    // Missing CRS
    layers.forEach((l) => {
      if (!l.crs)
        validations.push({
          severity: "warn",
          message: "Missing CRS value",
          layer: l.layer_name,
        });
    });

    // Empty or missing feature counts
    layers.forEach((l) => {
      if (!l.feature_count || l.feature_count === 0)
        validations.push({
          severity: "warn",
          message: "Layer has zero features",
          layer: l.layer_name,
        });
    });

    // CRS mismatch
    if (!crsConsistent)
      validations.push({
        severity: "error",
        message: "Multiple CRS detected across layers",
      });

    // Coverage gaps
    if (presentLevels.size < 4)
      validations.push({
        severity: "warn",
        message: "Incomplete ADM0–ADM5 coverage",
      });

    // Geometry sanity (ensure each file has features)
    const missingGeometry = layers.filter(
      (l) => l.feature_count !== null && l.feature_count <= 0
    );
    if (missingGeometry.length > 0)
      validations.push({
        severity: "warn",
        message: `${missingGeometry.length} layer(s) may have invalid geometries`,
      });

    return {
      crsConsistent,
      crsValue,
      totalFeatures,
      featureCounts,
      completeness,
      latest,
      validations,
    };
  }, [layers]);

  if (!metrics) return null;

  const fmtDate = (d: Date | null) =>
    d ? d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : "—";

  const cardBase =
    "flex flex-col justify-between p-4 rounded-lg border shadow-sm bg-white min-w-[150px]";
  const label = "text-xs uppercase text-gray-500 mb-1";
  const value = "text-lg font-semibold";
  const statusBadge = (ok: boolean) =>
    ok
      ? "bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs font-medium"
      : "bg-red-100 text-red-700 px-2 py-0.5 rounded text-xs font-medium";

  const presentLevelSummary = (): string => {
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
  };

  const colorMap = {
    ok: "text-green-700",
    warn: "text-yellow-700",
    error: "text-red-700",
  } as const;

  return (
    <div className="mb-6">
      <h3 className="text-base font-semibold mb-3" style={{ color: "var(--gsc-blue)" }}>
        Data Health Summary
      </h3>

      {/* Summary cards */}
      <div className="flex flex-wrap gap-4 mb-4">
        <div className={cardBase}>
          <span className={label}>CRS Consistency</span>
          <div className="flex items-center justify-between">
            <span className={value}>{metrics.crsValue}</span>
            <span className={statusBadge(metrics.crsConsistent)}>
              {metrics.crsConsistent ? "OK" : "Mixed"}
            </span>
          </div>
        </div>

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
          <span className="text-xs text-gray-600 mt-1">{presentLevelSummary()}</span>
        </div>

        <div className={cardBase}>
          <span className={label}>Most Recent Upload</span>
          <span className={value}>{fmtDate(metrics.latest)}</span>
        </div>
      </div>

      {/* Validation table */}
      {metrics.validations.length > 0 && (
        <div className="border rounded-lg bg-white shadow-sm p-4">
          <h4
            className="text-sm font-semibold mb-2"
            style={{ color: "var(--gsc-blue)" }}
          >
            Validation Checks
          </h4>
          <table className="min-w-full text-sm border-collapse">
            <thead className="bg-[color:var(--gsc-beige)] text-gray-700 uppercase text-xs">
              <tr>
                <th className="px-3 py-2 border">Severity</th>
                <th className="px-3 py-2 border">Message</th>
                <th className="px-3 py-2 border">Layer</th>
              </tr>
            </thead>
            <tbody>
              {metrics.validations.map((v, i) => (
                <tr key={i} className="border-t">
                  <td
                    className={`px-3 py-1 border font-medium ${
                      colorMap[v.severity]
                    }`}
                  >
                    {v.severity.toUpperCase()}
                  </td>
                  <td className="px-3 py-1 border">{v.message}</td>
                  <td className="px-3 py-1 border">{v.layer || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {metrics.validations.length === 0 && (
        <div className="border rounded-lg bg-green-50 text-green-700 text-sm px-4 py-2">
          ✅ All checks passed — GIS data looks healthy.
        </div>
      )}
    </div>
  );
}

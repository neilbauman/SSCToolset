"use client";

import { AlertTriangle, CheckCircle, XCircle } from "lucide-react";

type Props = {
  totalUnits: number;
  validPopulationCount?: number;
  coverage?: number; // percentage of admin units covered
  hasYear?: boolean;
  allHavePcodes?: boolean;
  missingPcodes?: number;
  hasGISLink?: boolean;
};

export default function DatasetHealth({
  totalUnits,
  validPopulationCount,
  coverage,
  hasYear,
  allHavePcodes,
  missingPcodes,
  hasGISLink,
}: Props) {
  const checks: { label: string; passed: boolean; detail?: string }[] = [];

  // Generic admin unit checks
  if (allHavePcodes !== undefined) {
    checks.push({
      label: "All rows have valid PCodes",
      passed: allHavePcodes,
      detail: missingPcodes && missingPcodes > 0 ? `${missingPcodes} missing` : undefined,
    });
  }

  if (hasGISLink !== undefined) {
    checks.push({
      label: "Linked to GIS layers",
      passed: hasGISLink,
    });
  }

  // Population-specific checks
  if (validPopulationCount !== undefined) {
    checks.push({
      label: "Population values valid (> 0)",
      passed: validPopulationCount === totalUnits && totalUnits > 0,
      detail:
        totalUnits > 0
          ? `${validPopulationCount}/${totalUnits} valid`
          : "No population data",
    });
  }

  if (coverage !== undefined) {
    checks.push({
      label: "Coverage of admin units",
      passed: coverage >= 95, // arbitrary threshold for "good"
      detail: `${coverage.toFixed(1)}%`,
    });
  }

  if (hasYear !== undefined) {
    checks.push({
      label: "Dataset has year assigned",
      passed: hasYear,
    });
  }

  // Overall badge
  const allPassed = checks.length > 0 && checks.every((c) => c.passed);

  return (
    <div className="border rounded-lg p-4 shadow-sm">
      <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
        Dataset Health
        {allPassed ? (
          <span className="px-2 py-0.5 text-xs rounded bg-green-100 text-green-700">Passing</span>
        ) : (
          <span className="px-2 py-0.5 text-xs rounded bg-red-100 text-red-700">Failing</span>
        )}
      </h2>
      <ul className="space-y-1 text-sm">
        {checks.map((c, i) => (
          <li key={i} className="flex items-center gap-2">
            {c.passed ? (
              <CheckCircle className="w-4 h-4 text-green-600" />
            ) : (
              <XCircle className="w-4 h-4 text-red-600" />
            )}
            <span>
              {c.label}
              {c.detail && <span className="ml-1 text-gray-500">({c.detail})</span>}
            </span>
          </li>
        ))}
        {checks.length === 0 && (
          <li className="italic text-gray-400">No checks available</li>
        )}
      </ul>
    </div>
  );
}

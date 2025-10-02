"use client";

import { CheckCircle, XCircle } from "lucide-react";

type Props = {
  totalUnits: number;

  // Admin units
  validPcodeCount?: number;
  missingPcodes?: number;

  // Population
  validPopulationCount?: number;
  hasYear?: boolean; // true if all rows have a year

  // GIS
  validCRSCount?: number;
  validFeatureCount?: number;
};

export default function DatasetHealth({
  totalUnits,
  validPcodeCount,
  missingPcodes,
  validPopulationCount,
  hasYear,
  validCRSCount,
  validFeatureCount,
}: Props) {
  const items: { label: string; ok: boolean; detail?: string }[] = [];

  // Admin units health
  if (validPcodeCount !== undefined) {
    items.push({
      label: "Admin units with PCodes",
      ok: validPcodeCount === totalUnits && totalUnits > 0,
      detail: `${validPcodeCount}/${totalUnits}`,
    });
  }

  // Population health
  if (validPopulationCount !== undefined) {
    items.push({
      label: "Population values present",
      ok: validPopulationCount === totalUnits && totalUnits > 0,
      detail: `${validPopulationCount}/${totalUnits}`,
    });
  }

  if (hasYear !== undefined) {
    items.push({
      label: "Year values present",
      ok: hasYear,
    });
  }

  // GIS health
  if (validCRSCount !== undefined) {
    items.push({
      label: "GIS layers with CRS",
      ok: validCRSCount === totalUnits && totalUnits > 0,
      detail: `${validCRSCount}/${totalUnits}`,
    });
  }

  if (validFeatureCount !== undefined) {
    items.push({
      label: "GIS layers with features (>0)",
      ok: validFeatureCount === totalUnits && totalUnits > 0,
      detail: `${validFeatureCount}/${totalUnits}`,
    });
  }

  return (
    <div className="border rounded-lg p-4 shadow-sm">
      <h2 className="text-lg font-semibold mb-3">Dataset Health</h2>
      {totalUnits === 0 && (
        <p className="italic text-gray-500">No data uploaded yet</p>
      )}
      {totalUnits > 0 && (
        <ul className="space-y-2">
          {items.map((i, idx) => (
            <li key={idx} className="flex items-center gap-2 text-sm">
              {i.ok ? (
                <CheckCircle className="w-4 h-4 text-green-600" />
              ) : (
                <XCircle className="w-4 h-4 text-red-600" />
              )}
              <span>
                {i.label}{" "}
                {i.detail && (
                  <span className="text-gray-500">({i.detail})</span>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

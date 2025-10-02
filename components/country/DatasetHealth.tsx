"use client";

import { CheckCircle, XCircle, AlertTriangle } from "lucide-react";

type Props = {
  allHavePcodes?: boolean;
  missingPcodes?: number;
  hasGISLink?: boolean;
  hasPopulation?: boolean;
  totalUnits: number;
  // NEW for GIS
  allHaveCRS?: boolean;
  allHaveFeatures?: boolean;
};

export default function DatasetHealth({
  allHavePcodes,
  missingPcodes,
  hasGISLink,
  hasPopulation,
  totalUnits,
  allHaveCRS,
  allHaveFeatures,
}: Props) {
  const items: { label: string; ok: boolean; warn?: boolean; detail?: string }[] = [];

  if (allHavePcodes !== undefined) {
    items.push({
      label: "All rows have PCodes",
      ok: allHavePcodes,
      detail: missingPcodes && missingPcodes > 0 ? `${missingPcodes} missing` : undefined,
    });
  }

  if (hasPopulation !== undefined) {
    items.push({
      label: "Population values present",
      ok: hasPopulation,
    });
  }

  if (hasGISLink !== undefined) {
    items.push({
      label: "Linked to GIS layers",
      ok: hasGISLink,
    });
  }

  if (allHaveCRS !== undefined) {
    items.push({
      label: "All GIS layers have CRS",
      ok: allHaveCRS,
    });
  }

  if (allHaveFeatures !== undefined) {
    items.push({
      label: "All GIS layers have features (>0)",
      ok: allHaveFeatures,
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
                {i.detail && <span className="text-gray-500">({i.detail})</span>}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

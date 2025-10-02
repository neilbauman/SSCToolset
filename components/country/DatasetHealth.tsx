"use client";

import { CheckCircle, XCircle } from "lucide-react";

type Props = {
  totalUnits: number;

  // Admin units
  validPcodeCount?: number;

  // Population
  validPopulationCount?: number;
  hasYear?: boolean;

  // GIS
  validCRSCount?: number;
  validFeatureCount?: number;
};

export default function DatasetHealth({
  totalUnits,
  validPcodeCount,
  validPopulationCount,
  hasYear,
  validCRSCount,
  validFeatureCount,
}: Props) {
  const items: {
    label: string;
    ok: boolean;
    value?: number;
    total?: number;
    showRatio?: boolean;
  }[] = [];

  // Admin units
  if (validPcodeCount !== undefined) {
    items.push({
      label: "Admin units with PCodes",
      ok: validPcodeCount === totalUnits && totalUnits > 0,
      value: validPcodeCount,
      total: totalUnits,
      showRatio: true,
    });
  }

  // Population
  if (validPopulationCount !== undefined) {
    items.push({
      label: "Population values present",
      ok: validPopulationCount === totalUnits && totalUnits > 0,
      value: validPopulationCount,
      total: totalUnits,
      showRatio: true,
    });
  }

  if (hasYear !== undefined) {
    items.push({
      label: "Year values present",
      ok: hasYear,
    });
  }

  // GIS
  if (validCRSCount !== undefined) {
    items.push({
      label: "GIS layers with CRS",
      ok: validCRSCount === totalUnits && totalUnits > 0,
      value: validCRSCount,
      total: totalUnits,
      showRatio: true,
    });
  }

  if (validFeatureCount !== undefined) {
    items.push({
      label: "GIS layers with features (>0)",
      ok: validFeatureCount === totalUnits && totalUnits > 0,
      value: validFeatureCount,
      total: totalUnits,
      showRatio: true,
    });
  }

  const badge = (ok: boolean, value?: number, total?: number, showRatio?: boolean) => {
    if (total === undefined || total === 0) return null;
    const ratio = value !== undefined && total !== undefined ? `${value}/${total}` : "";
    const isPartial = value !== undefined && total !== undefined && value > 0 && value < total;

    let color = ok ? "bg-green-100 text-green-800 border-green-300" : "bg-red-100 text-red-800 border-red-300";
    if (isPartial) color = "bg-amber-100 text-amber-800 border-amber-300";

    return (
      <span className={`ml-2 px-2 py-0.5 text-xs rounded border ${color}`}>
        {showRatio && ratio ? ratio : ok ? "OK" : "Fail"}
      </span>
    );
  };

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
              <span>{i.label}</span>
              {badge(i.ok, i.value, i.total, i.showRatio)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

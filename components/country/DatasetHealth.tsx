"use client";

import { CheckCircle, XCircle, AlertTriangle } from "lucide-react";

type Props = {
  totalUnits: number;
  allHavePcodes?: boolean;
  missingPcodes?: number;
  hasGISLink?: boolean;
  hasPopulation?: boolean;
};

export default function DatasetHealth({
  totalUnits,
  allHavePcodes,
  missingPcodes,
  hasGISLink,
  hasPopulation,
}: Props) {
  const items: { label: string; ok: boolean; detail?: string }[] = [];

  // Always include total units
  items.push({
    label: "Total Records",
    ok: totalUnits > 0,
    detail: `${totalUnits}`,
  });

  // PCode checks (Admins + Population)
  if (allHavePcodes !== undefined) {
    items.push({
      label: "All records have PCodes",
      ok: allHavePcodes,
      detail:
        missingPcodes && missingPcodes > 0
          ? `${missingPcodes} missing`
          : undefined,
    });
  }

  // Population-specific health
  if (hasPopulation !== undefined) {
    items.push({
      label: "All records have Population",
      ok: hasPopulation,
    });
  }

  // GIS-specific health
  if (hasGISLink !== undefined) {
    items.push({
      label: "All GIS layers valid",
      ok: hasGISLink,
    });
  }

  // Compute overall health
  const allOk = items.every((i) => i.ok);

  return (
    <div className="border rounded-lg p-4 shadow-sm">
      <h2 className="text-lg font-semibold flex items-center gap-2 mb-3">
        {allOk ? (
          <CheckCircle className="w-5 h-5 text-green-600" />
        ) : (
          <AlertTriangle className="w-5 h-5 text-yellow-600" />
        )}
        Dataset Health
      </h2>
      <ul className="text-sm text-gray-700 space-y-1">
        {items.map((i, idx) => (
          <li key={idx} className="flex items-center gap-2">
            {i.ok ? (
              <CheckCircle className="w-4 h-4 text-green-600" />
            ) : (
              <XCircle className="w-4 h-4 text-red-600" />
            )}
            <span>
              {i.label}
              {i.detail ? ` – ${i.detail}` : ""}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

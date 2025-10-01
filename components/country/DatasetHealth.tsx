"use client";

import React from "react";

export type DatasetHealthProps = {
  allHavePcodes: boolean;
  missingPcodes: number;
  hasGISLink: boolean;
  hasPopulation: boolean;
  totalUnits: number;
};

export default function DatasetHealth({
  allHavePcodes,
  missingPcodes,
  hasGISLink,
  hasPopulation,
  totalUnits,
}: DatasetHealthProps) {
  // Determine overall status
  let status: "uploaded" | "partial" | "missing" = "missing";
  if (hasPopulation && allHavePcodes && hasGISLink) {
    status = "uploaded";
  } else if (totalUnits > 0) {
    status = "partial";
  }

  const badgeColors: Record<typeof status, string> = {
    uploaded: "bg-green-100 text-green-700",
    partial: "bg-yellow-100 text-yellow-700",
    missing: "bg-red-100 text-red-700",
  };

  return (
    <div className="border rounded-lg p-4 shadow-sm relative">
      <div className="absolute top-2 right-2">
        <span
          className={`px-2 py-1 text-xs rounded ${badgeColors[status]}`}
        >
          {status}
        </span>
      </div>
      <h2 className="text-lg font-semibold mb-2">Data Health</h2>
      <ul className="text-sm list-disc pl-6">
        <li className={allHavePcodes ? "text-green-700" : "text-red-700"}>
          {allHavePcodes
            ? "All units have PCodes"
            : `${missingPcodes} units missing PCodes`}
        </li>
        <li className={hasPopulation ? "text-green-700" : "text-red-700"}>
          {hasPopulation
            ? "Population data available"
            : "Population not yet linked"}
        </li>
        <li className={hasGISLink ? "text-green-700" : "text-red-700"}>
          {hasGISLink
            ? "Aligned with GIS boundaries"
            : "GIS linkage not validated yet"}
        </li>
      </ul>
    </div>
  );
}

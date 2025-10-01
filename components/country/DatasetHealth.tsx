"use client";

import { ShieldCheck } from "lucide-react";

export default function DatasetHealth({
  allHavePcodes,
  missingPcodes,
  hasGISLink,
  hasPopulation,
  totalUnits,
}: {
  allHavePcodes: boolean;
  missingPcodes: number;
  hasGISLink: boolean;
  hasPopulation: boolean;
  totalUnits: number;
}) {
  let status = "missing";
  if (allHavePcodes && hasGISLink && hasPopulation) status = "uploaded";
  else if (totalUnits > 0) status = "partial";

  const badgeColor =
    status === "uploaded" ? "bg-green-100 text-green-700" :
    status === "partial" ? "bg-yellow-100 text-yellow-700" :
    "bg-red-100 text-red-700";

  return (
    <div className="border rounded-lg p-4 shadow-sm relative">
      <div className="absolute top-2 right-2">
        <span className={`px-2 py-1 text-xs rounded ${badgeColor}`}>{status}</span>
      </div>
      <h2 className="text-lg font-semibold flex items-center gap-2 mb-2">
        <ShieldCheck className="w-5 h-5 text-blue-600" /> Data Health
      </h2>
      <ul className="text-sm list-disc pl-6">
        <li className={allHavePcodes ? "text-green-700" : "text-red-700"}>
          {allHavePcodes ? "All units have PCodes" : `${missingPcodes} units missing PCodes`}
        </li>
        <li className={hasPopulation ? "text-green-700" : "text-yellow-700"}>
          {hasPopulation ? "Population data linked" : "Population linkage not applied yet"}
        </li>
        <li className={hasGISLink ? "text-green-700" : "text-red-700"}>
          {hasGISLink ? "Aligned with GIS boundaries" : "GIS linkage not validated yet"}
        </li>
      </ul>
    </div>
  );
}

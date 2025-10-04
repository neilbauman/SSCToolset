"use client";

import { CheckCircle, XCircle, AlertTriangle } from "lucide-react";

type Props = {
  totalUnits: number;
  // Admin
  allHavePcodes?: boolean;
  missingPcodes?: number;
  // Population
  hasPopulation?: boolean;
  // GIS
  validCRSCount?: number;
  validFeatureCount?: number;
};

export default function DatasetHealth({
  totalUnits,
  allHavePcodes,
  missingPcodes,
  hasPopulation,
  validCRSCount,
  validFeatureCount,
}: Props) {
  return (
    <div className="border rounded-lg p-4 shadow-sm">
      <h2 className="text-lg font-semibold flex items-center gap-2 mb-3">
        <AlertTriangle className="w-5 h-5 text-yellow-500" />
        Dataset Health
      </h2>
      <ul className="space-y-2 text-sm">
        <li className="flex items-center gap-2">
          {totalUnits > 0 ? (
            <CheckCircle className="text-green-600 w-4 h-4" />
          ) : (
            <XCircle className="text-red-600 w-4 h-4" />
          )}
          <span>
            Total Records – {totalUnits}
          </span>
        </li>

        {typeof allHavePcodes !== "undefined" && (
          <li className="flex items-center gap-2">
            {allHavePcodes ? (
              <CheckCircle className="text-green-600 w-4 h-4" />
            ) : (
              <XCircle className="text-red-600 w-4 h-4" />
            )}
            <span>
              All records have PCodes
              {typeof missingPcodes === "number" && missingPcodes > 0 && (
                <span className="ml-1 text-gray-500">
                  ({missingPcodes} missing)
                </span>
              )}
            </span>
          </li>
        )}

        {typeof hasPopulation !== "undefined" && (
          <li className="flex items-center gap-2">
            {hasPopulation ? (
              <CheckCircle className="text-green-600 w-4 h-4" />
            ) : (
              <XCircle className="text-red-600 w-4 h-4" />
            )}
            <span>All records have Population</span>
          </li>
        )}

        {typeof validCRSCount !== "undefined" && (
          <li className="flex items-center gap-2">
            {validCRSCount > 0 ? (
              <CheckCircle className="text-green-600 w-4 h-4" />
            ) : (
              <XCircle className="text-red-600 w-4 h-4" />
            )}
            <span>{validCRSCount} CRS definitions valid</span>
          </li>
        )}

        {typeof validFeatureCount !== "undefined" && (
          <li className="flex items-center gap-2">
            {validFeatureCount > 0 ? (
              <CheckCircle className="text-green-600 w-4 h-4" />
            ) : (
              <XCircle className="text-red-600 w-4 h-4" />
            )}
            <span>{validFeatureCount} layers with features</span>
          </li>
        )}
      </ul>
    </div>
  );
}

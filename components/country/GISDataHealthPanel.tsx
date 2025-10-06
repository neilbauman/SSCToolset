"use client";

import React from "react";

/** Shared type, imported by page.tsx as well */
export interface GISLayer {
  id: string;
  layer_name: string;
  admin_level: string | null;
  admin_level_int: number | null;
  source?: { path?: string; url?: string };
  format?: string | null;
  crs?: string | null;
  feature_count?: number | null;
  created_at?: string;
}

interface Props {
  layers: GISLayer[];
}

/**
 * GISDataHealthPanel
 * Displays summary stats and health checks for uploaded GIS layers.
 */
export default function GISDataHealthPanel({ layers }: Props) {
  const totalFeatures = layers.reduce((sum, l) => sum + (l.feature_count || 0), 0);
  const missingCRS = layers.filter((l) => !l.crs).length;
  const missingFormat = layers.filter((l) => !l.format).length;

  return (
    <div className="bg-white border rounded-lg shadow-sm p-4 mb-4">
      <h3 className="text-base font-semibold mb-2 text-[color:var(--gsc-blue)]">
        GIS Data Health
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
        <div className="border rounded p-2 text-center">
          <p className="text-xs text-gray-500">Total Layers</p>
          <p className="text-lg font-semibold">{layers.length}</p>
        </div>
        <div className="border rounded p-2 text-center">
          <p className="text-xs text-gray-500">Total Features</p>
          <p className="text-lg font-semibold">{totalFeatures}</p>
        </div>
        <div className="border rounded p-2 text-center">
          <p className="text-xs text-gray-500">Missing CRS</p>
          <p
            className={`text-lg font-semibold ${
              missingCRS > 0 ? "text-[color:var(--gsc-red)]" : "text-green-600"
            }`}
          >
            {missingCRS}
          </p>
        </div>
        <div className="border rounded p-2 text-center">
          <p className="text-xs text-gray-500">Missing Format</p>
          <p
            className={`text-lg font-semibold ${
              missingFormat > 0 ? "text-[color:var(--gsc-red)]" : "text-green-600"
            }`}
          >
            {missingFormat}
          </p>
        </div>
      </div>
    </div>
  );
}

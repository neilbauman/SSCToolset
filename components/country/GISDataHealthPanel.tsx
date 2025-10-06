"use client";

import React from "react";
import { Layers } from "lucide-react";
import type { GISLayer } from "@/types";

/**
 * Props
 * - layers: Array of GISLayer objects (each layer includes metadata like CRS, format, feature_count, etc.)
 */
interface Props {
  layers: GISLayer[];
}

/**
 * GISDataHealthPanel
 * Displays summary statistics and quick integrity checks for uploaded GIS layers.
 */
export default function GISDataHealthPanel({ layers }: Props) {
  const totalLayers = layers.length;
  const totalFeatures = layers.reduce((sum, l) => sum + (l.feature_count || 0), 0);
  const missingCRS = layers.filter((l) => !l.crs).length;
  const missingFormat = layers.filter((l) => !l.format).length;

  return (
    <section className="border rounded-lg shadow-sm bg-white p-4 mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Layers className="w-5 h-5 text-[color:var(--gsc-blue)]" />
          GIS Data Health
        </h2>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
        <div className="border rounded p-2 text-center bg-gray-50">
          <p className="text-xs text-gray-500">Total Layers</p>
          <p className="text-lg font-semibold text-gray-800">{totalLayers}</p>
        </div>

        <div className="border rounded p-2 text-center bg-gray-50">
          <p className="text-xs text-gray-500">Total Features</p>
          <p className="text-lg font-semibold text-gray-800">{totalFeatures}</p>
        </div>

        <div className="border rounded p-2 text-center bg-gray-50">
          <p className="text-xs text-gray-500">Missing CRS</p>
          <p
            className={`text-lg font-semibold ${
              missingCRS > 0 ? "text-[color:var(--gsc-red)]" : "text-green-600"
            }`}
          >
            {missingCRS}
          </p>
        </div>

        <div className="border rounded p-2 text-center bg-gray-50">
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

      <p className="mt-3 text-xs text-gray-500 text-center">
        Integrity indicators are based on metadata fields stored for each uploaded GIS layer.
      </p>
    </section>
  );
}

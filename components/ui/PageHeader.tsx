"use client";

import React from "react";
import { groupThemes, GroupKey } from "@/lib/theme";

type Props = {
  /** Main page title */
  title: string;
  /** Group key (used for theming: "dashboard", "about", "admin", "ssc-config", etc.) */
  group: GroupKey;
  /** Short description text shown under the title */
  description?: string;
  /** Optional tool name (e.g. "Primary Framework Editor") */
  tool?: string;
  /** Breadcrumbs element */
  breadcrumbs?: React.ReactNode;
};

export default function PageHeader({
  title,
  group,
  description,
  tool,
  breadcrumbs,
}: Props) {
  const theme = groupThemes[group];

  return (
    <div className="mb-6 px-6"> {/* <-- added px-6 for horizontal padding */}
      {/* Global title */}
      <h1 className="text-2xl font-bold" style={{ color: "#630710" }}>
        {title}
      </h1>

      {/* Group + Tool */}
      <div className="mt-1 flex items-center gap-2">
        <span className={`font-semibold ${theme.text}`}>{theme.label}</span>
        {tool && (
          <>
            <span className="text-gray-400">/</span>
            <span className="font-medium text-gray-700">{tool}</span>
          </>
        )}
      </div>

      {/* Description */}
      {description && (
        <p className="mt-1 text-sm text-gray-600">{description}</p>
      )}

      {/* Breadcrumbs framed with subtle spacing */}
      {breadcrumbs && (
        <div className="mt-4 mb-4 border-t border-b border-gray-200 py-2">
          {breadcrumbs}
        </div>
      )}
    </div>
  );
}

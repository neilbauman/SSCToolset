"use client";

import React, { useEffect } from "react";
import { groupThemes, GroupKey } from "@/lib/theme";

type Props = {
  /** Page title (e.g. "Primary Framework Editor") */
  title: string;
  /** Group key (used for theming: "dashboard", "about", "admin", "ssc-config", etc.) */
  group: GroupKey;
  /** Short description text shown under the page title */
  description?: string;
  /** Optional tool name (legacy support, deprecated) */
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

  // Warn if legacy `tool` is used
  useEffect(() => {
    if (tool) {
      console.warn(
        `[PageHeader] The "tool" prop is deprecated. Use "title" instead. (Received: "${tool}")`
      );
    }
  }, [tool]);

  return (
    <div className="mb-6">
      {/* Global Toolset Title */}
      <h1 className="text-3xl font-bold" style={{ color: "#630710" }}>
        Shelter and Settlements Severity Classification Toolset
      </h1>

      {/* Group Title */}
      <div className="mt-2">
        <span className={`text-lg font-semibold ${theme.text}`}>
          {theme.label}
        </span>
      </div>

      {/* Page Title */}
      <h2 className="mt-1 text-xl font-semibold text-gray-900">
        {title || tool /* fallback if tool was passed */}
      </h2>

      {/* Description */}
      {description && (
        <p className="mt-1 text-sm text-gray-600">{description}</p>
      )}

      {/* Divider */}
      <div className="my-4 border-t border-gray-200" />

      {/* Breadcrumbs */}
      {breadcrumbs && <div className="mb-4">{breadcrumbs}</div>}

      {/* Divider */}
      <div className="border-t border-gray-200" />
    </div>
  );
}

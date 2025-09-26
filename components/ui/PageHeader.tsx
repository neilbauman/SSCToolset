import React from "react";
import { groupThemes, GroupKey } from "@/lib/theme";

type Props = {
  group: GroupKey;        // Group key for theming
  tool?: string;          // Tool name (e.g. Primary Framework Editor)
  description?: string;   // Optional description
  breadcrumbs: React.ReactNode;
};

export default function PageHeader({
  group,
  tool,
  description,
  breadcrumbs,
}: Props) {
  const theme = groupThemes[group];

  return (
    <div className="mb-6">
      {/* App Title */}
      <h1
        className="text-3xl font-bold"
        style={{ color: "#630710", fontFamily: "Arial, sans-serif" }}
      >
        Shelter and Settlements Severity Classification Toolset
      </h1>

      {/* Group + Tool */}
      <div className={`mt-1 text-lg font-semibold ${theme.groupText}`}>
        {groupThemes[group] ? group.replace("-", " ") : group}
      </div>
      {tool && <div className="text-xl font-medium text-gray-800">{tool}</div>}

      {/* Description */}
      {description && <p className="mt-1 text-gray-600">{description}</p>}

      {/* Breadcrumbs framed */}
      <div className="my-3 border-t border-gray-200" />
      <div>{breadcrumbs}</div>
      <div className="my-3 border-t border-gray-200" />
    </div>
  );
}

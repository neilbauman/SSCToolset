import React from "react";
import { groupThemes, GroupKey } from "@/lib/theme";

type Props = {
  group: GroupKey;
  tool?: string;
  description?: string;
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
      <h1 className="gsc-page-title">
        Shelter and Settlements Severity Classification Toolset
      </h1>

      {/* Group + Tool */}
      <div className={`mt-1 text-lg font-semibold ${theme.groupText}`}>
        {theme.label}
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

import React from "react";

type Props = {
  title: string; // Page Title (e.g. Dashboard, SSC Config)
  group: string; // Group name (e.g. SSC Configuration)
  tool?: string; // Tool name (e.g. Primary Framework Editor)
  description?: string;
  breadcrumbs: React.ReactNode;
  groupColor?: string; // Tailwind color classes for theming group name
};

export default function PageHeader({
  title,
  group,
  tool,
  description,
  breadcrumbs,
  groupColor = "text-red-600", // default to GSC red
}: Props) {
  return (
    <div className="mb-6">
      {/* Title */}
      <h1
        className="text-3xl font-bold"
        style={{ color: "#630710", fontFamily: "Arial, sans-serif" }} // GSC branding
      >
        {title}
      </h1>

      {/* Group + Tool */}
      <div className={`mt-1 text-lg font-semibold ${groupColor}`}>{group}</div>
      {tool && <div className="text-xl font-medium text-gray-800">{tool}</div>}

      {/* Description */}
      {description && <p className="mt-1 text-gray-600">{description}</p>}

      {/* Breadcrumbs with framing lines */}
      <div className="my-3 border-t border-gray-200" />
      <div>{breadcrumbs}</div>
      <div className="my-3 border-t border-gray-200" />
    </div>
  );
}

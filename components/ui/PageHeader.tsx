import React from "react";

type Props = {
  title: string;
  subtitle?: string;
  group: string; // ✅ required
  breadcrumbs?: React.ReactNode;
};

export default function PageHeader({ title, subtitle, group, breadcrumbs }: Props) {
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{title}</h1>
          {subtitle && <p className="text-gray-600">{subtitle}</p>}
        </div>
        <div className="text-sm text-gray-500">{group}</div>
      </div>
      {breadcrumbs && <div className="mt-2">{breadcrumbs}</div>}
    </div>
  );
}

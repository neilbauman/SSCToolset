import type { ReactNode } from "react";

type Props = {
  title: string;
  group: string;
  subtitle?: string;
  breadcrumbs?: ReactNode;
  actions?: ReactNode;
};

export default function PageHeader({
  title,
  group,
  subtitle,
  breadcrumbs,
  actions,
}: Props) {
  return (
    <header className="mb-8 font-sans">
      {/* Global App Title */}
      <h1 className="text-2xl font-bold text-red-700 mb-2">
        Shelter and Settlement Severity Classification Toolset
      </h1>

      {/* Toolset Group */}
      <div className="text-lg font-semibold text-green-600 mb-1">
        {group}
      </div>

      {/* Page title + subtitle + optional actions */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-900">{title}</h2>
          {subtitle && (
            <p className="text-sm text-gray-600 mt-1">{subtitle}</p>
          )}
        </div>
        {actions && <div className="flex gap-2">{actions}</div>}
      </div>

      {/* Breadcrumbs */}
      {breadcrumbs && <div className="mt-3">{breadcrumbs}</div>}
    </header>
  );
}

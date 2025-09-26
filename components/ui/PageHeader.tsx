import type { ReactNode } from "react";

type Props = {
  title: string;               // The page's main title
  group: string;               // Toolset group (e.g. "SSC Configuration")
  subtitle?: string;           // Page description
  breadcrumbs?: ReactNode;     // Breadcrumbs component
  actions?: ReactNode;         // Optional buttons (Publish, Add, etc.)
};

export default function PageHeader({
  title,
  group,
  subtitle,
  breadcrumbs,
  actions,
}: Props) {
  return (
    <header className="mb-8">
      {/* Big global app title */}
      <h1 className="text-2xl font-bold text-red-700 mb-2">
        Shelter and Settlement Severity Classification Toolset
      </h1>

      {/* Toolset group */}
      <div className="text-lg font-semibold text-brand-700 mb-1">
        {group}
      </div>

      {/* Page title + description */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
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

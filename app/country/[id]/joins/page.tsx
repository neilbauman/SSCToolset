"use client";

import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import type { CountryParams } from "@/app/country/types";

export default function ManageJoinsPage({ params }: any) {
  const { id } = params as CountryParams;

  const headerProps = {
    title: `${id} – Manage Dataset Joins`,
    group: "country-config" as const,
    description: "Reconcile mismatches between Admin Units, Population, and GIS datasets.",
    breadcrumbs: (
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Country Configuration", href: "/country" },
          { label: id, href: `/country/${id}` },
          { label: "Manage Joins" },
        ]}
      />
    ),
  };

  return (
    <SidebarLayout headerProps={headerProps}>
      <div className="border rounded-lg p-6 shadow-sm bg-gray-50">
        <h2 className="text-xl font-semibold mb-4">Manage Joins</h2>
        <p className="text-gray-700 mb-4">
          This page will allow you to inspect and resolve mismatches between
          <strong> Admin Units</strong>, <strong>Population</strong>, and
          <strong> GIS</strong> datasets.
        </p>
        <p className="italic text-gray-500">
          🚧 Coming soon: reconciliation tools, unmatched record reports, and guided
          fixing workflows.
        </p>
      </div>
    </SidebarLayout>
  );
}

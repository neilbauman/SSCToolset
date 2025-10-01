"use client";

import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import Link from "next/link";
import { Map, Users, Database } from "lucide-react";

export default function CountryPage({ params }: any) {
  const countryIso = params.id;

  const headerProps = {
    title: `Country Dashboard: ${countryIso}`,
    group: "country-config" as const,
    description:
      "Overview of baseline datasets and configuration for this country.",
    breadcrumbs: (
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Country Configuration", href: "/country" },
          { label: countryIso },
        ]}
      />
    ),
  };

  return (
    <SidebarLayout headerProps={headerProps}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Admin Units */}
        <Link
          href={`/country/${countryIso}/admins`}
          className="border rounded-lg p-4 shadow-sm hover:shadow-md transition flex items-center gap-3 bg-white"
        >
          <Database className="w-6 h-6 text-[color:var(--gsc-green)]" />
          <div>
            <h3 className="font-semibold text-lg">Places / Admin Units</h3>
            <p className="text-sm text-gray-600">
              Upload and manage administrative boundaries.
            </p>
          </div>
        </Link>

        {/* Population & Demographics */}
        <Link
          href={`/country/${countryIso}/population`}
          className="border rounded-lg p-4 shadow-sm hover:shadow-md transition flex items-center gap-3 bg-white"
        >
          <Users className="w-6 h-6 text-[color:var(--gsc-blue)]" />
          <div>
            <h3 className="font-semibold text-lg">
              Population &amp; Demographics
            </h3>
            <p className="text-sm text-gray-600">
              Upload and manage population datasets by admin unit.
            </p>
          </div>
        </Link>

        {/* GIS & Mapping (placeholder) */}
        <div className="border rounded-lg p-4 shadow-sm bg-gray-50 flex items-center gap-3">
          <Map className="w-6 h-6 text-[color:var(--gsc-orange)]" />
          <div>
            <h3 className="font-semibold text-lg">GIS &amp; Mapping</h3>
            <p className="text-sm text-gray-600">
              Coming soon: Upload shapefiles and visualize datasets.
            </p>
          </div>
        </div>
      </div>
    </SidebarLayout>
  );
}

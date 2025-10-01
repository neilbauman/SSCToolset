"use client";

import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import DatasetHealth from "@/components/country/DatasetHealth";
import { Users } from "lucide-react";

export default function PopulationPage(props: any) {
  const countryIso = props.params?.id as string;

  const headerProps = {
    title: `${countryIso} – Population`,
    group: "country-config" as const,
    description: "Manage census and demographic data for this country.",
    breadcrumbs: (
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Country Configuration", href: "/country" },
          { label: countryIso, href: `/country/${countryIso}` },
          { label: "Population" },
        ]}
      />
    ),
  };

  return (
    <SidebarLayout headerProps={headerProps}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="border rounded-lg p-4 shadow-sm">
          <h2 className="text-lg font-semibold flex items-center gap-2 mb-3">
            <Users className="w-5 h-5 text-blue-600" /> Population Summary
          </h2>
          <p className="text-sm text-gray-600">🚧 Placeholder: population stats will appear here.</p>
        </div>

        <DatasetHealth allHavePcodes={false} missingPcodes={0} hasGISLink={false} hasPopulation={false} totalUnits={0} />
      </div>

      <div className="border rounded-lg p-4 shadow-sm">
        <p className="text-sm text-gray-600">🚧 Data view placeholder (tables/visualizations).</p>
      </div>
    </SidebarLayout>
  );
}

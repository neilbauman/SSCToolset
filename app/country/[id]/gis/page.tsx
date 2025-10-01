"use client";

import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import DatasetHealth from "@/components/country/DatasetHealth";
import { Map } from "lucide-react";

export default function GISPage(props: any) {
  const countryIso = props.params?.id as string;

  const headerProps = {
    title: `${countryIso} – GIS / Mapping`,
    group: "country-config" as const,
    description: "Manage and validate GIS datasets for this country.",
    breadcrumbs: (
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Country Configuration", href: "/country" },
          { label: countryIso, href: `/country/${countryIso}` },
          { label: "GIS / Mapping" },
        ]}
      />
    ),
  };

  return (
    <SidebarLayout headerProps={headerProps}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="border rounded-lg p-4 shadow-sm">
          <h2 className="text-lg font-semibold flex items-center gap-2 mb-3">
            <Map className="w-5 h-5 text-blue-600" /> GIS Summary
          </h2>
          <p className="text-sm text-gray-600">🚧 Placeholder: GIS dataset summary will appear here.</p>
        </div>

        <DatasetHealth allHavePcodes={false} missingPcodes={0} hasGISLink={false} hasPopulation={false} totalUnits={0} />
      </div>

      <div className="border rounded-lg p-4 shadow-sm">
        <p className="text-sm text-gray-600">🚧 Data view placeholder (map preview, shape validation).</p>
      </div>
    </SidebarLayout>
  );
}

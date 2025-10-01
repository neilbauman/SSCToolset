"use client";

import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";

export default function GisPage({ params }: any) {
  const id = params.id;
  const headerProps = {
    title: "GIS / Mapping",
    group: "country-config" as const,
    description: "Manage geospatial data and mapping layers for this country.",
    breadcrumbs: (
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Country Configuration", href: "/country" },
          { label: id, href: `/country/${id}` },
          { label: "GIS / Mapping" },
        ]}
      />
    ),
  };
  return (
    <SidebarLayout headerProps={headerProps}>
      <p className="text-gray-600">🚧 GIS detail page (to be built).</p>
    </SidebarLayout>
  );
}

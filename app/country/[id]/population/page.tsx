"use client";

import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";

export default function PopulationPage({ params }: any) {
  const id = params.id;
  const headerProps = {
    title: "Population / Demographics",
    group: "country-config" as const,
    description: "Manage population and demographic datasets for this country.",
    breadcrumbs: (
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Country Configuration", href: "/country" },
          { label: id, href: `/country/${id}` },
          { label: "Population" },
        ]}
      />
    ),
  };
  return (
    <SidebarLayout headerProps={headerProps}>
      <p className="text-gray-600">🚧 Population detail page (to be built).</p>
    </SidebarLayout>
  );
}

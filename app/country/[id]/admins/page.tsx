"use client";

import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";

export default function AdminsPage({ params }: any) {
  const id = params.id;
  const headerProps = {
    title: "Admin Units",
    group: "country-config" as const,
    description: "Manage administrative boundaries for this country.",
    breadcrumbs: (
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Country Configuration", href: "/country" },
          { label: id, href: `/country/${id}` },
          { label: "Admin Units" },
        ]}
      />
    ),
  };
  return (
    <SidebarLayout headerProps={headerProps}>
      <p className="text-gray-600">🚧 Admin Units detail page (to be built).</p>
    </SidebarLayout>
  );
}

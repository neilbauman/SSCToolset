"use client";

import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import CataloguePage from "@/components/configuration/framework-catalogue/CataloguePage";

export default function FrameworkCataloguePage() {
  const headerProps = {
    title: "Framework Catalogue",
    group: "ssc-config" as const,
    description:
      "Manage the master list of Pillars, Themes, and Subthemes used to build framework versions.",
    breadcrumbs: (
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Configuration", href: "/configuration" },
          { label: "Framework Catalogue" },
        ]}
      />
    ),
  };

  return (
    <SidebarLayout headerProps={headerProps}>
      <CataloguePage />
    </SidebarLayout>
  );
}

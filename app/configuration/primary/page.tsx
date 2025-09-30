import Breadcrumbs from "@/components/ui/Breadcrumbs";
import SidebarLayout from "@/components/layout/SidebarLayout";
import PrimaryFrameworkClient from "@/components/framework/PrimaryFrameworkClient";

export const dynamic = "force-dynamic";

export default function PrimaryFrameworkPage() {
  const headerProps = {
    title: "Primary Framework Editor",
    group: "ssc-config" as const,
    description: "Manage framework versions created from the SSC catalogue.",
    breadcrumbs: (
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "SSC Configuration", href: "/configuration" },
          { label: "Primary Framework Editor" },
        ]}
      />
    ),
  };

  return (
    <SidebarLayout headerProps={headerProps}>
      <PrimaryFrameworkClient />
    </SidebarLayout>
  );
}

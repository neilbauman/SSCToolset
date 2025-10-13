import Breadcrumbs from "@/components/ui/Breadcrumbs";
import SidebarLayout from "@/components/layout/SidebarLayout";
import IndicatorFrameworkLinker from "@/components/indicators/IndicatorFrameworkLinker";

export const dynamic = "force-dynamic";

export default function IndicatorFrameworkLinkerPage() {
  const headerProps = {
    title: "Indicator–Framework Linking",
    group: "ssc-config" as const,
    description: "Associate indicators with SSC Pillars, Themes, and Subthemes.",
    breadcrumbs: (
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "SSC Configuration", href: "/configuration" },
          { label: "Indicator–Framework Linking" },
        ]}
      />
    ),
  };

  return (
    <SidebarLayout headerProps={headerProps}>
      <IndicatorFrameworkLinker />
    </SidebarLayout>
  );
}

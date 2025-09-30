import Breadcrumbs from "@/components/ui/Breadcrumbs";
import ToolCard from "@/components/ui/ToolCard";
import SidebarLayout from "@/components/layout/SidebarLayout";
import { Layers, Settings, BookOpen, BarChart } from "lucide-react";
import { groupThemes } from "@/lib/theme";

export const dynamic = "force-dynamic";

const tools = [
  {
    id: "primary-framework",
    title: "Primary Framework Editor",
    description: "Create and manage framework versions based on the SSC catalogue.",
    href: "/configuration/primary",
    icon: Layers,
  },
  {
    id: "comprehensive-framework",
    title: "Comprehensive Framework Editor",
    description: "Future: Configure and manage a broader SSC framework.",
    href: "#",
    icon: Settings,
  },
  {
    id: "pillar-catalogue",
    title: "Pillar Catalogue Configuration",
    description: "Future: Manage SSC pillars, themes, and subthemes catalogue.",
    href: "#",
    icon: BookOpen,
  },
  {
    id: "indicator-library",
    title: "Indicator Library",
    description: "Future: Define and manage indicators for SSC scoring.",
    href: "#",
    icon: BarChart,
  },
];

export default function ConfigurationPage() {
  const headerProps = {
    title: "SSC Configuration",
    group: "ssc-config" as const,
    description: "Configure the SSC framework, catalogue, and indicators.",
    breadcrumbs: (
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "SSC Configuration" },
        ]}
      />
    ),
  };

  return (
    <SidebarLayout headerProps={headerProps}>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {tools.map((t) => {
          const theme = groupThemes["ssc-config"];
          return (
            <ToolCard
              key={t.id}
              href={t.href}
              icon={t.icon}
              title={t.title}
              description={t.description}
              border={theme.border}
              text={theme.text}
              hover={theme.hover}
            />
          );
        })}
      </div>
    </SidebarLayout>
  );
}

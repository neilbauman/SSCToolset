import Breadcrumbs from "@/components/ui/Breadcrumbs";
import ToolCard from "@/components/ui/ToolCard";
import { groupThemes } from "@/lib/theme";
import { Info, Settings, Layers, Globe, BarChart } from "lucide-react";
import SidebarLayout from "@/components/layout/SidebarLayout";

export const dynamic = "force-dynamic";

const groups = [
  {
    id: "about",
    title: "About",
    description: "Information about the SSC Toolset.",
    href: "/about",
    icon: Info,
  },
  {
    id: "admin",
    title: "Admin",
    description: "User management and permissions (future).",
    href: "/admin",
    icon: Settings,
  },
  {
    id: "ssc-config",
    title: "SSC Configuration",
    description: "Configure the SSC catalogue, frameworks, and indicators.",
    href: "/configuration",
    icon: Layers,
  },
  {
    id: "country-config",
    title: "Country Configuration",
    description:
      "Manage baseline data: mapping boundaries, population, PCodes, place names.",
    href: "/country",
    icon: Globe,
  },
  {
    id: "ssc-instances",
    title: "SSC Instances",
    description:
      "Upload and score response datasets with the SSC classification system.",
    href: "/instances",
    icon: BarChart,
  },
];

export default function DashboardPage() {
  const headerProps = {
    title: "Dashboard",
    group: "dashboard" as const,
    description: "Global Shelter Cluster – Shelter Severity Classification Toolset",
    breadcrumbs: <Breadcrumbs items={[{ label: "Dashboard" }]} />,
  };

  return (
    <SidebarLayout headerProps={headerProps}>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {groups.map((g) => {
          const theme = groupThemes[g.id as keyof typeof groupThemes];
          return (
            <ToolCard
              key={g.id}
              href={g.href}
              icon={g.icon}
              title={g.title}
              description={g.description}
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

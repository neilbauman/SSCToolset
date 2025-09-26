import PageHeader from "@/components/ui/PageHeader";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import ToolCard from "@/components/ui/ToolCard";
import { groupThemes } from "@/lib/theme";
import { Layers, BookOpen, Settings, Library } from "lucide-react";

export const dynamic = "force-dynamic";

const tools = [
  {
    id: "primary-framework",
    title: "Primary Framework Editor",
    description:
      "Create and manage framework versions based on the SSC catalogue.",
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
    icon: Library,
  },
];

export default function SSCConfigPage() {
  const theme = groupThemes["ssc-config"];

  return (
    <div>
      <PageHeader
        group="ssc-config"
        description="Configure the SSC framework, catalogue, and indicators."
        breadcrumbs={
          <Breadcrumbs
            items={[
              { label: "Dashboard", href: "/dashboard" },
              { label: "SSC Configuration" },
            ]}
          />
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mt-6">
        {tools.map((tool) => (
          <ToolCard
            key={tool.id}
            href={tool.href}
            icon={tool.icon}
            title={tool.title}
            description={tool.description}
            border={theme.border}
            text={theme.text}
            hover={theme.hover}
          />
        ))}
      </div>
    </div>
  );
}

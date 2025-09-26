import PageHeader from "@/components/ui/PageHeader";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import Link from "next/link";
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
  return (
    <div>
      <PageHeader
        group="ssc-config"  // ✅ valid GroupKey
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
        {tools.map((tool) => {
          const Icon = tool.icon;
          return (
            <Link
              key={tool.id}
              href={tool.href}
              className="rounded-lg border border-red-600 bg-white shadow-sm p-4 transition-colors hover:bg-red-50 text-red-600"
            >
              <div className="flex items-center gap-3">
                <Icon className="w-5 h-5" />
                <h2 className="font-semibold">{tool.title}</h2>
              </div>
              <p className="mt-2 text-sm text-gray-600">{tool.description}</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

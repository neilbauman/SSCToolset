import PageHeader from "@/components/ui/PageHeader";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import Link from "next/link";
import { Info, Settings, Layers, Globe, BarChart } from "lucide-react";
import { groupThemes } from "@/lib/theme";

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
  return (
    <div>
      <PageHeader
        group="dashboard"   // ✅ lowercase GroupKey
        description="Global Shelter Cluster – Shelter Severity Classification Toolset"
        breadcrumbs={<Breadcrumbs items={[{ label: "Dashboard" }]} />}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mt-6">
        {groups.map((g) => {
          const Icon = g.icon;
          const theme = groupThemes[g.id as keyof typeof groupThemes];
          return (
            <Link
              key={g.id}
              href={g.href}
              className={`gsc-card p-6 gsc-card-hover bg-white ${theme.border} ${theme.text} ${theme.hover}`}
            >
              <div className="flex items-center gap-3">
                <Icon className="w-6 h-6" />
                <h2 className="text-lg font-semibold">{g.title}</h2>
              </div>
              <p className="mt-2 text-sm text-gray-600">{g.description}</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

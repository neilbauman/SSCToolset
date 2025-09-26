import PageHeader from "@/components/ui/PageHeader";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import Link from "next/link";
import { Info, Settings, Layers, Globe, BarChart } from "lucide-react";

export const dynamic = "force-dynamic";

const groups = [
  {
    id: "about",
    title: "About",
    description: "Information about the SSC Toolset.",
    href: "/about",
    color: "bg-blue-600 hover:bg-blue-700",
    icon: Info,
  },
  {
    id: "admin",
    title: "Admin",
    description: "User management and permissions (future).",
    href: "/admin",
    color: "bg-gray-700 hover:bg-gray-800",
    icon: Settings,
  },
  {
    id: "ssc-config",
    title: "SSC Configuration",
    description: "Configure the SSC catalogue and framework versions.",
    href: "/configuration/primary",
    color: "bg-red-600 hover:bg-red-700", // GSC primary red
    icon: Layers,
  },
  {
    id: "country-config",
    title: "Country Configuration",
    description:
      "Manage baseline data: mapping boundaries, population, PCodes, place names.",
    href: "/country",
    color: "bg-green-600 hover:bg-green-700",
    icon: Globe,
  },
  {
    id: "ssc-instances",
    title: "SSC Instances",
    description:
      "Upload and score response datasets with the SSC classification system.",
    href: "/instances",
    color: "bg-orange-500 hover:bg-orange-600",
    icon: BarChart,
  },
];

export default function DashboardPage() {
  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="Global Shelter Cluster – Shelter Severity Classification Toolset"
        group="Dashboard"
        breadcrumbs={<Breadcrumbs items={[{ label: "Dashboard" }]} />}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mt-6">
        {groups.map((g) => {
          const Icon = g.icon;
          return (
            <Link
              key={g.id}
              href={g.href}
              className={`rounded-lg shadow-md p-6 text-white transition-colors ${g.color}`}
            >
              <div className="flex items-center gap-3">
                <Icon className="w-6 h-6" />
                <h2 className="text-lg font-semibold">{g.title}</h2>
              </div>
              <p className="mt-2 text-sm opacity-90">{g.description}</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

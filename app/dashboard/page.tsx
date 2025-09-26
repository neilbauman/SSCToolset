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
    href: "/about", // About is standalone
    color: "blue",
    icon: Info,
  },
  {
    id: "admin",
    title: "Admin",
    description: "User management and permissions (future).",
    href: "/admin", // Admin is standalone
    color: "gray",
    icon: Settings,
  },
  {
    id: "ssc-config",
    title: "SSC Configuration",
    description: "Configure the SSC catalogue, frameworks, and indicators.",
    href: "/configuration", // ✅ Group hub page
    color: "red", // GSC primary
    icon: Layers,
  },
  {
    id: "country-config",
    title: "Country Configuration",
    description:
      "Manage baseline data: mapping boundaries, population, PCodes, place names.",
    href: "/country", // ✅ Group hub page (future)
    color: "green",
    icon: Globe,
  },
  {
    id: "ssc-instances",
    title: "SSC Instances",
    description:
      "Upload and score response datasets with the SSC classification system.",
    href: "/instances", // ✅ Group hub page (future)
    color: "orange",
    icon: BarChart,
  },
];

// ✅ Explicit Tailwind classes so purge keeps them
const colorClasses: Record<string, string> = {
  blue: "border-blue-600 text-blue-600 hover:bg-blue-50",
  gray: "border-gray-600 text-gray-600 hover:bg-gray-50",
  red: "border-red-600 text-red-600 hover:bg-red-50",
  green: "border-green-600 text-green-600 hover:bg-green-50",
  orange: "border-orange-500 text-orange-500 hover:bg-orange-50",
};

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
          const theme = colorClasses[g.color];
          return (
            <Link
              key={g.id}
              href={g.href}
              className={`rounded-lg border shadow-sm p-6 transition-colors bg-white ${theme}`}
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

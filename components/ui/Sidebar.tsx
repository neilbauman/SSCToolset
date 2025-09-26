import Link from "next/link";
import { Layers, Globe, BarChart, Info, Settings } from "lucide-react";
import { usePathname } from "next/navigation";

const groups = [
  { id: "about", label: "About", href: "/about", icon: Info, color: "text-blue-600" },
  { id: "admin", label: "Admin", href: "/admin", icon: Settings, color: "text-gray-600" },
  { id: "ssc-config", label: "SSC Configuration", href: "/configuration", icon: Layers, color: "text-red-600" },
  { id: "country", label: "Country Configuration", href: "/country", icon: Globe, color: "text-green-600" },
  { id: "instances", label: "SSC Instances", href: "/instances", icon: BarChart, color: "text-orange-500" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:block w-64 border-r border-gray-200 bg-white">
      <div className="p-4 font-bold text-lg" style={{ color: "#630710" }}>
        SSC Toolset
      </div>
      <nav className="space-y-1">
        {groups.map((g) => {
          const Icon = g.icon;
          const active = pathname.startsWith(g.href);
          return (
            <Link
              key={g.id}
              href={g.href}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors ${
                active ? `${g.color} bg-gray-50` : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              <Icon className="w-4 h-4" />
              {g.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

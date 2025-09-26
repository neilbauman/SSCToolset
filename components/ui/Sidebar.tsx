"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Info, Settings, Layers, Globe, BarChart } from "lucide-react";
import { groupThemes } from "@/lib/theme";

const groups = [
  { id: "about", href: "/about", icon: Info },
  { id: "admin", href: "/admin", icon: Settings },
  { id: "ssc-config", href: "/configuration", icon: Layers },
  { id: "country-config", href: "/country", icon: Globe },
  { id: "ssc-instances", href: "/instances", icon: BarChart },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <nav className="px-4 py-6 space-y-2">
      <h2 className="gsc-page-title text-xl mb-4">SSC Toolset</h2>
      {groups.map((g) => {
        const Icon = g.icon;
        const theme = groupThemes[g.id as keyof typeof groupThemes];
        const isActive = pathname.startsWith(g.href);
        return (
          <Link
            key={g.id}
            href={g.href}
            className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors ${
              isActive ? `${theme.text} font-semibold` : "text-gray-700"
            } hover:bg-gray-100`}
          >
            <Icon className="w-4 h-4" />
            {theme.label}
          </Link>
        );
      })}
    </nav>
  );
}

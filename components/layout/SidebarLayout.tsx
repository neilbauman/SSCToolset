"use client";

import { useState } from "react";
import Link from "next/link";
import PageHeader from "@/components/ui/PageHeader";
import type { GroupKey } from "@/lib/theme";
import {
  Info,
  Settings,
  Layers,
  Globe,
  BarChart,
  Menu,
  X,
  Home,
} from "lucide-react";

const navItems = [
  {
    id: "dashboard",
    label: "Dashboard",
    href: "/dashboard",
    icon: <Home size={18} />,
  },
  {
    id: "about",
    label: "About",
    href: "/about",
    icon: <Info size={18} />,
  },
  {
    id: "admin",
    label: "Admin",
    href: "/admin",
    icon: <Settings size={18} />,
  },
  {
    id: "ssc-config",
    label: "SSC Configuration",
    href: "/configuration",
    icon: <Layers size={18} />,
  },
  {
    id: "country-config",
    label: "Country Configuration",
    href: "/country",
    icon: <Globe size={18} />,
  },
  {
    id: "ssc-instances",
    label: "SSC Instances",
    href: "/instances",
    icon: <BarChart size={18} />,
  },
];

export default function SidebarLayout({
  children,
  headerProps,
}: {
  children: React.ReactNode;
  headerProps: {
    title: string;
    group: GroupKey;
    description?: string;
    tool?: string;
    breadcrumbs?: React.ReactNode;
  };
}) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex flex-col h-screen">
      {/* Fixed PageHeader */}
      <div className="flex-none border-b shadow-sm bg-white z-10">
        <PageHeader {...headerProps} />
      </div>

      {/* Main area: sidebar + content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div
          className={`bg-gray-100 border-r transition-all duration-300 ${
            collapsed ? "w-16" : "w-64"
          }`}
        >
          {/* Sidebar header with collapse toggle */}
          <div className="flex items-center justify-between px-4 py-3 border-b">
            {!collapsed && <span className="font-bold text-gray-700">SSC Toolset</span>}
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="p-1 hover:bg-gray-200 rounded"
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed ? <Menu size={18} /> : <X size={18} />}
            </button>
          </div>

          {/* Navigation */}
          <nav className="mt-4 space-y-1">
            {navItems.map((item) => (
              <SidebarLink
                key={item.id}
                href={item.href}
                icon={item.icon}
                label={item.label}
                collapsed={collapsed}
              />
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50">{children}</div>
      </div>
    </div>
  );
}

function SidebarLink({
  href,
  icon,
  label,
  collapsed,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  collapsed: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-200 rounded transition-colors ${
        collapsed ? "justify-center" : "gap-2"
      }`}
      title={collapsed ? label : undefined}
    >
      {icon}
      {!collapsed && <span>{label}</span>}
    </Link>
  );
}

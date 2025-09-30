"use client";

import { useState } from "react";
import { Menu, X, Home, Settings } from "lucide-react";
import Link from "next/link";
import PageHeader from "@/components/ui/PageHeader";
import type { GroupKey } from "@/lib/theme";

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
  const [open, setOpen] = useState(true);

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
          className={`bg-gray-800 text-white transition-all duration-300 border-r ${
            collapsed ? "w-16" : "w-64"
          }`}
        >
          {/* Sidebar header with collapse toggle */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
            {!collapsed && <span className="font-bold">SSC Toolset</span>}
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="p-1 hover:bg-gray-700 rounded"
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed ? <Menu size={18} /> : <X size={18} />}
            </button>
          </div>

          {/* Navigation */}
          <nav className="mt-4 space-y-2">
            <SidebarLink
              href="/dashboard"
              icon={<Home size={18} />}
              label="Dashboard"
              collapsed={collapsed}
            />
            <SidebarLink
              href="/configuration"
              icon={<Settings size={18} />}
              label="Configuration"
              collapsed={collapsed}
            />
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
      className={`flex items-center px-4 py-2 hover:bg-gray-700 rounded transition-colors ${
        collapsed ? "justify-center" : "gap-2"
      }`}
      title={collapsed ? label : undefined}
    >
      {icon}
      {!collapsed && <span>{label}</span>}
    </Link>
  );
}

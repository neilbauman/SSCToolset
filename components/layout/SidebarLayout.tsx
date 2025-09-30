"use client";

import { useState } from "react";
import { Menu, X, Home, Settings } from "lucide-react";
import Link from "next/link";

export default function SidebarLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false); // collapsed mode (desktop)
  const [open, setOpen] = useState(true); // open/closed (mobile)

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-30 bg-gray-800 text-white transform transition-all duration-300 lg:static lg:translate-x-0
          ${open ? (collapsed ? "translate-x-0 w-16" : "translate-x-0 w-64") : "-translate-x-full w-64"}`}
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
          {!collapsed && <span className="font-bold">SSC Toolset</span>}
          <div className="flex items-center gap-2">
            {/* Collapse toggle (desktop only) */}
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="hidden lg:block p-1 hover:bg-gray-700 rounded"
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed ? <Menu size={18} /> : <X size={18} />}
            </button>
            {/* Mobile close button */}
            <button
              onClick={() => setOpen(false)}
              className="lg:hidden p-1 hover:bg-gray-700 rounded"
            >
              <X size={18} />
            </button>
          </div>
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
          {/* Add more links */}
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top bar with toggle (mobile only) */}
        <div className="lg:hidden flex items-center p-2 border-b">
          <button onClick={() => setOpen(true)}>
            <Menu size={20} />
          </button>
          <span className="ml-2 font-semibold">SSC Toolset</span>
        </div>

        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}

/** Reusable nav link that adapts to collapsed mode */
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

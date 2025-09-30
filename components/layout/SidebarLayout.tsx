"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";
import Link from "next/link";

export default function SidebarLayout({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(true);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-30 bg-gray-800 text-white transform transition-transform duration-300 lg:static lg:translate-x-0 ${
          open ? "translate-x-0 w-64" : "-translate-x-full w-64"
        }`}
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
          <span className="font-bold">SSC Toolset</span>
          <button
            onClick={() => setOpen(false)}
            className="lg:hidden p-1 hover:bg-gray-700 rounded"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="mt-4 space-y-2">
          <Link
            href="/dashboard"
            className="block px-4 py-2 hover:bg-gray-700 rounded"
          >
            Dashboard
          </Link>
          <Link
            href="/configuration"
            className="block px-4 py-2 hover:bg-gray-700 rounded"
          >
            Configuration
          </Link>
          {/* Add more links as needed */}
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

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV } from "@/lib/ui/nav";

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex-shrink-0">
      <div className="p-4 text-lg font-semibold text-red-700">
        Shelter and Settlement Severity Classification Toolset
      </div>
      <nav className="px-2 pb-6 space-y-6">
        {NAV.map((group) => (
          <div key={group.label}>
            <div className="px-2 text-xs uppercase tracking-wide text-gray-500 mb-2">
              {group.label}
            </div>
            <ul className="space-y-1 list-none">
              {group.items.map((item) => {
                const active = pathname === item.href;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`block px-3 py-2 rounded-md text-sm ${
                        active
                          ? "bg-brand-50 text-brand-800 font-medium"
                          : "text-gray-700 hover:bg-gray-100"
                      }`}
                    >
                      {item.title}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}

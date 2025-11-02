"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { Plus, RefreshCw } from "lucide-react";

type InstanceRow = {
  id: string;
  country_iso: string;
  title: string;
  description: string | null;
  type: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export default function InstancesIndexPage() {
  const [rows, setRows] = useState<InstanceRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("instances")
      .select("id, country_iso, title, description, type, created_at, updated_at")
      .order("created_at", { ascending: false });
    if (!error && data) setRows(data as InstanceRow[]);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const headerProps = {
    title: "Instances",
    // Use a valid GroupKey to satisfy SidebarLayout typing (reusing country-config group styling)
    group: "country-config" as const,
    description:
      "Create and manage analytical instances (baseline, forecast, nowcast) for each country.",
    breadcrumbs: (
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Instances" },
        ]}
      />
    ),
    right: (
      <div className="flex items-center gap-2">
        <button
          onClick={() => load()}
          className="px-3 py-1.5 rounded bg-gray-100 hover:bg-gray-200 text-sm flex items-center gap-1"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </button>
        <Link
          href="/instances/new"
          className="px-3 py-1.5 rounded bg-[color:var(--gsc-green)] text-white text-sm flex items-center gap-1"
        >
          <Plus className="w-4 h-4" />
          New Instance
        </Link>
      </div>
    ),
  };

  return (
    <SidebarLayout headerProps={headerProps}>
      <div className="border rounded-lg overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="px-4 py-2 w-[34%]">Title</th>
              <th className="px-4 py-2 w-[12%]">Country</th>
              <th className="px-4 py-2 w-[14%]">Type</th>
              <th className="px-4 py-2 w-[20%]">Created</th>
              <th className="px-4 py-2 w-[20%]">Updated</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-gray-500">
                  Loading…
                </td>
              </tr>
            )}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-gray-500 italic">
                  No instances yet. Click “New Instance” to create one.
                </td>
              </tr>
            )}
            {!loading &&
              rows.map((r) => (
                <tr key={r.id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-2">
                    <Link
                      href={`/instances/${r.id}`}
                      className="text-blue-700 hover:underline"
                    >
                      {r.title || "Untitled"}
                    </Link>
                    {r.description && (
                      <div className="text-xs text-gray-500 line-clamp-1">
                        {r.description}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-2">{r.country_iso}</td>
                  <td className="px-4 py-2">{r.type || "—"}</td>
                  <td className="px-4 py-2">
                    {r.created_at ? new Date(r.created_at).toLocaleString() : "—"}
                  </td>
                  <td className="px-4 py-2">
                    {r.updated_at ? new Date(r.updated_at).toLocaleString() : "—"}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </SidebarLayout>
  );
}

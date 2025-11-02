"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { Plus, RefreshCw, Trash2, BarChart3 } from "lucide-react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";

type Instance = {
  id: string;
  country_iso: string;
  title: string;
  description: string | null;
  type: string;
  created_at: string;
};

export default function InstancesPage() {
  const [instances, setInstances] = useState<Instance[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchInstances = async () => {
    const { data, error } = await supabase.from("instances_list").select("*").order("created_at", { ascending: false });
    if (!error && data) setInstances(data);
  };

  const deleteInstance = async (id: string) => {
    setLoading(true);
    await supabase.from("instances_list").delete().eq("id", id);
    await fetchInstances();
    setLoading(false);
  };

  useEffect(() => {
    fetchInstances();
  }, []);

  const headerProps = {
    title: instance ? `Instance: ${instance.title}` : "Instance",
    group: "country-config" as const, // ✅ FIXED
    description: "Overview of this SSC instance.",
    breadcrumbs: (
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Country Configuration", href: "/country" },
          { label: instance?.country_iso?.toUpperCase() || "Country" },
          { label: "Instances" },
          { label: instance?.title || "Instance" },
        ]}
      />
    ),
  };

  return (
    <SidebarLayout headerProps={headerProps}>
      <div className="flex justify-between items-center mb-4">
        <button
          onClick={fetchInstances}
          className="bg-gray-100 text-gray-800 rounded px-3 py-1.5 flex items-center gap-1 hover:bg-gray-200"
        >
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      <div className="overflow-x-auto border rounded-lg shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 text-left">
            <tr>
              <th className="px-4 py-2 w-[35%]">Title</th>
              <th className="px-4 py-2 w-[15%]">Type</th>
              <th className="px-4 py-2 w-[15%]">Country</th>
              <th className="px-4 py-2 w-[25%]">Description</th>
              <th className="px-4 py-2 w-[10%] text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {instances.map((inst) => (
              <tr key={inst.id} className="border-t hover:bg-gray-50">
                <td className="px-4 py-2">
                  <Link
                    href={`/country/${inst.country_iso}/instances/${inst.id}`}
                    className="text-blue-700 hover:underline"
                  >
                    {inst.title}
                  </Link>
                </td>
                <td className="px-4 py-2">{inst.type}</td>
                <td className="px-4 py-2">{inst.country_iso}</td>
                <td className="px-4 py-2">{inst.description || "—"}</td>
                <td className="px-4 py-2 flex justify-end gap-2">
                  <Link
                    href={`/country/${inst.country_iso}/instances/${inst.id}`}
                    className="p-1.5 rounded hover:bg-gray-100"
                    title="View Instance"
                  >
                    <BarChart3 className="w-4 h-4 text-gray-600" />
                  </Link>
                  <button
                    className="p-1.5 rounded hover:bg-red-50"
                    onClick={() => deleteInstance(inst.id)}
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </button>
                </td>
              </tr>
            ))}
            {instances.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-gray-500 italic">
                  No instances found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </SidebarLayout>
  );
}

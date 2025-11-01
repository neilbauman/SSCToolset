"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { Plus, Layers, RefreshCw, Clock } from "lucide-react";

type Instance = {
  id: string;
  country_iso: string;
  title: string;
  description: string | null;
  type: "baseline" | "nowcast" | "forecast";
  created_at: string;
  updated_at: string;
};

export default function CountryInstancesPage() {
  const { id: country_iso } = useParams<{ id: string }>();
  const [instances, setInstances] = useState<Instance[]>([]);
  const [openAdd, setOpenAdd] = useState(false);
  const [newInstance, setNewInstance] = useState<Partial<Instance>>({
    type: "baseline",
  });
  const [loading, setLoading] = useState(false);

  async function fetchInstances() {
    const { data, error } = await supabase
      .from("instances_list")
      .select("*")
      .eq("country_iso", country_iso)
      .order("created_at", { ascending: false });
    if (!error && data) setInstances(data);
  }

  async function handleAdd() {
    if (!newInstance.title) return;
    setLoading(true);
    const { error } = await supabase.from("instances_list").insert([
      {
        country_iso,
        title: newInstance.title,
        description: newInstance.description || null,
        type: newInstance.type,
      },
    ]);
    if (!error) {
      setOpenAdd(false);
      setNewInstance({ type: "baseline" });
      await fetchInstances();
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchInstances();
  }, [country_iso]);

  const headerProps = {
    title: "Country Instances",
    group: "country-config" as const,
    description:
      "View and manage analytical instances (baseline, nowcast, forecast) for this country.",
    breadcrumbs: (
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Country Configuration", href: `/country` },
          { label: country_iso, href: `/country/${country_iso}` },
          { label: "Instances" },
        ]}
      />
    ),
    right: (
      <button
        onClick={() => setOpenAdd(true)}
        className="flex items-center gap-1 bg-[color:var(--gsc-green)] text-white px-3 py-1.5 rounded text-sm hover:opacity-90"
      >
        <Plus className="w-4 h-4" /> New Instance
      </button>
    ),
  };

  return (
    <SidebarLayout headerProps={headerProps}>
      {/* Quick stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="border rounded-lg shadow-sm p-4 flex items-center gap-3">
          <Layers className="w-6 h-6 text-[color:var(--gsc-blue)]" />
          <div>
            <p className="text-sm text-gray-500">Total Instances</p>
            <p className="text-lg font-semibold">{instances.length}</p>
          </div>
        </div>
        <div className="border rounded-lg shadow-sm p-4 flex items-center gap-3">
          <Clock className="w-6 h-6 text-[color:var(--gsc-green)]" />
          <div>
            <p className="text-sm text-gray-500">Last Updated</p>
            <p className="text-lg font-semibold">
              {instances.length > 0
                ? new Date(
                    instances
                      .map((i) => i.updated_at || "")
                      .filter(Boolean)
                      .sort()
                      .reverse()[0]
                  ).toLocaleDateString()
                : "—"}
            </p>
          </div>
        </div>
        <div className="border rounded-lg shadow-sm p-4 flex items-center gap-3">
          <RefreshCw className="w-6 h-6 text-[color:var(--gsc-orange)]" />
          <div>
            <p className="text-sm text-gray-500">Baselines</p>
            <p className="text-lg font-semibold">
              {instances.filter((i) => i.type === "baseline").length}
            </p>
          </div>
        </div>
      </div>

      {/* Instances table */}
      <div className="overflow-x-auto border rounded-lg shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 text-left">
            <tr>
              <th className="px-4 py-2 w-[40%]">Title</th>
              <th className="px-4 py-2 w-[20%]">Type</th>
              <th className="px-4 py-2 w-[25%]">Created</th>
              <th className="px-4 py-2 w-[15%]">Actions</th>
            </tr>
          </thead>
          <tbody>
            {instances.map((i) => (
              <tr key={i.id} className="border-t hover:bg-gray-50">
                <td className="px-4 py-2">{i.title}</td>
                <td className="px-4 py-2 capitalize">{i.type}</td>
                <td className="px-4 py-2">
                  {new Date(i.created_at).toLocaleDateString()}
                </td>
                <td className="px-4 py-2">
                  <Link
                    href={`/country/${country_iso}/instances/${i.id}`}
                    className="text-blue-700 hover:underline"
                  >
                    Open
                  </Link>
                </td>
              </tr>
            ))}
            {instances.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-gray-500 italic">
                  No instances yet. Create one to begin analysis.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add modal */}
      {openAdd && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-[400px]">
            <h2 className="text-lg font-semibold mb-4">New Instance</h2>
            <label className="block mb-2 text-sm text-gray-600">Title</label>
            <input
              className="w-full border rounded p-2 mb-3 text-sm"
              placeholder="Instance title"
              value={newInstance.title || ""}
              onChange={(e) =>
                setNewInstance({ ...newInstance, title: e.target.value })
              }
            />
            <label className="block mb-2 text-sm text-gray-600">Type</label>
            <select
              className="w-full border rounded p-2 mb-3 text-sm"
              value={newInstance.type}
              onChange={(e) =>
                setNewInstance({
                  ...newInstance,
                  type: e.target.value as Instance["type"],
                })
              }
            >
              <option value="baseline">Baseline</option>
              <option value="nowcast">Nowcast</option>
              <option value="forecast">Forecast</option>
            </select>
            <label className="block mb-2 text-sm text-gray-600">
              Description
            </label>
            <textarea
              className="w-full border rounded p-2 mb-4 text-sm"
              rows={3}
              placeholder="Optional description"
              value={newInstance.description || ""}
              onChange={(e) =>
                setNewInstance({
                  ...newInstance,
                  description: e.target.value,
                })
              }
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setOpenAdd(false)}
                className="px-3 py-1.5 rounded bg-gray-200 text-gray-800 text-sm hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                disabled={loading}
                onClick={handleAdd}
                className="px-3 py-1.5 rounded bg-[color:var(--gsc-green)] text-white text-sm hover:opacity-90 disabled:opacity-50"
              >
                {loading ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </SidebarLayout>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { Plus, RefreshCw, Trash2, BarChart3 } from "lucide-react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";

type Instance = {
  id: string;
  title: string;
  description: string | null;
  type: string;
  created_at: string;
};

export default function InstancesPage({ params }: { params: { id: string } }) {
  const [instances, setInstances] = useState<Instance[]>([]);
  const [newTitle, setNewTitle] = useState("");
  const [newType, setNewType] = useState("Baseline");
  const [newDescription, setNewDescription] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchInstances = async () => {
    const { data, error } = await supabase
      .from("instances_list")
      .select("*")
      .eq("country_iso", params.id)
      .order("created_at", { ascending: false });
    if (!error && data) setInstances(data);
  };

  const addInstance = async () => {
    if (!newTitle.trim()) return;
    setLoading(true);
    await supabase.from("instances_list").insert({
      country_iso: params.id,
      title: newTitle.trim(),
      type: newType,
      description: newDescription || null,
    });
    setNewTitle("");
    setNewDescription("");
    await fetchInstances();
    setLoading(false);
  };

  const deleteInstance = async (id: string) => {
    await supabase.from("instances_list").delete().eq("id", id);
    await fetchInstances();
  };

  useEffect(() => {
    fetchInstances();
  }, []);

  const headerProps = {
    title: "Instances",
    group: "country-config" as const,
    description: "Manage analytical SSC instances for this country.",
    breadcrumbs: (
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Country Configuration", href: "/country" },
          { label: params.id.toUpperCase(), href: `/country/${params.id}` },
          { label: "Instances" },
        ]}
      />
    ),
  };

  return (
    <SidebarLayout headerProps={headerProps}>
      {/* Controls */}
      <div className="flex items-center gap-2 mb-4">
        <input
          type="text"
          placeholder="Instance title (e.g. Baseline 2025)"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          className="border rounded px-3 py-1.5 text-sm flex-1"
        />
        <select
          value={newType}
          onChange={(e) => setNewType(e.target.value)}
          className="border rounded px-2 py-1 text-sm"
        >
          <option value="Baseline">Baseline</option>
          <option value="Forecast">Forecast</option>
          <option value="Response">Response</option>
        </select>
        <input
          type="text"
          placeholder="Description (optional)"
          value={newDescription}
          onChange={(e) => setNewDescription(e.target.value)}
          className="border rounded px-3 py-1.5 text-sm flex-1"
        />
        <button
          onClick={addInstance}
          disabled={loading}
          className="bg-green-700 text-white rounded px-3 py-1.5 flex items-center gap-1 hover:bg-green-800"
        >
          <Plus className="w-4 h-4" /> Add
        </button>
        <button
          onClick={fetchInstances}
          className="ml-auto bg-gray-100 text-gray-800 rounded px-3 py-1.5 flex items-center gap-1 hover:bg-gray-200"
        >
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Instances Table */}
      <div className="overflow-x-auto border rounded-lg shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 text-left">
            <tr>
              <th className="px-4 py-2 w-[40%]">Title</th>
              <th className="px-4 py-2 w-[15%]">Type</th>
              <th className="px-4 py-2 w-[30%]">Description</th>
              <th className="px-4 py-2 w-[15%]">Created</th>
              <th className="px-4 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {instances.map((inst) => (
              <tr key={inst.id} className="border-t hover:bg-gray-50">
                <td className="px-4 py-2">
                  <Link
                    href={`/country/${params.id}/instances/${inst.id}`}
                    className="text-blue-700 hover:underline"
                  >
                    {inst.title}
                  </Link>
                </td>
                <td className="px-4 py-2">{inst.type}</td>
                <td className="px-4 py-2">{inst.description || "—"}</td>
                <td className="px-4 py-2">
                  {new Date(inst.created_at).toLocaleDateString()}
                </td>
                <td className="px-4 py-2 flex justify-end gap-2">
                  <Link
                    href={`/country/${params.id}/instances/${inst.id}`}
                    className="p-1.5 rounded hover:bg-gray-100"
                    title="View Analysis"
                  >
                    <BarChart3 className="w-4 h-4 text-gray-600" />
                  </Link>
                  <button
                    className="p-1.5 rounded hover:bg-red-50"
                    onClick={() => deleteInstance(inst.id)}
                    title="Delete Instance"
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </button>
                </td>
              </tr>
            ))}
            {instances.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-gray-500 italic">
                  No instances yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </SidebarLayout>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { Plus, Trash2, BarChart3, RefreshCw } from "lucide-react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import type { CountryParams } from "@/app/country/types";

interface Instance {
  id: string;
  title: string;
  description: string | null;
  type: string;
  created_at: string;
}

export default function InstancesPage({ params }: { params: CountryParams }) {
  const countryIso = params.id;
  const [instances, setInstances] = useState<Instance[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newType, setNewType] = useState("baseline");
  const [newDesc, setNewDesc] = useState("");

  // Load all instances for this country
  async function loadInstances() {
    setLoading(true);
    const { data, error } = await supabase
      .from("instances_list")
      .select("*")
      .eq("country_iso", countryIso)
      .order("created_at", { ascending: false });
    if (error) console.error(error);
    else setInstances(data || []);
    setLoading(false);
  }

  useEffect(() => {
    loadInstances();
  }, [countryIso]);

  // Add new instance
  async function addInstance() {
    if (!newTitle.trim()) return alert("Enter a title for this instance.");
    const { error } = await supabase.from("instances_list").insert({
      country_iso: countryIso,
      title: newTitle,
      description: newDesc || null,
      type: newType,
    });
    if (error) return alert("Error adding instance: " + error.message);
    setNewTitle("");
    setNewDesc("");
    await loadInstances();
  }

  // Delete instance
  async function deleteInstance(id: string) {
    if (!confirm("Delete this instance?")) return;
    const { error } = await supabase.from("instances_list").delete().eq("id", id);
    if (error) return alert("Error deleting instance: " + error.message);
    await loadInstances();
  }

  const headerProps = {
    title: `${countryIso} – Instances`,
    group: "country-config" as const,
    description:
      "SSC Instances represent baseline or event-based analyses built from datasets within a country configuration.",
    breadcrumbs: (
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/" },
          { label: "Country Configuration", href: "/country" },
          { label: countryIso, href: `/country/${countryIso}` },
          { label: "Instances", href: "#" },
        ]}
      />
    ),
  };

  return (
    <SidebarLayout headerProps={headerProps}>
      <div className="p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Instances</h2>
          <div className="flex gap-2">
            <button
              onClick={() => loadInstances()}
              className="flex items-center gap-1 px-3 py-1.5 text-sm rounded bg-gray-100 text-gray-700 hover:bg-gray-200"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* New instance form */}
        <div className="border rounded-lg p-3 bg-gray-50 flex flex-col sm:flex-row gap-2 items-center">
          <input
            type="text"
            placeholder="Instance title (e.g., Baseline 2025 or Typhoon Egay Response)"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            className="border p-2 rounded w-full sm:flex-1 text-sm"
          />
          <select
            value={newType}
            onChange={(e) => setNewType(e.target.value)}
            className="border p-2 rounded text-sm"
          >
            <option value="baseline">Baseline</option>
            <option value="forecast">Forecast</option>
            <option value="nowcast">Nowcast</option>
            <option value="event">Event</option>
          </select>
          <input
            type="text"
            placeholder="Description (optional)"
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            className="border p-2 rounded w-full sm:flex-1 text-sm"
          />
          <button
            onClick={addInstance}
            className="flex items-center gap-1 bg-[color:var(--gsc-green)] text-white px-3 py-2 rounded text-sm hover:opacity-90"
          >
            <Plus className="w-4 h-4" /> Add
          </button>
        </div>

        {/* Instances table */}
        <div className="bg-white border rounded-md overflow-hidden shadow text-sm">
          <table className="min-w-full border-collapse">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-3 py-2 text-left">Title</th>
                <th className="px-3 py-2 text-left">Type</th>
                <th className="px-3 py-2 text-left">Description</th>
                <th className="px-3 py-2 text-left">Created</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {instances.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center italic text-gray-500 py-3">
                    No instances yet. Create one above.
                  </td>
                </tr>
              ) : (
                instances.map((i) => (
                  <tr key={i.id} className="border-t hover:bg-gray-50">
                    <td className="px-3 py-2 text-[color:var(--gsc-blue)] font-medium">
                      <Link href={`/country/${countryIso}/instances/${i.id}`}>
                        {i.title}
                      </Link>
                    </td>
                    <td className="px-3 py-2 capitalize">{i.type}</td>
                    <td className="px-3 py-2 text-gray-600">
                      {i.description || "—"}
                    </td>
                    <td className="px-3 py-2">
                      {new Date(i.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <div className="flex gap-2 justify-end">
                        <Link
                          href={`/country/${countryIso}/instances/${i.id}/baseline`}
                          title="View Baseline"
                          className="text-gray-700 hover:text-[color:var(--gsc-green)]"
                        >
                          <BarChart3 className="w-4 h-4" />
                        </Link>
                        <button
                          title="Delete Instance"
                          onClick={() => deleteInstance(i.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </SidebarLayout>
  );
}

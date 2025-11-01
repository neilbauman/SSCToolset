"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { Plus, Pencil, Trash2, Target, Layers } from "lucide-react";
import DeleteConfirmationModal from "@/components/common/DeleteConfirmationModal";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import type { CountryParams } from "@/app/country/types";

type Instance = {
  id: string;
  name: string;
  type: "baseline" | "nowcast" | "forecast" | "scenario";
  admin_level: string | null;
  status: "draft" | "published";
  updated_at: string | null;
  country_iso: string;
};

export default function CountryInstancesPage({ params }: { params: CountryParams }) {
  const countryIso = params.id;
  const [instances, setInstances] = useState<Instance[]>([]);
  const [loading, setLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [toDelete, setToDelete] = useState<Instance | null>(null);

  async function loadInstances() {
    setLoading(true);
    const { data, error } = await supabase
      .from("instances_list")
      .select("*")
      .eq("country_iso", countryIso)
      .order("updated_at", { ascending: false });
    if (!error && data) setInstances(data as Instance[]);
    setLoading(false);
  }

  useEffect(() => {
    loadInstances();
  }, [countryIso]);

  async function handleDelete(row: Instance) {
    setLoading(true);
    const { error } = await supabase.from("instances").delete().eq("id", row.id);
    if (!error) await loadInstances();
    setLoading(false);
    setToDelete(null);
  }

  const headerProps = {
    title: `${countryIso} – Instances`,
    group: "country-config" as const,
    description:
      "Baselines and scenario analyses for this country. Create or explore SSC instances.",
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
    right: (
      <Link
        href={`/instances/new?country=${countryIso}`}
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded bg-[color:var(--gsc-green)] text-white text-sm hover:opacity-90"
      >
        <Plus className="w-4 h-4" />
        New
      </Link>
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
          <Target className="w-6 h-6 text-[color:var(--gsc-green)]" />
          <div>
            <p className="text-sm text-gray-500">Published</p>
            <p className="text-lg font-semibold">
              {instances.filter((i) => i.status === "published").length}
            </p>
          </div>
        </div>
        <div className="border rounded-lg shadow-sm p-4 flex items-center gap-3">
          <Pencil className="w-6 h-6 text-[color:var(--gsc-orange,#f59e0b)]" />
          <div>
            <p className="text-sm text-gray-500">Last Updated</p>
            <p className="text-lg font-semibold">
              {instances.length
                ? new Date(
                    instances
                      .map((r) => r.updated_at || "")
                      .filter(Boolean)
                      .sort()
                      .reverse()[0]
                  ).toLocaleDateString()
                : "—"}
            </p>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex justify-end items-center mb-4">
        <button
          onClick={() => setEditMode((v) => !v)}
          className="px-3 py-1.5 rounded bg-gray-200 text-gray-800 text-sm hover:bg-gray-300"
        >
          {editMode ? "Exit Edit Mode" : "Edit Mode"}
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto border rounded-lg shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 text-left">
            <tr>
              <th className="px-4 py-2 w-[30%]">Name</th>
              <th className="px-4 py-2 w-[15%]">Type</th>
              <th className="px-4 py-2 w-[15%]">Admin</th>
              <th className="px-4 py-2 w-[15%]">Status</th>
              <th className="px-4 py-2 w-[15%]">Updated</th>
              {editMode && <th className="px-4 py-2 text-right">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {instances.map((i) => (
              <tr key={i.id} className="border-t hover:bg-gray-50">
                <td className="px-4 py-2">
                  <Link
                    href={`/instances/${i.id}`}
                    className="text-blue-700 hover:underline"
                  >
                    {i.name}
                  </Link>
                </td>
                <td className="px-4 py-2 capitalize">{i.type}</td>
                <td className="px-4 py-2">{i.admin_level || "—"}</td>
                <td className="px-4 py-2">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-xs ${
                      i.status === "published"
                        ? "bg-green-100 text-green-700"
                        : "bg-yellow-100 text-yellow-700"
                    }`}
                  >
                    {i.status}
                  </span>
                </td>
                <td className="px-4 py-2">
                  {i.updated_at
                    ? new Date(i.updated_at).toLocaleDateString()
                    : "—"}
                </td>
                {editMode && (
                  <td className="px-4 py-2 text-right">
                    <div className="flex justify-end gap-2">
                      <Link
                        href={`/instances/${i.id}/edit`}
                        className="p-1.5 rounded hover:bg-gray-100"
                      >
                        <Pencil className="w-4 h-4 text-gray-600" />
                      </Link>
                      <button
                        className="p-1.5 rounded hover:bg-red-50"
                        onClick={() => setToDelete(i)}
                      >
                        <Trash2 className="w-4 h-4 text-[color:var(--gsc-red)]" />
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
            {instances.length === 0 && (
              <tr>
                <td
                  colSpan={editMode ? 6 : 5}
                  className="px-4 py-6 text-center text-gray-500 italic"
                >
                  {loading ? "Loading…" : "No instances yet for this country."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Delete Modal */}
      <DeleteConfirmationModal
        open={!!toDelete}
        title="Delete Instance"
        message={
          toDelete
            ? `Are you sure you want to delete "${toDelete.name}" (${toDelete.type})?`
            : ""
        }
        confirmLabel="Delete"
        cancelLabel="Cancel"
        loading={loading}
        onConfirm={() => toDelete && handleDelete(toDelete)}
        onCancel={() => setToDelete(null)}
      />
    </SidebarLayout>
  );
}

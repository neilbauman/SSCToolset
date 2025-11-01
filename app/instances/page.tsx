"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import DeleteConfirmationModal from "@/components/common/DeleteConfirmationModal";
import { Plus, Pencil, Trash2, Target, Layers } from "lucide-react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";

type InstanceRow = {
  id: string;
  name: string;
  type: "baseline" | "nowcast" | "forecast" | "scenario";
  country_iso: string;
  country_name: string | null;
  admin_level: string;
  status: "draft" | "published";
  updated_at: string | null;
};

export default function InstancesPage() {
  const [rows, setRows] = useState<InstanceRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [toDelete, setToDelete] = useState<InstanceRow | null>(null);

  async function fetchRows() {
    setLoading(true);
    const { data, error } = await supabase.from("instances_list").select("*");
    if (!error && data) setRows(data as InstanceRow[]);
    setLoading(false);
  }

  useEffect(() => {
    fetchRows();
  }, []);

  async function handleDelete(row: InstanceRow) {
    setLoading(true);
    try {
      const { error } = await supabase.from("instances").delete().eq("id", row.id);
      if (error) throw error;
      await fetchRows();
    } finally {
      setLoading(false);
      setToDelete(null);
    }
  }

  const headerProps = {
    title: "Instances",
    group: "country-config" as const, // ✅ required field
    description: "Create and compare analyses (baseline, nowcast, forecast, scenarios).",
    breadcrumbs: (
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Instances" },
        ]}
      />
    ),
    right: (
      <Link
        href="/instances/new"
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
            <p className="text-lg font-semibold">{rows.length}</p>
          </div>
        </div>
        <div className="border rounded-lg shadow-sm p-4 flex items-center gap-3">
          <Target className="w-6 h-6 text-[color:var(--gsc-green)]" />
          <div>
            <p className="text-sm text-gray-500">Published</p>
            <p className="text-lg font-semibold">
              {rows.filter((r) => r.status === "published").length}
            </p>
          </div>
        </div>
        <div className="border rounded-lg shadow-sm p-4 flex items-center gap-3">
          <Pencil className="w-6 h-6 text-[color:var(--gsc-orange,#f59e0b)]" />
          <div>
            <p className="text-sm text-gray-500">Last Updated</p>
            <p className="text-lg font-semibold">
              {rows.length
                ? new Date(
                    rows
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
          className="px-3 py-1.5 rounded bg-gray-200 text-gray-800 text-sm hover:bg-gray-300"
          onClick={() => setEditMode((v) => !v)}
        >
          {editMode ? "Exit Edit Mode" : "Edit Mode"}
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto border rounded-lg shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 text-left">
            <tr>
              <th className="px-4 py-2 w-[28%]">Name</th>
              <th className="px-4 py-2 w-[12%]">Type</th>
              <th className="px-4 py-2 w-[12%]">Country</th>
              <th className="px-4 py-2 w-[10%]">Admin</th>
              <th className="px-4 py-2 w-[12%]">Status</th>
              <th className="px-4 py-2 w-[16%]">Updated</th>
              {editMode && <th className="px-4 py-2 w-[10%] text-right">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t hover:bg-gray-50">
                <td className="px-4 py-2">
                  <Link
                    href={`/instances/${r.id}`}
                    className="text-blue-700 hover:underline"
                  >
                    {r.name}
                  </Link>
                </td>
                <td className="px-4 py-2 capitalize">{r.type}</td>
                <td className="px-4 py-2">
                  <span className="font-medium">{r.country_iso}</span>{" "}
                  <span className="text-gray-500">{r.country_name || ""}</span>
                </td>
                <td className="px-4 py-2">{r.admin_level}</td>
                <td className="px-4 py-2">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-xs ${
                      r.status === "published"
                        ? "bg-green-100 text-green-700"
                        : "bg-yellow-100 text-yellow-700"
                    }`}
                  >
                    {r.status}
                  </span>
                </td>
                <td className="px-4 py-2">
                  {r.updated_at ? new Date(r.updated_at).toLocaleString() : "—"}
                </td>
                {editMode && (
                  <td className="px-4 py-2">
                    <div className="flex justify-end gap-2">
                      <Link
                        href={`/instances/${r.id}/edit`}
                        className="p-1.5 rounded hover:bg-gray-100"
                        title="Edit"
                      >
                        <Pencil className="w-4 h-4 text-gray-600" />
                      </Link>
                      <button
                        className="p-1.5 rounded hover:bg-red-50"
                        onClick={() => setToDelete(r)}
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4 text-[color:var(--gsc-red)]" />
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={editMode ? 7 : 6}
                  className="px-4 py-6 text-center text-gray-500 italic"
                >
                  {loading ? "Loading…" : "No instances yet. Click New to create one."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Delete modal */}
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

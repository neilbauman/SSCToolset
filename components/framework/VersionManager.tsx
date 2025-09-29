"use client";

import { useState } from "react";
import { FrameworkVersion } from "@/lib/types/framework";
import { Button } from "@/components/ui/button";

type Props = {
  versions: FrameworkVersion[];
  selectedId: string;
  editMode: boolean;
  onToggleEdit: () => void;
  onSelect: (id: string) => void;
  onRefresh: () => Promise<void>;
  onCreated: (id: string) => void;
};

export default function VersionManager({
  versions,
  selectedId,
  editMode,
  onToggleEdit,
  onSelect,
  onRefresh,
  onCreated,
}: Props) {
  const [loading, setLoading] = useState(false);

  // ───────────────────────────────
  // API helpers
  // ───────────────────────────────
  const apiCall = async (url: string, opts: RequestInit) => {
    setLoading(true);
    try {
      const res = await fetch(url, opts);
      if (!res.ok) throw new Error(`Request failed: ${res.status}`);
      return await res.json();
    } finally {
      setLoading(false);
    }
  };

  const handleNew = async () => {
    const name = prompt("Enter new framework version name:");
    if (!name) return;
    const v = await apiCall("/api/framework/versions", {
      method: "POST",
      body: JSON.stringify({ name }),
    });
    onCreated(v.id);
    await onRefresh();
  };

  const handleClone = async (id: string) => {
    const newName = prompt("Enter name for cloned version:");
    if (!newName) return;
    const v = await apiCall(`/api/framework/versions/${id}/clone`, {
      method: "POST",
      body: JSON.stringify({ name: newName }),
    });
    onCreated(v.id);
    await onRefresh();
  };

  const handlePublish = async (id: string) => {
    await apiCall(`/api/framework/versions/${id}`, { method: "PUT" });
    await onRefresh();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this version?")) return;
    await apiCall(`/api/framework/versions/${id}`, { method: "DELETE" });
    await onRefresh();
  };

  // ───────────────────────────────
  // UI
  // ───────────────────────────────
  return (
    <div className="mb-4 border border-gray-200 rounded-md">
      <div className="flex items-center justify-between bg-gray-50 px-3 py-2">
        <h2 className="font-medium text-gray-700">Framework Versions</h2>
        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            size="sm"
            onClick={onToggleEdit}
            disabled={loading}
          >
            {editMode ? "Exit edit mode" : "Enter edit mode"}
          </Button>
          {editMode && (
            <Button size="sm" onClick={handleNew} disabled={loading}>
              + New Version
            </Button>
          )}
        </div>
      </div>

      <table className="w-full text-sm">
        <thead className="bg-gray-100 text-left text-gray-600">
          <tr>
            <th className="px-3 py-2">Name</th>
            <th className="px-3 py-2">Status</th>
            <th className="px-3 py-2">Created</th>
            <th className="px-3 py-2">Updated</th>
            {editMode && <th className="px-3 py-2 text-right">Actions</th>}
          </tr>
        </thead>
        <tbody>
          {versions.map((v) => (
            <tr
              key={v.id}
              className={`cursor-pointer ${
                v.id === selectedId ? "bg-blue-50" : "hover:bg-gray-50"
              }`}
              onClick={() => onSelect(v.id)}
            >
              <td className="px-3 py-2">{v.name}</td>
              <td className="px-3 py-2">{v.status}</td>
              <td className="px-3 py-2">{v.created_at}</td>
              <td className="px-3 py-2">{v.updated_at ?? "-"}</td>
              {editMode && (
                <td className="px-3 py-2 text-right space-x-2">
                  <Button size="sm" variant="ghost" onClick={() => handleClone(v.id)}>
                    Clone
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => handlePublish(v.id)}>
                    Publish
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-red-600"
                    onClick={() => handleDelete(v.id)}
                  >
                    Delete
                  </Button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

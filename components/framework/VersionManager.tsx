"use client";

import { useState } from "react";
import { FrameworkVersion } from "@/lib/types/framework";
import { Pencil, Copy, CheckCircle, Trash2 } from "lucide-react";

type Props = {
  versions: FrameworkVersion[];
  selectedId: string;
  onSelect: (id: string) => void;
  onRefresh: () => Promise<void>; // ✅ refresh after changes
};

export default function VersionManager({
  versions,
  selectedId,
  onSelect,
  onRefresh,
}: Props) {
  const [showVersions, setShowVersions] = useState(true);
  const selected = versions.find((v) => v.id === selectedId);

  // ─────────────── Handlers ───────────────
  const handleCreate = async () => {
    const name = prompt("Enter name for new framework");
    if (!name) return;

    try {
      const res = await fetch("/api/framework/versions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error("Failed to create version");
      await onRefresh();
    } catch (err: any) {
      alert("Error creating version: " + err.message);
    }
  };

  return (
    <div className="mb-4">
      {/* Dropdown + status */}
      <div className="flex items-center justify-between mb-2">
        <select
          value={selectedId}
          onChange={(e) => onSelect(e.target.value)}
          className="rounded border border-gray-300 px-2 py-1 text-sm"
        >
          {versions.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name} ({v.status})
            </option>
          ))}
        </select>
        <span className="ml-2 text-xs px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded">
          {selected?.status}
        </span>
        <button
          className="ml-4 text-sm text-gray-500 hover:underline"
          onClick={() => setShowVersions((s) => !s)}
        >
          {showVersions ? "Hide Versions" : "Show Versions"}
        </button>
      </div>

      {/* Versions table */}
      {showVersions && (
        <div className="border rounded p-2 mb-2">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-600">
                <th className="px-2 py-1">Name</th>
                <th className="px-2 py-1">Status</th>
                <th className="px-2 py-1">Created</th>
                <th className="px-2 py-1">Updated</th>
                <th className="px-2 py-1 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {versions.map((v) => (
                <tr
                  key={v.id}
                  className={`hover:bg-gray-50 ${
                    v.id === selectedId ? "bg-blue-50" : ""
                  }`}
                >
                  <td className="px-2 py-1">{v.name}</td>
                  <td className="px-2 py-1">
                    <span className="px-2 py-0.5 rounded text-xs bg-yellow-100 text-yellow-700">
                      {v.status}
                    </span>
                  </td>
                  <td className="px-2 py-1">{v.created_at?.slice(0, 10)}</td>
                  <td className="px-2 py-1">
                    {v.updated_at ? v.updated_at.slice(0, 10) : "-"}
                  </td>
                  <td className="px-2 py-1 text-right space-x-2">
                    <button className="text-gray-500 hover:text-gray-700">
                      <Pencil size={14} />
                    </button>
                    <button className="text-gray-500 hover:text-gray-700">
                      <Copy size={14} />
                    </button>
                    <button className="text-green-600 hover:text-green-800">
                      <CheckCircle size={14} />
                    </button>
                    <button className="text-red-600 hover:text-red-800">
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-2">
            <button
              onClick={handleCreate}
              className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700"
            >
              + Create New from Scratch
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

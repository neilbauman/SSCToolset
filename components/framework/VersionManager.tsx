// components/framework/VersionManager.tsx
"use client";

import React, { useEffect, useState } from "react";
import {
  listVersions,
  createVersion,
  cloneVersion,
  deleteVersion,
  publishVersion,
} from "@/lib/services/framework";
import type { FrameworkVersion } from "@/lib/types/framework";
import FrameworkEditor from "./FrameworkEditor";
import {
  Edit3,
  Copy,
  Trash2,
  Upload,
  Plus,
  EyeOff,
  Eye,
} from "lucide-react";

export default function VersionManager() {
  const [versions, setVersions] = useState<FrameworkVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [current, setCurrent] = useState<FrameworkVersion | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [showPanel, setShowPanel] = useState(true);

  useEffect(() => {
    refreshVersions();
  }, []);

  const refreshVersions = async () => {
    setLoading(true);
    try {
      const data = await listVersions();
      setVersions(data);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      const newVersion = await createVersion("Untitled Framework");
      await refreshVersions();
      setCurrent(newVersion);
      setEditMode(true);
    } catch (err: any) {
      console.error("Error creating version:", err.message);
    }
  };

  const handleClone = async (id: string, newName: string) => {
    try {
      const newVersion = await cloneVersion(id, newName);
      await refreshVersions();
      setCurrent(newVersion);
      setEditMode(true);
    } catch (err: any) {
      console.error("Error cloning version:", err.message);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteVersion(id);
      await refreshVersions();
      if (current?.id === id) setCurrent(null);
    } catch (err: any) {
      console.error("Error deleting version:", err.message);
    }
  };

  const handlePublish = async (id: string, publish: boolean) => {
    try {
      await publishVersion(id, publish);
      await refreshVersions();
    } catch (err: any) {
      console.error("Error publishing version:", err.message);
    }
  };

  if (loading) return <div>Loading framework versions…</div>;

  return (
    <div className="space-y-6">
      {/* Header controls */}
      <div className="flex justify-between items-center">
        <div className="flex gap-2 items-center">
          <h2 className="text-lg font-semibold">Primary Framework Versions</h2>
          <button
            onClick={() => setShowPanel((prev) => !prev)}
            className="flex items-center gap-1 px-2 py-1 text-sm rounded bg-gray-200 hover:bg-gray-300"
          >
            {showPanel ? <EyeOff size={16} /> : <Eye size={16} />}
            {showPanel ? "Hide Versioning" : "Show Versioning"}
          </button>
          {editMode && (
            <button
              onClick={handleCreate}
              className="flex items-center gap-1 px-2 py-1 text-sm rounded bg-green-600 text-white hover:bg-green-700"
            >
              <Plus size={16} />
              Add
            </button>
          )}
        </div>
        <div>
          <button
            onClick={() => setEditMode((prev) => !prev)}
            className={`flex items-center gap-1 px-2 py-1 text-sm rounded ${
              editMode ? "bg-blue-600 text-white" : "bg-gray-200 hover:bg-gray-300"
            }`}
          >
            <Edit3 size={16} />
            {editMode ? "Exit Edit Mode" : "Enter Edit Mode"}
          </button>
        </div>
      </div>

      {/* Versions Table */}
      {showPanel && (
        <table className="w-full border text-sm table-fixed">
          <thead className="bg-gray-100">
            <tr>
              <th className="text-left px-2 py-1 w-[35%]">Name</th>
              <th className="text-left px-2 py-1 w-[15%]">Status</th>
              <th className="text-left px-2 py-1 w-[20%]">Created</th>
              <th className="text-left px-2 py-1 w-[20%]">Last Revised</th>
              <th className="text-right px-2 py-1 w-[10%]">Actions</th>
            </tr>
          </thead>
          <tbody>
            {versions.map((v) => (
              <tr
                key={v.id}
                className={`cursor-pointer ${
                  current?.id === v.id ? "bg-blue-50" : ""
                }`}
                onClick={() => setCurrent(v)}
              >
                <td className="px-2 py-1 font-medium">{v.name}</td>
                <td className="px-2 py-1">
                  <span
                    className={`px-2 py-0.5 rounded text-xs ${
                      v.status === "published"
                        ? "bg-green-100 text-green-800"
                        : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {v.status}
                  </span>
                </td>
                <td className="px-2 py-1">
                  {new Date(v.created_at).toLocaleDateString()}
                </td>
                <td className="px-2 py-1">
                  {v.updated_at
                    ? new Date(v.updated_at).toLocaleDateString()
                    : "-"}
                </td>
                <td className="px-2 py-1 text-right">
                  {editMode && (
                    <div className="flex gap-2 justify-end text-gray-600">
                      <button
                        title="Edit"
                        className="hover:text-blue-600"
                        // TODO: Wire edit modal
                      >
                        <Edit3 size={16} />
                      </button>
                      <button
                        title="Clone"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleClone(v.id, `${v.name} (copy)`);
                        }}
                        className="hover:text-blue-600"
                      >
                        <Copy size={16} />
                      </button>
                      <button
                        title="Delete"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(v.id);
                        }}
                        className="hover:text-red-600"
                      >
                        <Trash2 size={16} />
                      </button>
                      <button
                        title={
                          v.status === "published" ? "Unpublish" : "Publish"
                        }
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePublish(v.id, v.status !== "published");
                        }}
                        className="hover:text-green-600"
                      >
                        <Upload size={16} />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Framework Editor below */}
      {current && (
        <div className="border-t pt-4 space-y-2">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-medium">{current.name}</h3>
              <p className="text-xs text-gray-500">
                {current.status} • Created{" "}
                {new Date(current.created_at).toLocaleDateString()}
                {current.updated_at &&
                  ` • Last revised ${new Date(
                    current.updated_at
                  ).toLocaleDateString()}`}
              </p>
            </div>
          </div>
          <FrameworkEditor versionId={current.id} editable={editMode} />
        </div>
      )}
    </div>
  );
}

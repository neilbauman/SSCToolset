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

export default function VersionManager() {
  const [versions, setVersions] = useState<FrameworkVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    refreshVersions();
  }, []);

  const refreshVersions = async () => {
    setLoading(true);
    try {
      const data = await listVersions();
      setVersions(data);
      if (!currentId && data.length > 0) {
        setCurrentId(data[0].id);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      const newVersion = await createVersion("Untitled Framework");
      await refreshVersions();
      setCurrentId(newVersion.id);
      setEditMode(false);
    } catch (err: any) {
      console.error("Error creating version:", err.message);
    }
  };

  const handleClone = async (id: string, newName: string) => {
    try {
      const newVersion = await cloneVersion(id, newName);
      await refreshVersions();
      setCurrentId(newVersion.id);
      setEditMode(false);
    } catch (err: any) {
      console.error("Error cloning version:", err.message);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteVersion(id);
      await refreshVersions();
      if (currentId === id) {
        setCurrentId(null);
        setEditMode(false);
      }
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
      {/* Top: Version list + actions */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Framework Versions</h2>
          <button
            onClick={handleCreate}
            className="px-3 py-1 rounded bg-blue-600 text-white text-sm"
          >
            + New Version
          </button>
        </div>

        <ul className="border rounded divide-y">
          {versions.map((v) => (
            <li
              key={v.id}
              className={`p-2 flex justify-between items-center cursor-pointer ${
                v.id === currentId ? "bg-blue-50" : ""
              }`}
              onClick={() => {
                setCurrentId(v.id);
                setEditMode(false);
              }}
            >
              <div>
                <div className="font-medium">{v.name}</div>
                <div className="text-xs text-gray-500">
                  {v.status} • {new Date(v.created_at).toLocaleString()}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  className="text-blue-600 text-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClone(v.id, `${v.name} (copy)`);
                  }}
                >
                  Clone
                </button>
                <button
                  className="text-red-600 text-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(v.id);
                  }}
                >
                  Delete
                </button>
                <button
                  className="text-green-600 text-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePublish(v.id, v.status !== "published");
                  }}
                >
                  {v.status === "published" ? "Unpublish" : "Publish"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Bottom: Framework Editor */}
      {currentId && (
        <div className="border-t pt-4">
          {!editMode ? (
            <div className="flex justify-center">
              <button
                onClick={() => setEditMode(true)}
                className="px-4 py-2 rounded bg-blue-600 text-white text-sm"
              >
                Enter Edit Mode
              </button>
            </div>
          ) : (
            <FrameworkEditor versionId={currentId} editable={true} />
          )}
        </div>
      )}
    </div>
  );
}

// components/framework/PrimaryFrameworkClient.tsx
"use client";

import React, { useState, useEffect } from "react";
import {
  listVersions,
  createVersion,
  cloneVersion,
  deleteVersion,
  publishVersion,
} from "@/lib/services/framework";
import type { FrameworkVersion } from "@/lib/types/framework";

export default function PrimaryFrameworkClient() {
  const [versions, setVersions] = useState<FrameworkVersion[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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
      setVersions((prev) => [...prev, newVersion]);
      setCurrentId(newVersion.id);
    } catch (err: any) {
      console.error("Error creating version:", err.message);
    }
  };

  const handleClone = async (id: string, newName: string) => {
    try {
      const newVersion = await cloneVersion(id, newName);
      setCurrentId(newVersion.id); // ✅ FIX: only set the ID
      await refreshVersions();
    } catch (err: any) {
      console.error("Error cloning version:", err.message);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteVersion(id);
      await refreshVersions();
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

  if (loading) return <div>Loading...</div>;

  return (
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
            className={`p-2 flex justify-between items-center ${
              v.id === currentId ? "bg-blue-50" : ""
            }`}
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
                onClick={() => handleClone(v.id, `${v.name} (copy)`)}
              >
                Clone
              </button>
              <button
                className="text-red-600 text-sm"
                onClick={() => handleDelete(v.id)}
              >
                Delete
              </button>
              <button
                className="text-green-600 text-sm"
                onClick={() =>
                  handlePublish(v.id, v.status !== "published")
                }
              >
                {v.status === "published" ? "Unpublish" : "Publish"}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

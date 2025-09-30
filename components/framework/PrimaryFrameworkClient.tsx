// components/framework/PrimaryFrameworkClient.tsx
"use client";

import React, { useState } from "react";
import {
  cloneVersion,
  deleteVersion,
  publishVersion,
} from "@/lib/services/framework";
import type { FrameworkVersion } from "@/lib/types/framework";

type Props = {
  versions: FrameworkVersion[];
  openedId?: string;
  onRefresh?: () => Promise<void>; // optional callback so page can re-fetch
};

export default function PrimaryFrameworkClient({
  versions,
  openedId,
  onRefresh,
}: Props) {
  const [currentId, setCurrentId] = useState<string | null>(openedId ?? null);

  const handleClone = async (id: string, newName: string) => {
    try {
      const newVersion = await cloneVersion(id, newName);
      setCurrentId(newVersion.id);
      if (onRefresh) await onRefresh();
    } catch (err: any) {
      console.error("Error cloning version:", err.message);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteVersion(id);
      if (onRefresh) await onRefresh();
    } catch (err: any) {
      console.error("Error deleting version:", err.message);
    }
  };

  const handlePublish = async (id: string, publish: boolean) => {
    try {
      await publishVersion(id, publish);
      if (onRefresh) await onRefresh();
    } catch (err: any) {
      console.error("Error publishing version:", err.message);
    }
  };

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Framework Versions</h2>
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

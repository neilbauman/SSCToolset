// components/framework/VersionManager.tsx
"use client";

import { useState } from "react";
import { FrameworkVersion } from "@/lib/types/framework";
import {
  createVersion,
  cloneVersion,
  publishVersion,
} from "@/lib/services/framework";

type Props = {
  versions: FrameworkVersion[];
  selectedId: string;
  onSelect: (id: string) => void;
  onRefresh?: () => Promise<void>; // 🔑 parent can reload versions after mutations
};

export default function VersionManager({
  versions,
  selectedId,
  onSelect,
  onRefresh,
}: Props) {
  const [loading, setLoading] = useState(false);

  const current = versions.find((v) => v.id === selectedId);

  // ─────────────────────────────────────────────
  // Handlers
  // ─────────────────────────────────────────────
  const handleNew = async () => {
    try {
      setLoading(true);
      const newV = await createVersion("New Framework");
      if (onRefresh) await onRefresh();
      onSelect(newV.id);
    } catch (err: any) {
      console.error("Error creating version:", err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClone = async () => {
    if (!current) return;
    try {
      setLoading(true);
      const newId = await cloneVersion(
        current.id,
        `${current.name} (Copy)`
      );
      if (onRefresh) await onRefresh();
      onSelect(newId);
    } catch (err: any) {
      console.error("Error cloning version:", err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async () => {
    if (!current) return;
    try {
      setLoading(true);
      await publishVersion(current.id);
      if (onRefresh) await onRefresh();
    } catch (err: any) {
      console.error("Error publishing version:", err.message);
    } finally {
      setLoading(false);
    }
  };

  // ─────────────────────────────────────────────

  return (
    <div className="flex items-center justify-between mb-4">
      {/* Dropdown */}
      <div className="flex items-center space-x-3">
        <select
          className="border rounded px-2 py-1 text-sm"
          value={selectedId}
          onChange={(e) => onSelect(e.target.value)}
        >
          {versions.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
            </option>
          ))}
        </select>

        {current && (
          <span
            className={`px-2 py-1 text-xs rounded ${
              current.status === "published"
                ? "bg-green-100 text-green-700"
                : "bg-gray-100 text-gray-700"
            }`}
          >
            {current.status}
          </span>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center space-x-2">
        <button
          className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
          onClick={handleNew}
          disabled={loading}
        >
          New (Scratch)
        </button>

        <button
          className="bg-gray-200 text-gray-800 px-3 py-1 rounded text-sm hover:bg-gray-300 disabled:opacity-50"
          onClick={handleClone}
          disabled={loading || !current}
        >
          Clone
        </button>

        <button
          className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 disabled:opacity-50"
          onClick={handlePublish}
          disabled={loading || !current || current.status === "published"}
        >
          Publish
        </button>
      </div>
    </div>
  );
}

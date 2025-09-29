"use client";

import React from "react";
import { FrameworkVersion } from "@/lib/types/framework";

type Props = {
  versions: FrameworkVersion[];
  selectedId?: string;
  onSelect: (id: string) => void;

  // Actions
  onNew: () => void;
  onClone: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onPublish: (id: string) => void;
};

export default function VersionManager({
  versions,
  selectedId,
  onSelect,
  onNew,
  onClone,
  onEdit,
  onDelete,
  onPublish,
}: Props) {
  const current = versions.find((v) => v.id === selectedId);

  return (
    <div className="flex items-center gap-3 mb-4">
      {/* Version selector */}
      <select
        value={selectedId ?? ""}
        onChange={(e) => onSelect(e.target.value)}
        className="border rounded px-2 py-1 text-sm"
      >
        {versions.map((v) => (
          <option key={v.id} value={v.id}>
            {v.name} ({v.status})
          </option>
        ))}
      </select>

      {/* Status badge */}
      {current && (
        <span
          className={`px-2 py-1 rounded text-xs ${
            current.status === "published"
              ? "bg-green-100 text-green-700"
              : "bg-yellow-100 text-yellow-700"
          }`}
        >
          {current.status}
        </span>
      )}

      {/* Version controls */}
      <div className="flex items-center gap-2 ml-auto">
        <button
          className="border rounded px-2 py-1 text-sm hover:bg-gray-100"
          onClick={onNew}
        >
          New
        </button>

        {current && (
          <>
            <button
              className="border rounded px-2 py-1 text-sm hover:bg-gray-100"
              onClick={() => onEdit(current.id)}
            >
              Edit
            </button>

            <button
              className="border rounded px-2 py-1 text-sm hover:bg-gray-100"
              onClick={() => onClone(current.id)}
            >
              Clone
            </button>

            <button
              className="border rounded px-2 py-1 text-sm text-red-600 hover:bg-red-50"
              onClick={() => onDelete(current.id)}
            >
              Delete
            </button>

            {current.status !== "published" && (
              <button
                className="border rounded px-2 py-1 text-sm bg-green-600 text-white hover:bg-green-700"
                onClick={() => onPublish(current.id)}
              >
                Publish
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

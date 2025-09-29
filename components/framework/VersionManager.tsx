"use client";

import { useState } from "react";
import type { FrameworkVersion } from "@/lib/types/framework";

type Props = {
  versions: FrameworkVersion[];
  selectedId: string;
  editMode: boolean;
  onSelect: (id: string) => void;
  onNew: () => void;
  onEdit: (id: string) => void;
  onClone: (id: string) => void;
  onDelete: (id: string) => void;
  onPublish: (id: string) => void;
};

export default function VersionManager({
  versions,
  selectedId,
  editMode,
  onSelect,
  onNew,
  onEdit,
  onClone,
  onDelete,
  onPublish,
}: Props) {
  return (
    <div className="w-full border border-gray-200 rounded-md bg-white shadow-sm mb-4">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b bg-gray-50">
        <h2 className="text-sm font-semibold text-gray-700">Framework Versions</h2>
        {editMode && (
          <button
            onClick={onNew}
            className="px-2 py-1 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700"
          >
            + New
          </button>
        )}
      </div>

      {/* Versions Table */}
      <table className="w-full text-sm">
        <thead className="bg-gray-100 text-gray-700">
          <tr>
            <th className="px-3 py-2 text-left">Name</th>
            <th className="px-3 py-2 text-left">Status</th>
            <th className="px-3 py-2 text-left">Created</th>
            <th className="px-3 py-2 text-left">Updated</th>
            {editMode && <th className="px-3 py-2 text-right">Actions</th>}
          </tr>
        </thead>
        <tbody>
          {versions.map((v) => (
            <tr
              key={v.id}
              className={`border-t hover:bg-gray-50 cursor-pointer ${
                v.id === selectedId ? "bg-blue-50" : ""
              }`}
              onClick={() => onSelect(v.id)}
            >
              <td className="px-3 py-2">{v.name}</td>
              <td className="px-3 py-2">
                <span
                  className={`px-2 py-0.5 rounded-full text-xs ${
                    v.status === "published"
                      ? "bg-green-100 text-green-700"
                      : "bg-yellow-100 text-yellow-700"
                  }`}
                >
                  {v.status}
                </span>
              </td>
              <td className="px-3 py-2 text-gray-500">
                {new Date(v.created_at).toLocaleDateString()}
              </td>
              <td className="px-3 py-2 text-gray-500">
                {v.updated_at ? new Date(v.updated_at).toLocaleDateString() : "-"}
              </td>
              {editMode && (
                <td className="px-3 py-2 text-right space-x-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(v.id);
                    }}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onClone(v.id);
                    }}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    📑
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(v.id);
                    }}
                    className="text-red-500 hover:text-red-700"
                  >
                    🗑
                  </button>
                  {v.status === "draft" && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onPublish(v.id);
                      }}
                      className="text-green-600 hover:text-green-800"
                    >
                      🚀
                    </button>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

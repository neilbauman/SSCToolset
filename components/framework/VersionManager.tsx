"use client";

import { Pencil, Copy, CheckCircle2, Trash2 } from "lucide-react";
import { FrameworkVersion } from "@/lib/types/framework";

type Props = {
  versions: FrameworkVersion[];
  selectedId: string;
  editMode: boolean; // 🔑 NEW — lets us show/hide actions
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
    <div className="mb-4 border border-gray-200 rounded-md">
      <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-200">
        {/* Dropdown for selecting a version */}
        <select
          value={selectedId}
          onChange={(e) => onSelect(e.target.value)}
          className="rounded-md border border-gray-300 px-2 py-1 text-sm"
        >
          {versions.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name} ({v.status})
            </option>
          ))}
        </select>

        {/* New Version button */}
        {editMode && (
          <button
            onClick={onNew}
            className="ml-3 rounded bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700"
          >
            + Create New from Scratch
          </button>
        )}
      </div>

      {/* Versions table */}
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-left">
          <tr>
            <th className="px-3 py-2 font-medium">Name</th>
            <th className="px-3 py-2 font-medium">Status</th>
            <th className="px-3 py-2 font-medium">Created</th>
            <th className="px-3 py-2 font-medium">Updated</th>
            <th className="px-3 py-2 font-medium text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {versions.map((v) => (
            <tr
              key={v.id}
              className={`border-t ${
                v.id === selectedId ? "bg-blue-50" : "bg-white"
              }`}
            >
              <td className="px-3 py-2">{v.name}</td>
              <td className="px-3 py-2">
                <span
                  className={`px-2 py-1 text-xs rounded ${
                    v.status === "published"
                      ? "bg-green-100 text-green-700"
                      : "bg-yellow-100 text-yellow-700"
                  }`}
                >
                  {v.status}
                </span>
              </td>
              <td className="px-3 py-2">{v.created_at?.slice(0, 10)}</td>
              <td className="px-3 py-2">
                {v.updated_at ? v.updated_at.slice(0, 10) : "-"}
              </td>
              <td className="px-3 py-2 text-right">
                {editMode ? (
                  <div className="flex items-center justify-end space-x-2">
                    <button
                      className="text-gray-500 hover:text-gray-700"
                      onClick={() => onEdit(v.id)}
                      aria-label="Edit"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      className="text-gray-500 hover:text-gray-700"
                      onClick={() => onClone(v.id)}
                      aria-label="Clone"
                    >
                      <Copy size={16} />
                    </button>
                    <button
                      className="text-green-600 hover:text-green-800"
                      onClick={() => onPublish(v.id)}
                      aria-label="Publish"
                    >
                      <CheckCircle2 size={16} />
                    </button>
                    <button
                      className="text-red-600 hover:text-red-800"
                      onClick={() => onDelete(v.id)}
                      aria-label="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ) : (
                  <span className="text-gray-400">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

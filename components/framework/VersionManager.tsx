"use client";

import { FrameworkVersion } from "@/lib/types/framework";
import { Pencil, Copy, CheckCircle2, Trash2, Plus } from "lucide-react";

type Props = {
  versions: FrameworkVersion[];
  selectedId: string;
  editMode: boolean; // 🔑 unified mode from parent
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
    <div className="mb-4 border rounded-md border-gray-200">
      {/* Version dropdown */}
      <div className="flex items-center space-x-3 p-3 border-b border-gray-100">
        <select
          className="border rounded px-2 py-1 text-sm"
          value={selectedId}
          onChange={(e) => onSelect(e.target.value)}
        >
          {versions.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name} ({v.status})
            </option>
          ))}
        </select>
      </div>

      {/* Versions table */}
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-gray-700">
          <tr>
            <th className="px-3 py-2 text-left font-medium">Name</th>
            <th className="px-3 py-2 text-left font-medium">Status</th>
            <th className="px-3 py-2 text-left font-medium">Created</th>
            <th className="px-3 py-2 text-left font-medium">Updated</th>
            {editMode && (
              <th className="px-3 py-2 text-right font-medium">Actions</th>
            )}
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
              <td className="px-3 py-2">{v.status}</td>
              <td className="px-3 py-2">{v.created_at.split("T")[0]}</td>
              <td className="px-3 py-2">
                {v.updated_at ? v.updated_at.split("T")[0] : "-"}
              </td>
              {editMode && (
                <td className="px-3 py-2 text-right space-x-2">
                  <button
                    onClick={() => onEdit(v.id)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    onClick={() => onClone(v.id)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <Copy size={16} />
                  </button>
                  <button
                    onClick={() => onPublish(v.id)}
                    className="text-green-600 hover:text-green-800"
                  >
                    <CheckCircle2 size={16} />
                  </button>
                  <button
                    onClick={() => onDelete(v.id)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Footer: Create New */}
      {editMode && (
        <div className="p-3 border-t border-gray-100">
          <button
            onClick={onNew}
            className="inline-flex items-center rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Plus size={16} className="mr-1" />
            Create New from Scratch
          </button>
        </div>
      )}
    </div>
  );
}

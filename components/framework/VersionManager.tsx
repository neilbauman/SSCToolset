"use client";

import { Pencil, Trash2, Copy, CheckCircle2, Plus, Ban } from "lucide-react";
import { FrameworkVersion } from "@/lib/types/framework";

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
  onToggleEdit: () => void;
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
  onToggleEdit,
}: Props) {
  return (
    <div className="mb-4">
      {/* Dropdown + edit toggle */}
      <div className="flex items-center justify-between mb-2">
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

        <div className="text-sm text-gray-500">
          {editMode ? (
            <button
              className="hover:text-gray-700"
              onClick={onToggleEdit}
            >
              Exit edit mode
            </button>
          ) : (
            <button
              className="hover:text-gray-700"
              onClick={onToggleEdit}
            >
              Enter edit mode
            </button>
          )}
        </div>
      </div>

      {/* Versions table */}
      <div className="overflow-x-auto rounded-md border border-gray-200 mb-3">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-700">
            <tr>
              <th className="py-2 px-3 font-medium">Name</th>
              <th className="py-2 px-3 font-medium">Status</th>
              <th className="py-2 px-3 font-medium">Created</th>
              <th className="py-2 px-3 font-medium">Updated</th>
              <th className="py-2 px-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {versions.map((v) => (
              <tr
                key={v.id}
                className={`border-b last:border-b-0 ${
                  v.id === selectedId ? "bg-blue-50" : ""
                }`}
              >
                <td
                  className="py-2 px-3 cursor-pointer"
                  onClick={() => onSelect(v.id)}
                >
                  {v.name}
                </td>
                <td className="py-2 px-3">
                  <span className="px-2 py-0.5 text-xs rounded bg-yellow-50 text-yellow-700 border border-yellow-200">
                    {v.status}
                  </span>
                </td>
                <td className="py-2 px-3">{v.created_at?.split("T")[0]}</td>
                <td className="py-2 px-3">
                  {v.updated_at ? v.updated_at.split("T")[0] : "-"}
                </td>
                <td className="py-2 px-3 text-right">
                  {editMode ? (
                    <div className="flex items-center justify-end space-x-3">
                      <button
                        aria-label="Edit"
                        className="text-gray-500 hover:text-gray-700"
                        onClick={() => onEdit(v.id)}
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        aria-label="Clone"
                        className="text-gray-500 hover:text-gray-700"
                        onClick={() => onClone(v.id)}
                      >
                        <Copy size={16} />
                      </button>
                      <button
                        aria-label="Publish"
                        className="text-gray-500 hover:text-green-600"
                        onClick={() => onPublish(v.id)}
                      >
                        <CheckCircle2 size={16} />
                      </button>
                      <button
                        aria-label="Delete"
                        className="text-gray-500 hover:text-red-600"
                        onClick={() => onDelete(v.id)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ) : (
                    <span className="text-gray-300">
                      <Ban size={16} />
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create new */}
      {editMode && (
        <button
          className="ml-2 inline-flex items-center rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
          onClick={onNew}
        >
          <Plus size={16} className="mr-1" />
          Create New from Scratch
        </button>
      )}
    </div>
  );
}

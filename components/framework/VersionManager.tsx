"use client";

import { FrameworkVersion } from "@/lib/types/framework";
import { Pencil, Trash2, Copy, CheckCircle2, Plus, Ban } from "lucide-react";

type Props = {
  versions: FrameworkVersion[];
  selectedId: string;
  editMode: boolean;
  onToggleEdit: () => void;
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
  onToggleEdit,
  onSelect,
  onNew,
  onEdit,
  onClone,
  onDelete,
  onPublish,
}: Props) {
  return (
    <div className="mb-4 rounded-md border border-gray-200">
      <div className="flex items-center justify-between bg-gray-50 px-3 py-2">
        <div className="font-medium text-gray-700">Framework Versions</div>
        <button
          className="text-sm text-gray-600 hover:text-gray-800"
          onClick={onToggleEdit}
        >
          {editMode ? "Exit edit mode" : "Enter edit mode"}
        </button>
      </div>

      <table className="w-full text-sm">
        <thead className="bg-gray-100 text-left text-gray-600">
          <tr>
            <th className="px-3 py-2">Name</th>
            <th className="px-3 py-2">Status</th>
            <th className="px-3 py-2">Created</th>
            <th className="px-3 py-2 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {versions.map((v) => (
            <tr
              key={v.id}
              className={`border-b last:border-0 ${
                v.id === selectedId ? "bg-blue-50" : ""
              }`}
              onClick={() => onSelect(v.id)}
            >
              <td className="px-3 py-2">{v.name}</td>
              <td className="px-3 py-2">{v.status}</td>
              <td className="px-3 py-2">{v.created_at?.slice(0, 10)}</td>
              <td className="px-3 py-2 text-right">
                {editMode ? (
                  <div className="flex justify-end space-x-2">
                    <button
                      aria-label="Edit"
                      className="text-gray-500 hover:text-gray-700"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit(v.id);
                      }}
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      aria-label="Clone"
                      className="text-gray-500 hover:text-gray-700"
                      onClick={(e) => {
                        e.stopPropagation();
                        onClone(v.id);
                      }}
                    >
                      <Copy size={16} />
                    </button>
                    <button
                      aria-label="Publish"
                      className="text-gray-500 hover:text-green-600"
                      onClick={(e) => {
                        e.stopPropagation();
                        onPublish(v.id);
                      }}
                    >
                      <CheckCircle2 size={16} />
                    </button>
                    <button
                      aria-label="Delete"
                      className="text-gray-500 hover:text-red-600"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(v.id);
                      }}
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

      {editMode && (
        <div className="flex justify-end p-2">
          <button
            className="inline-flex items-center rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
            onClick={onNew}
          >
            <Plus size={16} className="mr-1" />
            New Version
          </button>
        </div>
      )}
    </div>
  );
}

"use client";

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
    <div className="mb-4 border rounded-md p-3 bg-gray-50">
      <div className="flex justify-between items-center mb-2">
        <h2 className="font-semibold">Framework Versions</h2>
        <button
          onClick={onToggleEdit}
          className="text-sm text-gray-600 hover:text-gray-800"
        >
          {editMode ? "Exit edit mode" : "Enter edit mode"}
        </button>
      </div>

      <div className="space-y-2">
        {versions.map((v) => (
          <div
            key={v.id}
            className={`flex items-center justify-between px-2 py-1 rounded cursor-pointer ${
              v.id === selectedId ? "bg-blue-100" : "hover:bg-gray-100"
            }`}
            onClick={() => onSelect(v.id)}
          >
            <div>
              <div className="font-medium">{v.name}</div>
              <div className="text-xs text-gray-500">
                {v.status} • {new Date(v.created_at).toLocaleDateString()}
              </div>
            </div>

            {editMode && (
              <div className="flex space-x-2">
                <button
                  className="text-xs text-gray-600 hover:text-gray-800"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(v.id);
                  }}
                >
                  Edit
                </button>
                <button
                  className="text-xs text-gray-600 hover:text-gray-800"
                  onClick={(e) => {
                    e.stopPropagation();
                    onClone(v.id);
                  }}
                >
                  Clone
                </button>
                <button
                  className="text-xs text-gray-600 hover:text-gray-800"
                  onClick={(e) => {
                    e.stopPropagation();
                    onPublish(v.id);
                  }}
                >
                  Publish
                </button>
                <button
                  className="text-xs text-red-600 hover:text-red-800"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(v.id);
                  }}
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {editMode && (
        <div className="mt-3">
          <button
            onClick={onNew}
            className="px-3 py-1 text-sm rounded bg-blue-600 text-white hover:bg-blue-700"
          >
            + New Version
          </button>
        </div>
      )}
    </div>
  );
}

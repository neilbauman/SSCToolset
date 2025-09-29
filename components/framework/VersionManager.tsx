"use client";

import { useState } from "react";
import { FrameworkVersion } from "@/lib/types/framework";
import EditVersionModal from "./EditVersionModal";

type Props = {
  versions: FrameworkVersion[];
  selectedId: string;
  editMode: boolean;
  onSelect: (id: string) => void;
  onNew: () => void;
  onClone: (id: string) => void;
  onDelete: (id: string) => void;
  onPublish: (id: string) => void;
  onEdit: (id: string, newName: string) => void; // 🔑 add callback
};

export default function VersionManager({
  versions,
  selectedId,
  editMode,
  onSelect,
  onNew,
  onClone,
  onDelete,
  onPublish,
  onEdit,
}: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const editingVersion = versions.find((v) => v.id === editingId);

  return (
    <div className="bg-white rounded-md border border-gray-200 p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold">Framework Versions</h2>
        {editMode && (
          <button
            className="px-3 py-1.5 text-sm rounded bg-blue-600 text-white hover:bg-blue-700"
            onClick={onNew}
          >
            + New Version
          </button>
        )}
      </div>

      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-gray-700">
          <tr>
            <th className="px-3 py-2 text-left">Name</th>
            <th className="px-3 py-2">Status</th>
            <th className="px-3 py-2">Created</th>
            <th className="px-3 py-2">Updated</th>
            <th className="px-3 py-2 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {versions.map((v) => (
            <tr
              key={v.id}
              className={`cursor-pointer ${
                v.id === selectedId ? "bg-blue-50" : ""
              }`}
              onClick={() => onSelect(v.id)}
            >
              <td className="px-3 py-2">{v.name}</td>
              <td className="px-3 py-2">
                <span className="px-2 py-1 rounded text-xs bg-yellow-100 text-yellow-800">
                  {v.status}
                </span>
              </td>
              <td className="px-3 py-2">
                {new Date(v.created_at).toISOString().slice(0, 10)}
              </td>
              <td className="px-3 py-2">
                {v.updated_at
                  ? new Date(v.updated_at).toISOString().slice(0, 10)
                  : "-"}
              </td>
              <td
                className="px-3 py-2 text-right space-x-2"
                onClick={(e) => e.stopPropagation()}
              >
                {editMode && (
                  <>
                    <button
                      className="text-gray-500 hover:text-blue-600"
                      onClick={() => setEditingId(v.id)}
                    >
                      ✎
                    </button>
                    <button
                      className="text-gray-500 hover:text-green-600"
                      onClick={() => onClone(v.id)}
                    >
                      ⧉
                    </button>
                    <button
                      className="text-gray-500 hover:text-green-600"
                      onClick={() => onPublish(v.id)}
                    >
                      ⬆
                    </button>
                    <button
                      className="text-gray-500 hover:text-red-600"
                      onClick={() => onDelete(v.id)}
                    >
                      🗑
                    </button>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* 🔑 Edit modal */}
      {editingVersion && (
        <EditVersionModal
          open={!!editingVersion}
          initialName={editingVersion.name}
          onClose={() => setEditingId(null)}
          onSave={async (newName) => {
            onEdit(editingVersion.id, newName);
            setEditingId(null);
          }}
        />
      )}
    </div>
  );
}

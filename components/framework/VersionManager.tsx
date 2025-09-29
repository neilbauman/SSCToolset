"use client";

import { useState } from "react";
import type { FrameworkVersion } from "@/lib/types/framework";
import { Pencil, Trash2, Copy, CheckCircle2, Plus } from "lucide-react";

type Props = {
  versions: FrameworkVersion[];
  selectedId: string;
  editMode: boolean;
  onSelect: (id: string) => void;
  onNew: (name: string) => Promise<void>;
  onEdit: (id: string, name: string) => Promise<void>;
  onClone: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onPublish: (id: string) => Promise<void>;
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
  const [showNewModal, setShowNewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState<null | string>(null);
  const [draftName, setDraftName] = useState("");

  const selected = versions.find((v) => v.id === selectedId);

  return (
    <div className="mb-4 border rounded-md p-3 bg-white shadow-sm">
      <h2 className="text-sm font-semibold text-gray-700 mb-2">
        Framework Versions
      </h2>

      {/* Versions Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-700">
            <tr>
              <th className="px-2 py-1 text-left font-medium">Name</th>
              <th className="px-2 py-1 text-left font-medium">Status</th>
              <th className="px-2 py-1 text-left font-medium">Created</th>
              <th className="px-2 py-1 text-left font-medium">Updated</th>
              {editMode && (
                <th className="px-2 py-1 text-right font-medium">Actions</th>
              )}
            </tr>
          </thead>
          <tbody>
            {versions.map((v) => (
              <tr
                key={v.id}
                className={`border-t ${
                  v.id === selectedId ? "bg-blue-50" : ""
                }`}
              >
                <td
                  className="px-2 py-1 cursor-pointer hover:underline"
                  onClick={() => onSelect(v.id)}
                >
                  {v.name}
                </td>
                <td className="px-2 py-1">{v.status}</td>
                <td className="px-2 py-1">
                  {new Date(v.created_at).toLocaleDateString()}
                </td>
                <td className="px-2 py-1">
                  {v.updated_at
                    ? new Date(v.updated_at).toLocaleDateString()
                    : "—"}
                </td>
                {editMode && (
                  <td className="px-2 py-1 text-right space-x-2">
                    <button
                      className="text-gray-500 hover:text-blue-600"
                      title="Edit"
                      onClick={() => {
                        setDraftName(v.name);
                        setShowEditModal(v.id);
                      }}
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      className="text-gray-500 hover:text-purple-600"
                      title="Clone"
                      onClick={() => onClone(v.id)}
                    >
                      <Copy size={16} />
                    </button>
                    <button
                      className="text-gray-500 hover:text-green-600"
                      title="Publish"
                      onClick={() => onPublish(v.id)}
                    >
                      <CheckCircle2 size={16} />
                    </button>
                    <button
                      className="text-gray-500 hover:text-red-600"
                      title="Delete"
                      onClick={() => onDelete(v.id)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* New Version button (edit mode only) */}
      {editMode && (
        <div className="mt-3">
          <button
            className="inline-flex items-center rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
            onClick={() => {
              setDraftName("");
              setShowNewModal(true);
            }}
          >
            <Plus size={16} className="mr-1" />
            New Version
          </button>
        </div>
      )}

      {/* New Version Modal */}
      {showNewModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-md p-4 w-96 shadow-lg">
            <h3 className="text-sm font-semibold mb-2">Create New Version</h3>
            <input
              type="text"
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              placeholder="Enter version name"
              className="w-full border rounded px-2 py-1 text-sm mb-3"
            />
            <div className="flex justify-end space-x-2">
              <button
                className="px-3 py-1 text-sm border rounded hover:bg-gray-100"
                onClick={() => setShowNewModal(false)}
              >
                Cancel
              </button>
              <button
                className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                onClick={async () => {
                  await onNew(draftName || "Untitled Version");
                  setShowNewModal(false);
                }}
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Version Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-md p-4 w-96 shadow-lg">
            <h3 className="text-sm font-semibold mb-2">Edit Version</h3>
            <input
              type="text"
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              placeholder="Enter new name"
              className="w-full border rounded px-2 py-1 text-sm mb-3"
            />
            <div className="flex justify-end space-x-2">
              <button
                className="px-3 py-1 text-sm border rounded hover:bg-gray-100"
                onClick={() => setShowEditModal(null)}
              >
                Cancel
              </button>
              <button
                className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                onClick={async () => {
                  await onEdit(showEditModal, draftName || "Untitled Version");
                  setShowEditModal(null);
                }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

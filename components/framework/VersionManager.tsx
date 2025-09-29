"use client";

import { FrameworkVersion } from "@/lib/types/framework";
import { Pencil, Copy, Check, Trash2, Plus } from "lucide-react";
import { useState } from "react";

type Props = {
  versions: FrameworkVersion[];
  selectedId: string;
  editMode: boolean;
  onSelect: (id: string) => void;
  onNew: (name: string) => void;
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
  const [showModal, setShowModal] = useState(false);
  const [newName, setNewName] = useState("");

  const handleSubmit = () => {
    if (newName.trim()) {
      onNew(newName.trim());
      setNewName("");
      setShowModal(false);
    }
  };

  return (
    <div className="border border-gray-200 rounded-md mb-4">
      <div className="flex items-center justify-between px-3 py-2 border-b bg-gray-50">
        <span className="font-medium text-sm">Framework Versions</span>
        {editMode && (
          <button
            onClick={() => setShowModal(true)}
            className="ml-2 inline-flex items-center rounded-md bg-blue-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-blue-700"
          >
            <Plus size={14} className="mr-1" />
            New Version
          </button>
        )}
      </div>

      <table className="w-full text-sm">
        <thead className="bg-gray-100 text-gray-700">
          <tr>
            <th className="px-3 py-2 text-left w-2/6">Name</th>
            <th className="px-3 py-2 text-left w-1/6">Status</th>
            <th className="px-3 py-2 text-left w-1/6">Created</th>
            <th className="px-3 py-2 text-left w-1/6">Updated</th>
            <th className="px-3 py-2 text-right w-1/6">Actions</th>
          </tr>
        </thead>
        <tbody>
          {versions.map((v) => {
            const isSelected = v.id === selectedId;
            const badge =
              v.status === "published" ? (
                <span className="bg-green-50 text-green-700 px-2 py-0.5 rounded-full text-xs border border-green-200">
                  published
                </span>
              ) : (
                <span className="bg-yellow-50 text-yellow-700 px-2 py-0.5 rounded-full text-xs border border-yellow-200">
                  draft
                </span>
              );
            return (
              <tr
                key={v.id}
                onClick={() => onSelect(v.id)}
                className={`cursor-pointer ${
                  isSelected ? "bg-blue-50" : "hover:bg-gray-50"
                }`}
              >
                <td className="px-3 py-2">{v.name}</td>
                <td className="px-3 py-2">{badge}</td>
                <td className="px-3 py-2">
                  {new Date(v.created_at).toISOString().slice(0, 10)}
                </td>
                <td className="px-3 py-2">
                  {v.updated_at
                    ? new Date(v.updated_at).toISOString().slice(0, 10)
                    : "-"}
                </td>
                <td className="px-3 py-2 text-right">
                  {editMode ? (
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onEdit(v.id);
                        }}
                        title="Edit"
                        className="text-gray-500 hover:text-gray-700"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onClone(v.id);
                        }}
                        title="Clone"
                        className="text-gray-500 hover:text-gray-700"
                      >
                        <Copy size={14} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onPublish(v.id);
                        }}
                        title="Publish"
                        className="text-green-600 hover:text-green-800"
                      >
                        <Check size={14} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(v.id);
                        }}
                        title="Delete"
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ) : (
                    <span className="text-gray-300">—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Modal for new version */}
      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
          <div className="bg-white rounded-md p-6 w-96 shadow-lg">
            <h2 className="text-lg font-medium mb-4">Create New Version</h2>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Version name"
              className="w-full border rounded-md px-3 py-2 mb-4"
            />
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setShowModal(false)}
                className="px-3 py-1 rounded-md border border-gray-300 text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                className="px-3 py-1 rounded-md bg-blue-600 text-white hover:bg-blue-700"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

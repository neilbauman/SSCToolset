"use client";

import { useState } from "react";
import { FrameworkVersion } from "@/lib/types/framework";

type Props = {
  versions: FrameworkVersion[];
  selectedId: string;
  editMode: boolean;
  onSelect: (id: string) => void;
  onNew: (name: string) => Promise<void>;
  onEdit: (id: string, name: string) => Promise<void>;
  onClone: (id: string) => void; // ✅ modal-based flow
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
  const [newName, setNewName] = useState("");

  return (
    <div className="w-full border rounded-md p-3 bg-gray-50">
      <div className="flex items-center justify-between mb-2">
        <h2 className="font-semibold text-gray-700">Framework Versions</h2>
        {editMode && (
          <div className="flex space-x-2">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="New version name"
              className="border px-2 py-1 text-sm rounded"
            />
            <button
              onClick={() => {
                if (newName.trim()) {
                  onNew(newName.trim());
                  setNewName("");
                }
              }}
              className="bg-blue-600 text-white px-3 py-1 rounded text-sm"
            >
              Add
            </button>
          </div>
        )}
      </div>

      <table className="w-full text-sm border">
        <thead className="bg-gray-100">
          <tr>
            <th className="px-2 py-1 text-left">Name</th>
            <th className="px-2 py-1 text-left">Status</th>
            <th className="px-2 py-1 text-left">Created</th>
            <th className="px-2 py-1 text-left">Updated</th>
            {editMode && <th className="px-2 py-1 text-right">Actions</th>}
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
              <td className="px-2 py-1">{v.name}</td>
              <td className="px-2 py-1">{v.status}</td>
              <td className="px-2 py-1">
                {new Date(v.created_at).toLocaleDateString()}
              </td>
              <td className="px-2 py-1">
                {v.updated_at
                  ? new Date(v.updated_at).toLocaleDateString()
                  : "-"}
              </td>
              {editMode && (
                <td className="px-2 py-1 text-right space-x-2">
                  <button
                    className="text-xs text-blue-600"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(v.id, prompt("Edit name:", v.name) || v.name);
                    }}
                  >
                    Edit
                  </button>
                  <button
                    className="text-xs text-purple-600"
                    onClick={(e) => {
                      e.stopPropagation();
                      onClone(v.id);
                    }}
                  >
                    Clone
                  </button>
                  <button
                    className="text-xs text-green-600"
                    onClick={(e) => {
                      e.stopPropagation();
                      onPublish(v.id);
                    }}
                  >
                    Publish
                  </button>
                  <button
                    className="text-xs text-red-600"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(v.id);
                    }}
                  >
                    Delete
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

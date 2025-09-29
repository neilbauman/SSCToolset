// components/framework/VersionManager.tsx
"use client";

import { useState } from "react";
import { FrameworkVersion } from "@/lib/types/framework";
import { ChevronDown, ChevronUp, Pencil, Copy, Trash2, Plus, CheckCircle } from "lucide-react";

type Props = {
  versions: FrameworkVersion[];
  selectedId: string;
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
  onSelect,
  onNew,
  onEdit,
  onClone,
  onDelete,
  onPublish,
}: Props) {
  const [showTable, setShowTable] = useState(false);

  const selected = versions.find((v) => v.id === selectedId);

  return (
    <div className="w-full mb-4">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <select
            className="border border-gray-300 rounded-md px-2 py-1 text-sm"
            value={selectedId}
            onChange={(e) => onSelect(e.target.value)}
          >
            {versions.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name} ({v.status})
              </option>
            ))}
          </select>

          {selected && (
            <span
              className={`px-2 py-0.5 text-xs rounded ${
                selected.status === "draft"
                  ? "bg-yellow-100 text-yellow-700"
                  : "bg-green-100 text-green-700"
              }`}
            >
              {selected.status}
            </span>
          )}

          <button
            onClick={() => setShowTable((prev) => !prev)}
            className="text-sm text-gray-600 hover:text-gray-800 flex items-center"
          >
            {showTable ? (
              <>
                <ChevronUp size={16} className="mr-1" /> Hide Versions
              </>
            ) : (
              <>
                <ChevronDown size={16} className="mr-1" /> Manage Versions
              </>
            )}
          </button>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={onNew}
            className="px-3 py-1.5 rounded bg-blue-600 text-white text-sm hover:bg-blue-700"
          >
            New (Scratch)
          </button>
          <button
            onClick={() => selectedId && onClone(selectedId)}
            className="px-3 py-1.5 rounded bg-gray-200 text-sm hover:bg-gray-300"
          >
            Clone
          </button>
          <button
            onClick={() => selectedId && onPublish(selectedId)}
            className="px-3 py-1.5 rounded bg-green-600 text-white text-sm hover:bg-green-700"
          >
            Publish
          </button>
        </div>
      </div>

      {/* Collapsible Version Table */}
      {showTable && (
        <div className="mt-4 border border-gray-200 rounded-md overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="py-2 px-3 text-left font-medium">Name</th>
                <th className="py-2 px-3 text-left font-medium">Status</th>
                <th className="py-2 px-3 text-left font-medium">Created</th>
                <th className="py-2 px-3 text-left font-medium">Updated</th>
                <th className="py-2 px-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {versions.map((v) => (
                <tr
                  key={v.id}
                  className={`border-t hover:bg-gray-50 ${
                    v.id === selectedId ? "bg-blue-50" : ""
                  }`}
                >
                  <td
                    className="py-2 px-3 cursor-pointer"
                    onClick={() => {
                      onSelect(v.id);
                      setShowTable(false); // auto-collapse when selecting
                    }}
                  >
                    {v.name}
                  </td>
                  <td className="py-2 px-3">
                    <span
                      className={`px-2 py-0.5 text-xs rounded ${
                        v.status === "draft"
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-green-100 text-green-700"
                      }`}
                    >
                      {v.status}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-gray-500 text-xs">
                    {v.created_at
                      ? new Date(v.created_at).toLocaleDateString()
                      : "-"}
                  </td>
                  <td className="py-2 px-3 text-gray-500 text-xs">
                    {v.updated_at
                      ? new Date(v.updated_at).toLocaleDateString()
                      : "-"}
                  </td>
                  <td className="py-2 px-3 text-right space-x-2">
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
                      <CheckCircle size={16} />
                    </button>
                    <button
                      onClick={() => onDelete(v.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="p-3 border-t bg-gray-50 flex justify-end">
            <button
              onClick={onNew}
              className="px-3 py-1.5 rounded bg-blue-600 text-white text-sm hover:bg-blue-700"
            >
              + Create New from Scratch
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

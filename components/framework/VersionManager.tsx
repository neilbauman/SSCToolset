"use client";

import { useState } from "react";
import { FrameworkVersion } from "@/lib/types/framework";
import {
  Pencil,
  Copy,
  CheckCircle,
  Trash2,
  Ban,
  Eye,
  EyeOff,
} from "lucide-react";

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
  const [showVersions, setShowVersions] = useState(true);

  return (
    <div className="mb-4 border rounded-md border-gray-200">
      {/* Dropdown + toggle */}
      <div className="flex items-center justify-between px-3 py-2 border-b bg-gray-50">
        <div className="flex items-center space-x-3">
          <select
            className="border border-gray-300 rounded px-2 py-1 text-sm"
            value={selectedId}
            onChange={(e) => onSelect(e.target.value)}
          >
            {versions.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name} ({v.status})
              </option>
            ))}
          </select>
          <button
            className="text-sm text-gray-600 hover:text-gray-800"
            onClick={() => setShowVersions((s) => !s)}
          >
            {showVersions ? (
              <>
                <EyeOff size={14} className="inline mr-1" />
                Hide Versions
              </>
            ) : (
              <>
                <Eye size={14} className="inline mr-1" />
                Show Versions
              </>
            )}
          </button>
        </div>
      </div>

      {/* Versions table */}
      {showVersions && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-3 py-2 text-left">Name</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-left">Created</th>
                <th className="px-3 py-2 text-left">Updated</th>
                <th className="px-3 py-2 text-right">Actions</th>
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
                  <td className="px-3 py-2">{v.name}</td>
                  <td className="px-3 py-2">
                    <span className="px-2 py-1 text-xs rounded bg-yellow-100 text-yellow-800">
                      {v.status}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    {v.created_at ? v.created_at.split("T")[0] : "-"}
                  </td>
                  <td className="px-3 py-2">
                    {v.updated_at ? v.updated_at.split("T")[0] : "-"}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex items-center justify-end space-x-2">
                      {editMode ? (
                        <>
                          <button
                            aria-label="Edit"
                            onClick={() => onEdit(v.id)}
                            className="text-gray-500 hover:text-gray-700"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            aria-label="Clone"
                            onClick={() => onClone(v.id)}
                            className="text-gray-500 hover:text-gray-700"
                          >
                            <Copy size={16} />
                          </button>
                          <button
                            aria-label="Publish"
                            onClick={() => onPublish(v.id)}
                            className="text-green-600 hover:text-green-800"
                          >
                            <CheckCircle size={16} />
                          </button>
                          <button
                            aria-label="Delete"
                            onClick={() => onDelete(v.id)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 size={16} />
                          </button>
                        </>
                      ) : (
                        <>
                          <Ban size={16} className="text-gray-300" />
                          <Ban size={16} className="text-gray-300" />
                          <Ban size={16} className="text-gray-300" />
                          <Ban size={16} className="text-gray-300" />
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              <tr>
                <td colSpan={5} className="px-3 py-2 text-center">
                  <button
                    className="inline-flex items-center rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
                    onClick={onNew}
                  >
                    + Create New from Scratch
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

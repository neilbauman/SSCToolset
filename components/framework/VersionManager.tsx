"use client";

import React from "react";
import { Pencil, Copy, CheckCircle, Trash2, Plus } from "lucide-react";
import type { FrameworkVersion } from "@/lib/types/framework";

type Props = {
  versions: FrameworkVersion[];
  selectedId: string;
  editMode: boolean;
  onSelect: (id: string) => void;
  onNew: (name: string) => Promise<void>;
  onEdit: (id: string, name: string) => Promise<void>;
  onClone: (id: string, name: string) => Promise<void>;
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
  return (
    <div className="border border-gray-200 rounded-md overflow-hidden bg-white mb-4">
      <div className="flex items-center justify-between px-3 py-2 border-b bg-gray-50">
        <h3 className="font-medium text-gray-700">Framework Versions</h3>
        {editMode && (
          <button
            onClick={async () => {
              const name = prompt("Enter name for new framework version:");
              if (name) await onNew(name);
            }}
            className="inline-flex items-center rounded-md bg-blue-600 px-2 py-1 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Plus size={16} className="mr-1" />
            New Version
          </button>
        )}
      </div>
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-left text-gray-600">
          <tr>
            <th className="px-3 py-2 font-medium">Name</th>
            <th className="px-3 py-2 font-medium">Status</th>
            <th className="px-3 py-2 font-medium">Created</th>
            <th className="px-3 py-2 font-medium">Updated</th>
            {editMode && <th className="px-3 py-2 font-medium">Actions</th>}
          </tr>
        </thead>
        <tbody>
          {versions.map((v) => (
            <tr
              key={v.id}
              className={`border-t cursor-pointer ${
                v.id === selectedId ? "bg-blue-50" : "hover:bg-gray-50"
              }`}
              onClick={() => onSelect(v.id)}
            >
              <td className="px-3 py-2">{v.name}</td>
              <td className="px-3 py-2">
                <span className="px-2 py-[2px] rounded-full text-xs bg-yellow-50 text-yellow-700 border border-yellow-200">
                  {v.status}
                </span>
              </td>
              <td className="px-3 py-2">{v.created_at?.split("T")[0]}</td>
              <td className="px-3 py-2">{v.updated_at?.split("T")[0] ?? "-"}</td>
              {editMode && (
                <td className="px-3 py-2">
                  <div className="flex items-center space-x-2">
                    <button
                      className="text-gray-500 hover:text-gray-700"
                      onClick={(e) => {
                        e.stopPropagation();
                        const newName = prompt("Rename version:", v.name);
                        if (newName) onEdit(v.id, newName);
                      }}
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      className="text-gray-500 hover:text-gray-700"
                      onClick={(e) => {
                        e.stopPropagation();
                        const newName = prompt("Name for cloned version:");
                        if (newName) onClone(v.id, newName);
                      }}
                    >
                      <Copy size={16} />
                    </button>
                    <button
                      className="text-green-600 hover:text-green-800"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm("Publish this version?")) onPublish(v.id);
                      }}
                    >
                      <CheckCircle size={16} />
                    </button>
                    <button
                      className="text-red-600 hover:text-red-800"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm("Delete this version?")) onDelete(v.id);
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

"use client";

import { useState } from "react";
import {
  createVersion,
  cloneVersion,
  deleteVersion,
  publishVersion,
  updateVersion,
} from "@/lib/services/framework";
import type { FrameworkVersion } from "@/lib/types/framework";
import { Plus, Pencil, Copy, Trash2, Upload } from "lucide-react";
import NewVersionModal from "./NewVersionModal";
import EditVersionModal from "./EditVersionModal";
import CloneVersionModal from "./CloneVersionModal";

type Props = {
  versions: FrameworkVersion[];
  openedId?: string;
  onSelect: (id: string | null) => void;
  onRefresh: () => Promise<void>;
  editMode: boolean;
  onToggleEdit: () => void;
};

export default function VersionManager({
  versions,
  openedId,
  onSelect,
  onRefresh,
  editMode,
  onToggleEdit,
}: Props) {
  const [showNewModal, setShowNewModal] = useState(false);
  const [editingVersion, setEditingVersion] = useState<FrameworkVersion | null>(
    null
  );
  const [cloningVersion, setCloningVersion] = useState<FrameworkVersion | null>(
    null
  );

  const handleDelete = async (id: string, name: string) => {
    const confirmed = confirm(
      `Are you sure you want to delete version "${name}"?\n\nThis will permanently remove the version and all its framework items.`
    );
    if (!confirmed) return;

    try {
      await deleteVersion(id);
      if (onRefresh) await onRefresh();
      if (openedId === id) onSelect(null);
    } catch (err: any) {
      console.error("Error deleting version:", err.message);
      alert("Delete failed: " + err.message);
    }
  };

  const handlePublish = async (id: string, publish: boolean) => {
    try {
      await publishVersion(id, publish);
      await onRefresh();
    } catch (err: any) {
      console.error("Error publishing version:", err.message);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-lg font-semibold">Primary Framework Versions</h2>
        <div className="flex gap-2">
          <button
            className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-sm flex items-center gap-1"
            onClick={onToggleEdit}
          >
            <Pencil size={14} />
            {editMode ? "Exit Edit Mode" : "Enter Edit Mode"}
          </button>
          {editMode && (
            <button
              className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm flex items-center gap-1"
              onClick={() => setShowNewModal(true)}
            >
              <Plus size={14} /> Add
            </button>
          )}
        </div>
      </div>

      {/* Versions Table */}
      <div className="border rounded-md overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b text-left">
            <tr>
              <th className="px-3 py-2 w-[30%]">Name</th>
              <th className="px-3 py-2 w-[15%]">Status</th>
              <th className="px-3 py-2 w-[20%]">Created</th>
              <th className="px-3 py-2 w-[20%]">Last Revised</th>
              <th className="px-3 py-2 w-[15%] text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {versions.map((v) => (
              <tr
                key={v.id}
                className={`cursor-pointer ${
                  openedId === v.id ? "bg-blue-50" : ""
                }`}
                onClick={() => onSelect(v.id)}
              >
                {/* Name */}
                <td className="px-3 py-2">
                  <div className="font-medium">{v.name}</div>
                </td>

                {/* Status */}
                <td className="px-3 py-2">
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-medium ${
                      v.status === "published"
                        ? "bg-green-100 text-green-700"
                        : "bg-yellow-100 text-yellow-700"
                    }`}
                  >
                    {v.status}
                  </span>
                </td>

                {/* Created */}
                <td className="px-3 py-2">
                  {new Date(v.created_at).toISOString().slice(0, 10)}
                </td>

                {/* Last Revised */}
                <td className="px-3 py-2">
                  {v.updated_at
                    ? new Date(v.updated_at).toISOString().slice(0, 10)
                    : "-"}
                </td>

                {/* Actions */}
                <td
                  className="px-3 py-2 flex justify-end gap-2"
                  onClick={(e) => e.stopPropagation()} // prevent row select
                >
                  {editMode && (
                    <>
                      {/* Edit */}
                      <button
                        onClick={() => setEditingVersion(v)}
                        className="text-gray-600 hover:text-blue-600"
                        title="Edit"
                      >
                        <Pencil size={16} />
                      </button>

                      {/* Clone */}
                      <button
                        onClick={() => setCloningVersion(v)}
                        className="text-gray-600 hover:text-gray-800"
                        title="Clone"
                      >
                        <Copy size={16} />
                      </button>

                      {/* Delete */}
                      <button
                        onClick={() => handleDelete(v.id, v.name)}
                        className="text-gray-600 hover:text-red-600"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>

                      {/* Publish/Unpublish */}
                      <button
                        onClick={() =>
                          handlePublish(v.id, v.status !== "published")
                        }
                        className="text-gray-600 hover:text-green-600"
                        title={
                          v.status === "published" ? "Unpublish" : "Publish"
                        }
                      >
                        <Upload size={16} />
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modals */}
      {showNewModal && (
        <NewVersionModal
          onClose={() => setShowNewModal(false)}
          onSubmit={async (name) => {
            await createVersion(name);
            await onRefresh();
            setShowNewModal(false);
          }}
        />
      )}
      {editingVersion && (
        <EditVersionModal
          initialName={editingVersion.name}
          onClose={() => setEditingVersion(null)}
          onSubmit={async (name) => {
            await updateVersion(editingVersion.id, { name });
            await onRefresh();
            setEditingVersion(null);
          }}
        />
      )}
      {cloningVersion && (
        <CloneVersionModal
          initialName={`${cloningVersion.name} (copy)`}
          onClose={() => setCloningVersion(null)}
          onSubmit={async (name) => {
            await cloneVersion(cloningVersion.id, name);
            await onRefresh();
            setCloningVersion(null);
          }}
        />
      )}
    </div>
  );
}

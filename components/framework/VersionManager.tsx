"use client";

import { useState } from "react";
import { FrameworkVersion } from "@/lib/types/framework";
import {
  Eye,
  EyeOff,
  Edit,
  Copy,
  Trash2,
  Upload,
  FilePlus,
} from "lucide-react";
import NewVersionModal from "./NewVersionModal";
import EditVersionModal from "./EditVersionModal";
import CloneVersionModal from "./CloneVersionModal";

type Props = {
  versions: FrameworkVersion[];
  selectedId: string;
  editMode: boolean;
  onToggleEdit: () => void;
  onSelect: (id: string) => void;
  onNew: (name: string) => Promise<void>;
  onEdit: (id: string, patch: { name?: string }) => Promise<void>;
  onClone: (id: string, newName: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onPublish: (id: string, publish: boolean) => Promise<void>;
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
  const [panelOpen, setPanelOpen] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [editTarget, setEditTarget] = useState<FrameworkVersion | null>(null);
  const [cloneTarget, setCloneTarget] = useState<FrameworkVersion | null>(null);

  return (
    <div className="mb-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-semibold text-gray-800">Framework Versions</h2>
        <div className="flex items-center space-x-2">
          {editMode ? (
            <button
              onClick={onToggleEdit}
              className="text-sm text-gray-600 hover:text-gray-800"
            >
              Exit edit mode
            </button>
          ) : (
            <button
              onClick={onToggleEdit}
              className="text-sm text-gray-600 hover:text-gray-800"
            >
              Enter edit mode
            </button>
          )}
          {editMode && (
            <button
              onClick={() => setShowNew(true)}
              className="inline-flex items-center rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
            >
              <FilePlus size={16} className="mr-1" />
              New
            </button>
          )}
          <button
            onClick={() => setPanelOpen(!panelOpen)}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            {panelOpen ? (
              <EyeOff size={16} className="inline mr-1" />
            ) : (
              <Eye size={16} className="inline mr-1" />
            )}
            {panelOpen ? "Hide" : "Show"}
          </button>
        </div>
      </div>

      {/* Versions Table */}
      {panelOpen && (
        <div className="overflow-x-auto rounded-md border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-700">
              <tr>
                <th className="px-3 py-2 text-left font-medium w-1/3">Name</th>
                <th className="px-3 py-2 text-left font-medium w-1/6">Status</th>
                <th className="px-3 py-2 text-left font-medium w-1/6">Created</th>
                <th className="px-3 py-2 text-left font-medium w-1/6">Updated</th>
                <th className="px-3 py-2 text-right font-medium w-1/6">Actions</th>
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
                  <td className="px-3 py-2 font-medium text-gray-900">{v.name}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        v.status === "published"
                          ? "bg-green-100 text-green-700 border border-green-200"
                          : "bg-yellow-100 text-yellow-700 border border-yellow-200"
                      }`}
                    >
                      {v.status === "published" ? "Published" : "Draft"}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-gray-600">
                    {new Date(v.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-3 py-2 text-gray-600">
                    {v.updated_at
                      ? new Date(v.updated_at).toLocaleDateString()
                      : "-"}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {editMode && (
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditTarget(v);
                          }}
                          className="text-gray-500 hover:text-gray-700"
                          title="Edit"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setCloneTarget(v);
                          }}
                          className="text-gray-500 hover:text-gray-700"
                          title="Clone"
                        >
                          <Copy size={16} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDelete(v.id);
                          }}
                          className="text-gray-500 hover:text-red-600"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onPublish(v.id, v.status !== "published");
                          }}
                          className="text-gray-500 hover:text-blue-600"
                          title="Toggle Publish"
                        >
                          <Upload size={16} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modals */}
      {showNew && (
        <NewVersionModal
          onClose={() => setShowNew(false)}
          onSubmit={async (name) => {
            await onNew(name);
            setShowNew(false);
          }}
        />
      )}

      {editTarget && (
        <EditVersionModal
          initialName={editTarget.name}
          onClose={() => setEditTarget(null)}
          onSubmit={async (name) => {
            await onEdit(editTarget.id, { name });
            setEditTarget(null);
          }}
        />
      )}

      {cloneTarget && (
        <CloneVersionModal
          initialName={`${cloneTarget.name} Copy`}
          onClose={() => setCloneTarget(null)}
          onSubmit={async (name) => {
            await onClone(cloneTarget.id, name);
            setCloneTarget(null);
          }}
        />
      )}
    </div>
  );
}

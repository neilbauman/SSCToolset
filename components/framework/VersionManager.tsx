"use client";

import { useState } from "react";
import type { FrameworkVersion } from "@/lib/types/framework";
import NewVersionModal from "./NewVersionModal";

type Props = {
  versions: FrameworkVersion[];
  selectedId: string;
  editMode: boolean;
  onSelect: (id: string) => void;
  onRefresh: () => Promise<void>;
  onClone: (id: string) => void;
  onDelete: (id: string) => void;
  onPublish: (id: string) => void;
};

export default function VersionManager({
  versions,
  selectedId,
  editMode,
  onSelect,
  onRefresh,
  onClone,
  onDelete,
  onPublish,
}: Props) {
  const [showModal, setShowModal] = useState(false);

  return (
    <div className="border rounded-md mb-4 bg-white shadow-sm">
      <div className="flex items-center justify-between px-3 py-2 border-b bg-gray-50">
        <h2 className="text-sm font-semibold">Framework Versions</h2>
        {editMode && (
          <button
            className="px-2 py-1 text-sm rounded bg-blue-600 text-white hover:bg-blue-700"
            onClick={() => setShowModal(true)}
          >
            + New Version
          </button>
        )}
      </div>

      <table className="w-full text-sm">
        <thead className="bg-gray-100 text-gray-700">
          <tr>
            <th className="text-left py-2 px-3">Name</th>
            <th className="text-left py-2 px-3">Status</th>
            <th className="text-left py-2 px-3">Created</th>
            {editMode && <th className="text-right py-2 px-3">Actions</th>}
          </tr>
        </thead>
        <tbody>
          {versions.map((v) => (
            <tr
              key={v.id}
              className={`border-t ${
                v.id === selectedId ? "bg-blue-50" : "hover:bg-gray-50"
              }`}
            >
              <td
                className="py-2 px-3 cursor-pointer"
                onClick={() => onSelect(v.id)}
              >
                {v.name}
              </td>
              <td className="py-2 px-3">{v.status}</td>
              <td className="py-2 px-3 text-xs text-gray-500">
                {new Date(v.created_at).toLocaleDateString()}
              </td>
              {editMode && (
                <td className="py-2 px-3 text-right space-x-2">
                  <button
                    className="text-gray-600 hover:text-blue-700"
                    onClick={() => onClone(v.id)}
                  >
                    Clone
                  </button>
                  <button
                    className="text-gray-600 hover:text-green-700"
                    onClick={() => onPublish(v.id)}
                  >
                    Publish
                  </button>
                  <button
                    className="text-gray-600 hover:text-red-700"
                    onClick={() => onDelete(v.id)}
                  >
                    Delete
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Modal */}
      <NewVersionModal
        open={showModal}
        onClose={() => setShowModal(false)}
        onCreated={async (id) => {
          await onRefresh();
          onSelect(id);
        }}
      />
    </div>
  );
}

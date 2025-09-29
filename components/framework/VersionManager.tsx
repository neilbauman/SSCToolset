"use client";

import { FrameworkVersion } from "@/lib/types/framework";

type Props = {
  versions: FrameworkVersion[];
  selectedId: string;
  editMode: boolean;
  onSelect: (id: string) => void;
  onNew: (name: string) => Promise<void>;
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
  return (
    <div className="w-full">
      <div className="overflow-x-auto rounded-md border border-gray-200">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-700">
            <tr>
              <th className="py-2 px-3 font-medium">Name</th>
              <th className="py-2 px-3 font-medium">Status</th>
              <th className="py-2 px-3 font-medium">Created</th>
              <th className="py-2 px-3 font-medium">Updated</th>
              {editMode && (
                <th className="py-2 px-3 font-medium text-right">Actions</th>
              )}
            </tr>
          </thead>
          <tbody>
            {versions.map((v) => (
              <tr
                key={v.id}
                className={`border-b last:border-b-0 cursor-pointer ${
                  v.id === selectedId ? "bg-blue-50" : "hover:bg-gray-50"
                }`}
                onClick={() => onSelect(v.id)}
              >
                <td className="py-2 px-3">{v.name}</td>
                <td className="py-2 px-3">
                  <span className="px-2 py-1 text-xs rounded bg-yellow-100 text-yellow-800">
                    {v.status}
                  </span>
                </td>
                <td className="py-2 px-3">
                  {new Date(v.created_at).toISOString().split("T")[0]}
                </td>
                <td className="py-2 px-3">
                  {v.updated_at
                    ? new Date(v.updated_at).toISOString().split("T")[0]
                    : "-"}
                </td>
                {editMode && (
                  <td className="py-2 px-3 text-right space-x-2">
                    <button
                      className="text-gray-500 hover:text-gray-700"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit(v.id);
                      }}
                    >
                      Edit
                    </button>
                    <button
                      className="text-gray-500 hover:text-gray-700"
                      onClick={(e) => {
                        e.stopPropagation();
                        onClone(v.id);
                      }}
                    >
                      Clone
                    </button>
                    <button
                      className="text-gray-500 hover:text-green-700"
                      onClick={(e) => {
                        e.stopPropagation();
                        onPublish(v.id);
                      }}
                    >
                      Publish
                    </button>
                    <button
                      className="text-gray-500 hover:text-red-700"
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
    </div>
  );
}

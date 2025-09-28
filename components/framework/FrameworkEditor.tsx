"use client";

import { useState } from "react";
import type { NormalizedFramework } from "@/lib/types/framework";

type Props = {
  tree: NormalizedFramework[];
  versionName?: string;
  versionStatus?: "draft" | "published";
  createdAt?: string;
};

export default function FrameworkEditor({
  tree,
  versionName,
  versionStatus,
  createdAt,
}: Props) {
  const [editMode, setEditMode] = useState(false);

  const statusBadge =
    versionStatus === "published" ? (
      <span className="ml-2 rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
        Published
      </span>
    ) : (
      <span className="ml-2 rounded bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800">
        Draft
      </span>
    );

  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
      {/* Version info header */}
      <div className="flex flex-wrap items-center justify-between border-b border-gray-200 px-4 py-3">
        <div className="flex items-center gap-2 text-sm text-gray-700">
          <span className="font-medium">{versionName ?? "Framework Version"}</span>
          {statusBadge}
          {createdAt && (
            <span className="ml-2 text-xs text-gray-500">Created: {createdAt}</span>
          )}
        </div>
        <div className="flex gap-2">
          <button className="rounded border border-gray-300 px-2 py-1 text-sm hover:bg-gray-50">
            Open Version
          </button>
          <button className="rounded border border-gray-300 px-2 py-1 text-sm hover:bg-gray-50">
            Clone
          </button>
          <button
            className={`rounded px-2 py-1 text-sm ${
              versionStatus === "published"
                ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                : "bg-blue-600 text-white hover:bg-blue-700"
            }`}
            disabled={versionStatus === "published"}
          >
            Publish
          </button>
          <button
            className={`rounded px-2 py-1 text-sm ${
              editMode
                ? "bg-red-600 text-white hover:bg-red-700"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
            onClick={() => setEditMode(!editMode)}
          >
            {editMode ? "Exit Edit Mode" : "Enter Edit Mode"}
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse text-sm">
          <thead>
            <tr className="bg-gray-50 text-left text-xs font-semibold text-gray-600">
              <th className="px-4 py-2 w-[25%]">Type / Ref Code</th>
              <th className="px-4 py-2 w-[45%]">Name / Description</th>
              <th className="px-4 py-2 w-[10%] text-center">Sort Order</th>
              <th className="px-4 py-2 w-[20%] text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {tree.map((pillar, pIdx) => (
              <tr key={pillar.id} className="border-b">
                <td className="px-4 py-2">
                  <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
                    Pillar
                  </span>{" "}
                  P{pIdx + 1}
                </td>
                <td className="px-4 py-2">
                  <div className="font-medium">{pillar.name}</div>
                  <div className="text-xs text-gray-500">{pillar.description}</div>
                </td>
                <td className="px-4 py-2 text-center">
                  {pillar.sort_order ?? "-"}
                </td>
                <td className="px-4 py-2 text-right">
                  {editMode && (
                    <button className="rounded px-2 py-1 text-xs text-gray-600 hover:bg-gray-100">
                      Edit
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import type { NormalizedFramework } from "@/lib/types/framework";
import { ChevronRight, ChevronDown, Edit, Trash2, Plus } from "lucide-react";

type Props = {
  tree: NormalizedFramework[];
  editMode: boolean;
  setEditMode: (val: boolean) => void;
};

export default function FrameworkEditor({ tree, editMode, setEditMode }: Props) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const toggleExpand = (id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const renderRows = (
    items: any[],
    level: number = 0,
    parentRef: string = ""
  ): JSX.Element[] => {
    return items.flatMap((item, index) => {
      const refCode =
        level === 0
          ? `P${index + 1}`
          : level === 1
          ? `${parentRef}.${index + 1}`
          : `${parentRef}.${index + 1}`;

      const isExpanded = expanded[item.id];
      const hasChildren =
        (level === 0 && item.themes?.length > 0) ||
        (level === 1 && item.subthemes?.length > 0);

      const children =
        (level === 0 && item.themes) || (level === 1 && item.subthemes) || [];

      const row = (
        <tr key={item.id} className="border-b">
          {/* Type / Ref Code */}
          <td style={{ width: "20%" }} className="px-3 py-2">
            <div className="flex items-center gap-2">
              {hasChildren && (
                <button
                  onClick={() => toggleExpand(item.id)}
                  className="text-gray-600"
                >
                  {isExpanded ? (
                    <ChevronDown size={16} />
                  ) : (
                    <ChevronRight size={16} />
                  )}
                </button>
              )}
              <span className="text-xs font-semibold uppercase text-gray-500">
                {level === 0 ? "Pillar" : level === 1 ? "Theme" : "Subtheme"}
              </span>
              <span className="text-sm font-mono text-gray-800">{refCode}</span>
            </div>
          </td>

          {/* Name / Description */}
          <td style={{ width: "50%" }} className="px-3 py-2">
            <div className="ml-2">
              <div className="font-medium">{item.name}</div>
              {item.description && (
                <div className="text-xs text-gray-500">{item.description}</div>
              )}
            </div>
          </td>

          {/* Sort Order */}
          <td
            style={{ width: "10%" }}
            className="px-3 py-2 text-center text-sm text-gray-700"
          >
            {item.sort_order ?? "-"}
          </td>

          {/* Actions */}
          <td style={{ width: "20%" }} className="px-3 py-2 text-right">
            {editMode ? (
              <div className="flex justify-end gap-2">
                <button className="text-blue-600 hover:text-blue-800">
                  <Edit size={16} />
                </button>
                <button className="text-red-600 hover:text-red-800">
                  <Trash2 size={16} />
                </button>
                {level < 2 && (
                  <button className="text-green-600 hover:text-green-800">
                    <Plus size={16} />
                  </button>
                )}
              </div>
            ) : (
              <span className="text-xs text-gray-400">—</span>
            )}
          </td>
        </tr>
      );

      const childRows =
        hasChildren && isExpanded
          ? renderRows(children, level + 1, refCode)
          : [];

      return [row, ...childRows];
    });
  };

  return (
    <div>
      {/* Controls */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex gap-2">
          <button
            onClick={() =>
              setExpanded(
                tree.reduce((acc, item) => {
                  acc[item.id] = true;
                  return acc;
                }, {} as Record<string, boolean>)
              )
            }
            className="text-sm text-blue-600 hover:underline"
          >
            Expand All
          </button>
          <button
            onClick={() => setExpanded({})}
            className="text-sm text-blue-600 hover:underline"
          >
            Collapse All
          </button>
        </div>
        <div className="flex gap-2">
          <button className="rounded bg-gray-200 px-3 py-1 text-sm">
            Open Version
          </button>
          <button className="rounded bg-gray-200 px-3 py-1 text-sm">
            Clone
          </button>
          <button className="rounded bg-gray-200 px-3 py-1 text-sm">
            Publish
          </button>
          <button
            onClick={() => setEditMode(!editMode)}
            className={`rounded px-3 py-1 text-sm ${
              editMode
                ? "bg-red-100 text-red-700"
                : "bg-blue-100 text-blue-700"
            }`}
          >
            {editMode ? "Exit Edit Mode" : "Enter Edit Mode"}
          </button>
        </div>
      </div>

      {/* Table */}
      <table className="w-full border text-sm">
        <thead className="bg-gray-100">
          <tr>
            <th className="px-3 py-2 text-left">Type / Ref Code</th>
            <th className="px-3 py-2 text-left">Name / Description</th>
            <th className="px-3 py-2 text-center">Sort Order</th>
            <th className="px-3 py-2 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>{renderRows(tree)}</tbody>
      </table>

      {/* Status badge */}
      <div className="mt-4">
        <span className="inline-block rounded px-2 py-1 text-xs font-semibold text-white bg-yellow-500">
          Draft
        </span>
        {/* Swap to green if Published */}
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { ChevronRight, ChevronDown, Edit2, Trash2, Copy } from "lucide-react";
import type { NormalizedFramework } from "@/lib/types/framework";

type Props = {
  tree: NormalizedFramework[];
};

export default function FrameworkEditor({ tree }: Props) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [editMode, setEditMode] = useState(false);

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

      const row = (
        <tr key={item.id} className="border-b">
          {/* Type / Ref Code */}
          <td
            className="px-3 py-2 text-sm text-gray-600"
            style={{ width: "20%" }}
          >
            <div className="flex items-center gap-2">
              {hasChildren && (
                <button
                  onClick={() => toggleExpand(item.id)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </button>
              )}
              {!hasChildren && (
                <span className="inline-block w-4 h-4" /> // keeps alignment
              )}
              <span
                className={`font-medium ${
                  level === 0
                    ? "text-indigo-700"
                    : level === 1
                    ? "text-green-700"
                    : "text-gray-700"
                }`}
              >
                {level === 0
                  ? "Pillar"
                  : level === 1
                  ? "Theme"
                  : "Subtheme"}{" "}
                {refCode}
              </span>
            </div>
          </td>

          {/* Name / Description */}
          <td
            className="px-3 py-2 text-sm"
            style={{ width: "45%" }}
          >
            <div className="ml-2">
              <div className="font-medium">{item.name}</div>
              {item.description && (
                <div className="text-xs text-gray-500">{item.description}</div>
              )}
            </div>
          </td>

          {/* Sort Order */}
          <td
            className="px-3 py-2 text-sm text-gray-600 text-center"
            style={{ width: "15%" }}
          >
            {item.sort_order ?? "-"}
          </td>

          {/* Actions */}
          <td
            className="px-3 py-2 text-sm text-gray-600"
            style={{ width: "20%" }}
          >
            <div className="flex justify-end gap-2">
              {editMode && (
                <>
                  <button className="text-blue-600 hover:text-blue-800">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button className="text-red-600 hover:text-red-800">
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <button className="text-gray-600 hover:text-gray-800">
                    <Copy className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          </td>
        </tr>
      );

      return [
        row,
        hasChildren && isExpanded
          ? renderRows(
              level === 0 ? item.themes : item.subthemes,
              level + 1,
              refCode
            )
          : null,
      ].filter(Boolean) as JSX.Element[];
    });
  };

  return (
    <div>
      {/* Controls */}
      <div className="flex justify-between items-center mb-3">
        <div className="flex gap-2">
          <button
            onClick={() =>
              setExpanded(
                tree.reduce((acc, p) => ({ ...acc, [p.id]: true }), {})
              )
            }
            className="px-2 py-1 text-xs rounded bg-gray-100 hover:bg-gray-200"
          >
            Expand All
          </button>
          <button
            onClick={() => setExpanded({})}
            className="px-2 py-1 text-xs rounded bg-gray-100 hover:bg-gray-200"
          >
            Collapse All
          </button>
        </div>
        <button
          onClick={() => setEditMode(!editMode)}
          className="px-2 py-1 text-xs rounded bg-blue-100 text-blue-700 hover:bg-blue-200"
        >
          {editMode ? "Exit Edit Mode" : "Enter Edit Mode"}
        </button>
      </div>

      {/* Table */}
      <table className="w-full border border-gray-200 rounded-lg text-left">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-3 py-2 text-sm font-semibold text-gray-700">
              Type / Ref Code
            </th>
            <th className="px-3 py-2 text-sm font-semibold text-gray-700">
              Name / Description
            </th>
            <th className="px-3 py-2 text-sm font-semibold text-gray-700 text-center">
              Sort Order
            </th>
            <th className="px-3 py-2 text-sm font-semibold text-gray-700 text-right">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>{renderRows(tree)}</tbody>
      </table>
    </div>
  );
}

"use client";

import { useState } from "react";
import type { NormalizedFramework } from "@/lib/types/framework";
import { ChevronRight, ChevronDown, Edit, Trash2, Plus } from "lucide-react";

type Props = {
  tree: NormalizedFramework[];
  editMode: boolean;
  setEditMode: (value: boolean) => void;
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
      const isExpanded = expanded[item.id];
      const hasChildren =
        (level === 0 && item.themes?.length > 0) ||
        (level === 1 && item.subthemes?.length > 0);

      // Generate ref codes
      const refCode =
        level === 0
          ? `P${index + 1}`
          : level === 1
          ? `T${parentRef}.${index + 1}`
          : `ST${parentRef}.${index + 1}`;

      // Badge style per type
      const badgeClass =
        level === 0
          ? "bg-blue-100 text-blue-800"
          : level === 1
          ? "bg-green-100 text-green-800"
          : "bg-purple-100 text-purple-800";

      const children =
        (level === 0 && item.themes) || (level === 1 && item.subthemes) || [];

      const row = (
        <tr key={item.id} className="border-b">
          {/* Type / Ref Code */}
          <td
            className="px-2 py-2 whitespace-nowrap text-sm text-gray-700"
            style={{ width: "20%" }}
          >
            <div className="flex items-center" style={{ marginLeft: `${level * 12}px` }}>
              {hasChildren && (
                <button
                  onClick={() => toggleExpand(item.id)}
                  className="mr-1 text-gray-500 hover:text-gray-700"
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </button>
              )}
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-medium ${badgeClass}`}
              >
                {level === 0 ? "Pillar" : level === 1 ? "Theme" : "Subtheme"}
              </span>
              <span className="ml-2 font-mono">{refCode}</span>
            </div>
          </td>

          {/* Name / Description */}
          <td
            className="px-2 py-2 text-sm"
            style={{ width: "50%" }}
          >
            <div className="font-medium text-gray-900">{item.name}</div>
            {item.description && (
              <div className="text-gray-500 text-xs">{item.description}</div>
            )}
          </td>

          {/* Sort Order */}
          <td
            className="px-2 py-2 text-sm text-gray-700 text-center"
            style={{ width: "15%" }}
          >
            {item.sort_order ?? "-"}
          </td>

          {/* Actions */}
          <td
            className="px-2 py-2 text-sm text-gray-700 text-right"
            style={{ width: "15%" }}
          >
            {editMode ? (
              <div className="flex justify-end gap-2">
                <button className="text-gray-500 hover:text-gray-700">
                  <Edit className="h-4 w-4" />
                </button>
                <button className="text-gray-500 hover:text-red-600">
                  <Trash2 className="h-4 w-4" />
                </button>
                {level < 2 && (
                  <button className="text-gray-500 hover:text-gray-700">
                    <Plus className="h-4 w-4" />
                  </button>
                )}
              </div>
            ) : (
              <span className="text-gray-300">—</span>
            )}
          </td>
        </tr>
      );

      return [
        row,
        ...(isExpanded
          ? renderRows(children, level + 1, refCode.replace(/^P|^T|^ST/, ""))
          : []),
      ];
    });
  };

  return (
    <div className="overflow-x-auto">
      <div className="flex justify-between items-center mb-3">
        <div className="flex gap-2">
          <button
            onClick={() =>
              setExpanded(
                tree.reduce((acc, item) => ({ ...acc, [item.id]: true }), {})
              )
            }
            className="text-sm text-gray-600 hover:underline"
          >
            Expand All
          </button>
          <button
            onClick={() => setExpanded({})}
            className="text-sm text-gray-600 hover:underline"
          >
            Collapse All
          </button>
        </div>
        <div>
          <button
            onClick={() => setEditMode(!editMode)}
            className="text-sm text-blue-600 hover:underline"
          >
            {editMode ? "Exit Edit Mode" : "Enter Edit Mode"}
          </button>
        </div>
      </div>

      <table className="min-w-full border rounded-lg">
        <thead className="bg-gray-50">
          <tr>
            <th
              className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              style={{ width: "20%" }}
            >
              Type / Ref Code
            </th>
            <th
              className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              style={{ width: "50%" }}
            >
              Name / Description
            </th>
            <th
              className="px-2 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider"
              style={{ width: "15%" }}
            >
              Sort Order
            </th>
            <th
              className="px-2 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
              style={{ width: "15%" }}
            >
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {renderRows(tree)}
        </tbody>
      </table>
    </div>
  );
}

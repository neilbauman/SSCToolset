"use client";

import { useState } from "react";
import {
  ChevronRight,
  ChevronDown,
  Edit,
  Trash,
  Plus,
  Copy,
  Upload,
} from "lucide-react";
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
    items: NormalizedFramework[],
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

      const hasChildren =
        (level === 0 && item.themes?.length > 0) ||
        (level === 1 && (item as any).subthemes?.length > 0);

      const isExpanded = expanded[item.id];

      const row = (
        <tr key={item.id} className="border-b">
          {/* Type / Ref Code */}
          <td
            className="px-3 py-2 whitespace-nowrap text-sm text-gray-700"
            style={{ width: "20%" }}
          >
            <div className="flex items-center">
              <div style={{ marginLeft: `${level * 12}px` }}>
                {hasChildren ? (
                  <button
                    onClick={() => toggleExpand(item.id)}
                    className="mr-2 text-gray-500 hover:text-gray-700"
                  >
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </button>
                ) : (
                  <span className="inline-block w-4 h-4 mr-2" />
                )}
              </div>
              <span className="font-medium">{refCode}</span>
            </div>
          </td>

          {/* Name / Description */}
          <td
            className="px-3 py-2 text-sm"
            style={{ width: "50%" }}
          >
            <div className="font-medium text-gray-900">{item.name}</div>
            {item.description && (
              <div className="text-gray-500">{item.description}</div>
            )}
          </td>

          {/* Sort Order */}
          <td
            className="px-3 py-2 text-sm text-gray-500 text-center"
            style={{ width: "15%" }}
          >
            {item.sort_order ?? "-"}
          </td>

          {/* Actions */}
          <td
            className="px-3 py-2 text-sm text-right"
            style={{ width: "15%" }}
          >
            <div className="flex items-center justify-end gap-2">
              {editMode && (
                <>
                  <button className="text-blue-600 hover:text-blue-800">
                    <Edit className="w-4 h-4" />
                  </button>
                  <button className="text-red-600 hover:text-red-800">
                    <Trash className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          </td>
        </tr>
      );

      const children =
        level === 0 && isExpanded && item.themes
          ? renderRows(item.themes as any, 1, refCode)
          : level === 1 && isExpanded && (item as any).subthemes
          ? renderRows((item as any).subthemes, 2, refCode)
          : [];

      return [row, ...children];
    });
  };

  return (
    <div>
      {/* Toolbar */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex gap-2">
          <button className="px-3 py-1 text-sm bg-gray-100 rounded hover:bg-gray-200">
            Expand All
          </button>
          <button className="px-3 py-1 text-sm bg-gray-100 rounded hover:bg-gray-200">
            Collapse All
          </button>
        </div>
        <div className="flex gap-2">
          {editMode && (
            <button className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200">
              <Plus className="w-4 h-4 inline mr-1" />
              Add Pillar
            </button>
          )}
          <button
            onClick={() => setEditMode((prev) => !prev)}
            className="px-3 py-1 text-sm bg-gray-100 rounded hover:bg-gray-200"
          >
            {editMode ? "Exit Edit Mode" : "Enter Edit Mode"}
          </button>
        </div>
      </div>

      {/* Table */}
      <table className="min-w-full border border-gray-200 bg-white">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">
              Type / Ref Code
            </th>
            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">
              Name / Description
            </th>
            <th className="px-3 py-2 text-center text-xs font-semibold text-gray-600">
              Sort Order
            </th>
            <th className="px-3 py-2 text-right text-xs font-semibold text-gray-600">
              Actions
            </th>
          </tr>
        </thead>
        <tbody>{renderRows(tree)}</tbody>
      </table>

      {/* Version controls */}
      <div className="flex gap-2 mt-4">
        <button className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200">
          Open Version
        </button>
        <button className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200">
          <Copy className="w-4 h-4 inline mr-1" />
          Clone
        </button>
        <button className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200">
          <Upload className="w-4 h-4 inline mr-1" />
          Publish
        </button>
      </div>
    </div>
  );
}

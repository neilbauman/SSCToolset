"use client";

import { useState } from "react";
import type { NormalizedFramework } from "@/lib/types/framework";
import { ChevronDown, ChevronRight, Pencil, Trash2, Plus } from "lucide-react";

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

      // check children correctly by level
      const hasChildren =
        (level === 0 && item.themes && item.themes.length > 0) ||
        (level === 1 && item.subthemes && item.subthemes.length > 0);

      const row = (
        <tr key={item.id} className="border-b">
          {/* Type / Ref Code */}
          <td className="w-[20%] px-2 py-2 align-top">
            <div className="flex items-center">
              <span
                className="flex items-center cursor-pointer"
                style={{ marginLeft: `${level * 12}px` }} // subtle indent
                onClick={() => hasChildren && toggleExpand(item.id)}
              >
                {hasChildren ? (
                  isExpanded ? (
                    <ChevronDown className="w-4 h-4 mr-1" />
                  ) : (
                    <ChevronRight className="w-4 h-4 mr-1" />
                  )
                ) : (
                  <span className="w-4 h-4 mr-1" />
                )}
                <span className="text-xs font-semibold uppercase text-gray-500">
                  {level === 0
                    ? "Pillar"
                    : level === 1
                    ? "Theme"
                    : "Subtheme"}
                </span>
              </span>
              <span className="ml-2 text-sm text-gray-800">{refCode}</span>
            </div>
          </td>

          {/* Name / Description */}
          <td className="w-[55%] px-2 py-2 align-top">
            <div>
              <div className="font-medium">{item.name}</div>
              {item.description && (
                <div className="text-xs text-gray-500">{item.description}</div>
              )}
            </div>
          </td>

          {/* Sort Order */}
          <td className="w-[10%] px-2 py-2 align-top text-sm text-gray-600 text-center">
            {item.sort_order ?? "-"}
          </td>

          {/* Actions */}
          <td className="w-[15%] px-4 py-2 align-top text-right">
            <div className="flex justify-end gap-2">
              {editMode ? (
                <>
                  <button className="p-1 text-blue-600 hover:text-blue-800">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button className="p-1 text-red-600 hover:text-red-800">
                    <Trash2 className="w-4 h-4" />
                  </button>
                  {level < 2 && (
                    <button className="p-1 text-green-600 hover:text-green-800">
                      <Plus className="w-4 h-4" />
                    </button>
                  )}
                </>
              ) : (
                <span className="text-xs text-gray-400">—</span>
              )}
            </div>
          </td>
        </tr>
      );

      const children: JSX.Element[] = [];
      if (isExpanded) {
        if (level === 0 && item.themes) {
          children.push(...renderRows(item.themes, level + 1, refCode));
        }
        if (level === 1 && item.subthemes) {
          children.push(...renderRows(item.subthemes, level + 1, refCode));
        }
      }

      return [row, ...children];
    });
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <div className="flex gap-2">
          <button
            onClick={() => setExpanded({})}
            className="text-sm text-gray-600 hover:underline"
          >
            Collapse All
          </button>
          <button
            onClick={() =>
              setExpanded(
                Object.fromEntries(
                  tree.flatMap((p) => [
                    [p.id, true],
                    ...(p.themes?.map((t) => [t.id, true]) || []),
                  ])
                )
              )
            }
            className="text-sm text-gray-600 hover:underline"
          >
            Expand All
          </button>
        </div>

        <div className="flex gap-3">
          {editMode && (
            <button className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700">
              + Add Pillar
            </button>
          )}
          <button
            onClick={() => setEditMode((prev) => !prev)}
            className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700"
          >
            {editMode ? "Exit Edit Mode" : "Enter Edit Mode"}
          </button>
        </div>
      </div>

      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-gray-100 text-left">
            <th className="w-[20%] px-2 py-2">Type / Ref Code</th>
            <th className="w-[55%] px-2 py-2">Name / Description</th>
            <th className="w-[10%] px-2 py-2 text-center">Sort Order</th>
            <th className="w-[15%] px-4 py-2 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>{renderRows(tree)}</tbody>
      </table>
    </div>
  );
}

"use client";

import { useState } from "react";
import type { NormalizedFramework } from "@/lib/types/framework";
import { ChevronRight, ChevronDown, Edit2, Trash2, Plus } from "lucide-react";

type Props = {
  tree: NormalizedFramework[];
};

export default function FrameworkEditor({ tree }: Props) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [editMode, setEditMode] = useState(false);

  const toggle = (id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const renderRows = (
    items: any[],
    level: number,
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
        (item.themes && item.themes.length > 0) ||
        (item.subthemes && item.subthemes.length > 0);

      const id = `${level}-${item.id}`;
      const isExpanded = expanded[id] ?? false;

      const children =
        level === 0
          ? item.themes
          : level === 1
          ? item.subthemes
          : undefined;

      return [
        <tr key={id} className="align-top">
          {/* Type/Ref Code */}
          <td className="w-[18%] text-sm text-gray-800">
            <div className="flex items-center">
              {hasChildren && (
                <button
                  onClick={() => toggle(id)}
                  className="mr-1 text-gray-600 hover:text-gray-900"
                >
                  {isExpanded ? (
                    <ChevronDown size={16} />
                  ) : (
                    <ChevronRight size={16} />
                  )}
                </button>
              )}
              <span
                className="font-medium"
                style={{ paddingLeft: `${level * 8}px` }} // very subtle indent
              >
                {level === 0 ? "Pillar" : level === 1 ? "Theme" : "Subtheme"}{" "}
                ({refCode})
              </span>
            </div>
          </td>

          {/* Name / Description */}
          <td className="w-[52%]">
            <div
              className="ml-1"
              style={{ paddingLeft: `${level * 8}px` }} // match indent
            >
              <div className="font-semibold">{item.name}</div>
              {item.description && (
                <div className="text-xs text-gray-500">{item.description}</div>
              )}
            </div>
          </td>

          {/* Sort Order */}
          <td className="w-[10%] text-sm text-gray-600 text-center pr-6">
            {item.sort_order ?? "-"}
          </td>

          {/* Actions */}
          <td className="w-[20%] text-right">
            {editMode && (
              <div className="flex justify-end gap-3">
                <button className="text-blue-600 hover:text-blue-800">
                  <Edit2 size={16} />
                </button>
                <button className="text-red-600 hover:text-red-800">
                  <Trash2 size={16} />
                </button>
                <button className="text-green-600 hover:text-green-800">
                  <Plus size={16} />
                </button>
              </div>
            )}
          </td>
        </tr>,
        isExpanded && children
          ? renderRows(children, level + 1, refCode)
          : null,
      ];
    });
  };

  return (
    <div>
      {/* Controls */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex gap-2">
          <button
            onClick={() => setExpanded({})}
            className="text-sm text-gray-600 hover:text-gray-800"
          >
            Collapse All
          </button>
          <button
            onClick={() => {
              const allExpanded: Record<string, boolean> = {};
              const expandAll = (items: any[], level: number) => {
                items.forEach((it) => {
                  const id = `${level}-${it.id}`;
                  allExpanded[id] = true;
                  if (level === 0 && it.themes) expandAll(it.themes, 1);
                  if (level === 1 && it.subthemes) expandAll(it.subthemes, 2);
                });
              };
              expandAll(tree, 0);
              setExpanded(allExpanded);
            }}
            className="text-sm text-gray-600 hover:text-gray-800"
          >
            Expand All
          </button>
        </div>
        <div className="flex gap-2">
          {editMode && (
            <button className="px-3 py-1 rounded bg-green-600 text-white text-sm hover:bg-green-700">
              + Add Pillar
            </button>
          )}
          <button
            onClick={() => setEditMode(!editMode)}
            className="px-3 py-1 rounded bg-gray-200 text-sm hover:bg-gray-300"
          >
            {editMode ? "Exit Edit Mode" : "Enter Edit Mode"}
          </button>
        </div>
      </div>

      {/* Table */}
      <table className="w-full border border-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="w-[18%] text-left px-2 py-2">Type / Ref Code</th>
            <th className="w-[52%] text-left px-2 py-2">Name / Description</th>
            <th className="w-[10%] text-center px-2 py-2">Sort Order</th>
            <th className="w-[20%] text-right px-2 py-2">Actions</th>
          </tr>
        </thead>
        <tbody>{renderRows(tree, 0)}</tbody>
      </table>
    </div>
  );
}

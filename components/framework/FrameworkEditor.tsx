"use client";

import { useState } from "react";
import type { NormalizedFramework } from "@/lib/types/framework";
import { ChevronRight, ChevronDown, Edit2, Trash2, Copy, Plus } from "lucide-react";

type Props = {
  tree: NormalizedFramework[];
  editMode: boolean;
  setEditMode: React.Dispatch<React.SetStateAction<boolean>>;
};

export default function FrameworkEditor({ tree, editMode, setEditMode }: Props) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

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

      const isExpanded = expanded[item.id];
      const hasChildren =
        (level === 0 && item.themes?.length > 0) ||
        (level === 1 && (item as any).subthemes?.length > 0);

      const row = (
        <tr key={item.id} className="border-b">
          {/* Type / Ref Code */}
          <td className="px-2 py-2 w-[20%]">
            <div className="flex items-center gap-1">
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
              <span
                className={`inline-block text-xs font-semibold px-2 py-0.5 rounded ${
                  level === 0
                    ? "bg-blue-100 text-blue-800"
                    : level === 1
                    ? "bg-green-100 text-green-800"
                    : "bg-purple-100 text-purple-800"
                }`}
              >
                {level === 0 ? "Pillar" : level === 1 ? "Theme" : "Subtheme"}
              </span>
              <span className="text-sm font-mono">{refCode}</span>
            </div>
          </td>

          {/* Name / Description */}
          <td className="px-2 py-2 w-[45%]">
            <div
              className="ml-2"
              style={{ marginLeft: `${level * 0.75}rem` }} // subtle indent
            >
              <div className="font-medium text-gray-900">{item.name}</div>
              {item.description && (
                <div className="text-xs text-gray-500">{item.description}</div>
              )}
            </div>
          </td>

          {/* Sort Order */}
          <td className="px-2 py-2 w-[15%] text-center">
            {(item as any).sort_order ?? "-"}
          </td>

          {/* Actions */}
          <td className="px-2 py-2 w-[20%]">
            <div className="flex justify-end gap-2">
              {editMode && (
                <>
                  <button className="text-gray-500 hover:text-gray-700">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button className="text-gray-500 hover:text-gray-700">
                    <Copy className="w-4 h-4" />
                  </button>
                  <button className="text-red-500 hover:text-red-700">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          </td>
        </tr>
      );

      const children: JSX.Element[] = [];
      if (isExpanded && level === 0 && item.themes) {
        children.push(...renderRows(item.themes as any, 1, refCode));
      }
      if (isExpanded && level === 1 && (item as any).subthemes) {
        children.push(...renderRows((item as any).subthemes, 2, refCode));
      }

      return [row, ...children];
    });
  };

  return (
    <div>
      {/* Toolbar */}
      <div className="flex justify-between items-center mb-3">
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
              tree.forEach((p) => {
                allExpanded[p.id] = true;
                p.themes?.forEach((t) => {
                  allExpanded[t.id] = true;
                  (t.subthemes ?? []).forEach((s) => {
                    allExpanded[s.id] = true;
                  });
                });
              });
              setExpanded(allExpanded);
            }}
            className="text-sm text-gray-600 hover:text-gray-800"
          >
            Expand All
          </button>
        </div>
        <div className="flex gap-2">
          {editMode && (
            <button className="flex items-center gap-1 text-sm text-green-700 hover:text-green-900">
              <Plus className="w-4 h-4" />
              Add Pillar
            </button>
          )}
          <button
            onClick={() => setEditMode(!editMode)}
            className="text-sm text-gray-600 hover:text-gray-800"
          >
            {editMode ? "Exit Edit Mode" : "Enter Edit Mode"}
          </button>
        </div>
      </div>

      {/* Table */}
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-gray-50 border-b text-left">
            <th className="px-2 py-2 w-[20%]">Type / Ref Code</th>
            <th className="px-2 py-2 w-[45%]">Name / Description</th>
            <th className="px-2 py-2 w-[15%] text-center">Sort Order</th>
            <th className="px-2 py-2 w-[20%] text-right">Actions</th>
          </tr>
        </thead>
        <tbody>{renderRows(tree)}</tbody>
      </table>
    </div>
  );
}

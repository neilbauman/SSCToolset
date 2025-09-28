"use client";

import { useState } from "react";
import type { NormalizedFramework } from "@/lib/types/framework";
import { Pencil, Trash2, Plus, ChevronDown, ChevronRight } from "lucide-react";

type Props = {
  tree: NormalizedFramework[];
  editMode?: boolean;
  setEditMode?: (v: boolean) => void;
};

export default function FrameworkEditor({ tree, editMode = false, setEditMode }: Props) {
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
      const hasChildren = item.themes?.length || item.subthemes?.length;

      const row = (
        <tr key={item.id} className="border-b">
          {/* Type / Ref Code */}
          <td className="px-2 py-2 w-[20%]">
            <div className="flex items-center">
              {hasChildren && (
                <button
                  type="button"
                  onClick={() => toggleExpand(item.id)}
                  className="mr-1 text-gray-500 hover:text-gray-700"
                >
                  {isExpanded ? (
                    <ChevronDown size={14} />
                  ) : (
                    <ChevronRight size={14} />
                  )}
                </button>
              )}
              <span className="text-xs font-semibold bg-gray-100 px-2 py-0.5 rounded mr-2">
                {level === 0 ? "Pillar" : level === 1 ? "Theme" : "Subtheme"}
              </span>
              <span className="text-sm">{refCode}</span>
            </div>
          </td>

          {/* Name / Description */}
          <td className="px-2 py-2 w-[50%]">
            <div style={{ marginLeft: `${level * 12}px` }}>
              <div className="font-medium">{item.name}</div>
              {item.description && (
                <div className="text-xs text-gray-500">{item.description}</div>
              )}
            </div>
          </td>

          {/* Sort Order */}
          <td className="px-2 py-2 w-[10%] text-sm text-gray-600">
            {item.sort_order ?? ""}
          </td>

          {/* Actions */}
          <td className="px-2 py-2 w-[20%] text-right">
            {editMode ? (
              <div className="flex justify-end gap-2">
                <button className="p-1 text-blue-600 hover:text-blue-800">
                  <Pencil size={16} />
                </button>
                <button className="p-1 text-red-600 hover:text-red-800">
                  <Trash2 size={16} />
                </button>
                <button className="p-1 text-green-600 hover:text-green-800">
                  <Plus size={16} />
                </button>
              </div>
            ) : (
              <span className="text-gray-400 text-xs">—</span>
            )}
          </td>
        </tr>
      );

      const children: JSX.Element[] = [];

      if (isExpanded) {
        if (item.themes) {
          children.push(...renderRows(item.themes as any, level + 1, refCode));
        }
        if (item.subthemes) {
          children.push(...renderRows(item.subthemes as any, level + 1, refCode));
        }
      }

      return [row, ...children];
    });
  };

  return (
    <div>
      {/* Controls */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex gap-2">
          <button
            onClick={() => setExpanded({})}
            className="text-xs px-2 py-1 border rounded text-gray-700 hover:bg-gray-100"
          >
            Collapse All
          </button>
          <button
            onClick={() => {
              const all: Record<string, boolean> = {};
              tree.forEach((p) => {
                all[p.id] = true;
                p.themes?.forEach((t) => {
                  all[t.id] = true;
                  t.subthemes?.forEach((s) => {
                    all[s.id] = true;
                  });
                });
              });
              setExpanded(all);
            }}
            className="text-xs px-2 py-1 border rounded text-gray-700 hover:bg-gray-100"
          >
            Expand All
          </button>
        </div>
        {setEditMode && (
          <button
            onClick={() => setEditMode(!editMode)}
            className="text-xs px-2 py-1 border rounded text-gray-700 hover:bg-gray-100"
          >
            {editMode ? "Exit Edit Mode" : "Enter Edit Mode"}
          </button>
        )}
      </div>

      {/* Table */}
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b bg-gray-50 text-left">
            <th className="px-2 py-2 w-[20%]">Type / Ref Code</th>
            <th className="px-2 py-2 w-[50%]">Name / Description</th>
            <th className="px-2 py-2 w-[10%]">Sort Order</th>
            <th className="px-2 py-2 w-[20%] text-right">Actions</th>
          </tr>
        </thead>
        <tbody>{renderRows(tree)}</tbody>
      </table>
    </div>
  );
}

"use client";

import { useState } from "react";
import type { NormalizedFramework } from "@/lib/types/framework";

type Props = {
  tree: NormalizedFramework[];
  editMode: boolean;
  setEditMode: (val: boolean) => void;
};

export default function FrameworkEditor({ tree, editMode, setEditMode }: Props) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const toggleExpand = (id: string) =>
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  const expandAll = () => {
    const all: Record<string, boolean> = {};
    const mark = (items: NormalizedFramework[]) => {
      items.forEach((p) => {
        all[p.id] = true;
        p.themes.forEach((t) => {
          all[t.id] = true;
          t.subthemes.forEach((s) => (all[s.id] = true));
        });
      });
    };
    mark(tree);
    setExpanded(all);
  };

  const collapseAll = () => setExpanded({});

  const renderTree = (
    items: NormalizedFramework[],
    level: number = 0,
    parentRef: string = ""
  ): JSX.Element[] => {
    return items.flatMap((item, index) => {
      const refCode =
        level === 0
          ? `P${index + 1}`
          : level === 1
          ? `T${parentRef}.${index + 1}`
          : `ST${parentRef}.${index + 1}`;

      const isExpanded = expanded[item.id];
      const hasChildren =
        (level === 0 && item.themes.length > 0) ||
        (level === 1 && item.subthemes.length > 0);

      const row = (
        <tr key={item.id} className="border-b">
          {/* Type / Ref */}
          <td className="w-[20%] px-2 py-2 align-top">
            <div className="flex items-center gap-2">
              {hasChildren && (
                <button
                  onClick={() => toggleExpand(item.id)}
                  className="text-xs text-gray-500"
                >
                  {isExpanded ? "▾" : "▸"}
                </button>
              )}
              <span
                className={`text-xs px-2 py-0.5 rounded ${
                  level === 0
                    ? "bg-blue-100 text-blue-700"
                    : level === 1
                    ? "bg-green-100 text-green-700"
                    : "bg-purple-100 text-purple-700"
                }`}
              >
                {level === 0 ? "Pillar" : level === 1 ? "Theme" : "Subtheme"}
              </span>
              <span className="text-xs text-gray-600">{refCode}</span>
            </div>
          </td>

          {/* Name / Desc */}
          <td className="w-[55%] px-2 py-2 align-top">
            <div className={`pl-${level * 2}`}>
              <div className="font-medium">{item.name}</div>
              {item.description && (
                <div className="text-xs text-gray-500">{item.description}</div>
              )}
            </div>
          </td>

          {/* Sort */}
          <td className="w-[15%] px-2 py-2 align-top text-sm text-gray-600">
            {index + 1}
          </td>

          {/* Actions */}
          <td className="w-[10%] px-2 py-2 align-top text-right">
            {editMode && (
              <div className="flex gap-2 justify-end text-gray-500 text-sm">
                <button>✎</button>
                <button>＋</button>
                <button>🗑</button>
              </div>
            )}
          </td>
        </tr>
      );

      return [
        row,
        ...(hasChildren && isExpanded
          ? renderTree(
              level === 0 ? item.themes : (item.subthemes as any),
              level + 1,
              refCode
            )
          : []),
      ];
    });
  };

  return (
    <div className="mt-4">
      {/* Controls */}
      <div className="flex justify-between items-center mb-2">
        <div className="flex gap-2">
          <button
            onClick={expandAll}
            className="px-2 py-1 text-xs border rounded bg-gray-50 hover:bg-gray-100"
          >
            Expand All
          </button>
          <button
            onClick={collapseAll}
            className="px-2 py-1 text-xs border rounded bg-gray-50 hover:bg-gray-100"
          >
            Collapse All
          </button>
        </div>

        <div className="flex gap-2">
          {editMode && (
            <button className="px-2 py-1 text-xs border rounded bg-blue-50 text-blue-700 hover:bg-blue-100">
              ＋ Add Pillar
            </button>
          )}
          <button
            onClick={() => setEditMode(!editMode)}
            className="px-2 py-1 text-xs border rounded bg-gray-50 hover:bg-gray-100"
          >
            {editMode ? "Exit Edit Mode" : "Enter Edit Mode"}
          </button>
        </div>
      </div>

      {/* Table */}
      <table className="w-full border text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="text-left px-2 py-2 w-[20%]">Type / Ref Code</th>
            <th className="text-left px-2 py-2 w-[55%]">Name / Description</th>
            <th className="text-left px-2 py-2 w-[15%]">Sort Order</th>
            <th className="text-right px-2 py-2 w-[10%]">Actions</th>
          </tr>
        </thead>
        <tbody>{renderTree(tree)}</tbody>
      </table>
    </div>
  );
}

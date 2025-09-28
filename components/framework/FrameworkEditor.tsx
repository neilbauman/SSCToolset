"use client";

import { useState } from "react";
import type { NormalizedFramework, Theme, Subtheme } from "@/lib/types/framework";
import { ChevronRight, ChevronDown, Edit, Trash, Plus } from "lucide-react";

type Props = {
  tree: NormalizedFramework[];
};

export default function FrameworkEditor({ tree }: Props) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [editMode, setEditMode] = useState(false);

  const toggleExpand = (id: string) =>
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  const renderRows = (
    items: (NormalizedFramework | Theme | Subtheme)[],
    level: number = 0,
    parentRef: string = ""
  ): JSX.Element[] => {
    return items.flatMap((item: any, index) => {
      const refCode =
        level === 0
          ? `P${index + 1}`
          : `${parentRef}.${index + 1}`;

      let hasChildren = false;
      if (level === 0 && item.themes && item.themes.length > 0) {
        hasChildren = true;
      }
      if (level === 1 && item.subthemes && item.subthemes.length > 0) {
        hasChildren = true;
      }

      const isExpanded = expanded[item.id];
      const indent = level * 12; // subtle indent per level

      const row = (
        <tr key={item.id} className="border-b">
          {/* Type / Ref Code */}
          <td className="px-2 py-2 text-sm align-top w-[20%]">
            <div className="flex items-center" style={{ marginLeft: indent }}>
              {hasChildren && (
                <button
                  onClick={() => toggleExpand(item.id)}
                  className="mr-1 text-gray-500 hover:text-gray-700"
                >
                  {isExpanded ? (
                    <ChevronDown size={16} />
                  ) : (
                    <ChevronRight size={16} />
                  )}
                </button>
              )}
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  level === 0
                    ? "bg-blue-100 text-blue-800"
                    : level === 1
                    ? "bg-green-100 text-green-800"
                    : "bg-purple-100 text-purple-800"
                }`}
              >
                {level === 0 ? "Pillar" : level === 1 ? "Theme" : "Subtheme"}
              </span>
              <span className="ml-2 font-mono text-gray-600">{refCode}</span>
            </div>
          </td>

          {/* Name / Description */}
          <td className="px-4 py-2 text-sm w-[55%]">
            <div>
              <div className="font-medium text-gray-900">{item.name}</div>
              {item.description && (
                <div className="text-gray-500 text-xs">{item.description}</div>
              )}
            </div>
          </td>

          {/* Sort Order */}
          <td className="px-2 py-2 text-sm text-center w-[10%]">
            {"sort_order" in item ? item.sort_order ?? "-" : "-"}
          </td>

          {/* Actions */}
          <td className="px-2 py-2 text-sm text-right w-[15%]">
            {editMode ? (
              <div className="flex justify-end gap-2">
                <button className="text-gray-500 hover:text-gray-700">
                  <Edit size={16} />
                </button>
                <button className="text-gray-500 hover:text-gray-700">
                  <Trash size={16} />
                </button>
                <button className="text-gray-500 hover:text-gray-700">
                  <Plus size={16} />
                </button>
              </div>
            ) : (
              <div className="h-4" /> // keeps column width stable
            )}
          </td>
        </tr>
      );

      const children: JSX.Element[] = [];
      if (isExpanded && hasChildren) {
        if (level === 0 && item.themes) {
          children.push(...renderRows(item.themes, 1, refCode));
        }
        if (level === 1 && item.subthemes) {
          children.push(...renderRows(item.subthemes, 2, refCode));
        }
      }

      return [row, ...children];
    });
  };

  return (
    <div>
      <div className="mb-2 flex justify-between items-center">
        <div className="flex gap-2">
          <button
            onClick={() => setExpanded({})}
            className="text-xs text-gray-600 hover:underline"
          >
            Collapse all
          </button>
          <button
            onClick={() => {
              const allExpanded: Record<string, boolean> = {};
              tree.forEach((pillar) => {
                allExpanded[pillar.id] = true;
                pillar.themes?.forEach((theme) => {
                  allExpanded[theme.id] = true;
                  theme.subthemes?.forEach(
                    (st) => (allExpanded[st.id] = true)
                  );
                });
              });
              setExpanded(allExpanded);
            }}
            className="text-xs text-gray-600 hover:underline"
          >
            Expand all
          </button>
        </div>
        <button
          onClick={() => setEditMode((prev) => !prev)}
          className="text-xs text-gray-600 hover:underline"
        >
          {editMode ? "Exit edit mode" : "Enter edit mode"}
        </button>
      </div>

      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-gray-50 text-left text-sm font-medium text-gray-700">
            <th className="px-2 py-2 w-[20%]">Type / Ref Code</th>
            <th className="px-4 py-2 w-[55%]">Name / Description</th>
            <th className="px-2 py-2 text-center w-[10%]">Sort Order</th>
            <th className="px-2 py-2 text-right w-[15%]">Actions</th>
          </tr>
        </thead>
        <tbody>{renderRows(tree)}</tbody>
      </table>
    </div>
  );
}

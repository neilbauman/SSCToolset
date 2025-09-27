"use client";

import { useState } from "react";
import type { NormalizedFramework } from "@/lib/types/framework";
import { ChevronRight, ChevronDown, Pencil, Trash2, Plus } from "lucide-react";

type Props = {
  tree: NormalizedFramework[];
};

export default function FrameworkEditor({ tree }: Props) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [editMode, setEditMode] = useState(false);

  const toggleExpand = (id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const expandAll = () => {
    const allIds: Record<string, boolean> = {};
    tree.forEach((pillar) => {
      allIds[pillar.id] = true;
      pillar.themes.forEach((theme) => {
        allIds[theme.id] = true;
        theme.subthemes.forEach((st) => {
          allIds[st.id] = true;
        });
      });
    });
    setExpanded(allIds);
  };

  const collapseAll = () => {
    setExpanded({});
  };

  const generateRefCode = (
    type: "pillar" | "theme" | "subtheme",
    parentIndex: number,
    index: number
  ): string => {
    if (type === "pillar") return `P${index + 1}`;
    if (type === "theme") return `T${parentIndex + 1}.${index + 1}`;
    if (type === "subtheme") return `ST${parentIndex + 1}.${index + 1}`;
    return "-";
  };

  const renderRow = (
    item: any,
    type: "pillar" | "theme" | "subtheme",
    parentIndex: number,
    index: number
  ) => {
    const isExpanded = expanded[item.id] ?? false;
    const refCode = generateRefCode(type, parentIndex, index);

    return (
      <>
        <tr key={item.id} className="border-b">
          {/* Type / Ref Code */}
          <td className="w-[20%] px-3 py-2 text-sm align-top">
            <div className="flex items-center gap-2">
              {item.themes || item.subthemes ? (
                <button
                  onClick={() => toggleExpand(item.id)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </button>
              ) : (
                <span className="inline-block w-4" />
              )}
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  type === "pillar"
                    ? "bg-blue-100 text-blue-700"
                    : type === "theme"
                    ? "bg-green-100 text-green-700"
                    : "bg-purple-100 text-purple-700"
                }`}
              >
                {type}
              </span>
              <span className="text-xs text-gray-500">{refCode}</span>
            </div>
          </td>

          {/* Name / Description */}
          <td className="w-[55%] px-3 py-2 text-sm align-top">
            <div>
              <div className="font-medium">{item.name}</div>
              {item.description && (
                <div className="text-gray-500 text-xs">{item.description}</div>
              )}
            </div>
          </td>

          {/* Sort Order */}
          <td className="w-[15%] px-3 py-2 text-sm align-top">
            {item.sort_order ?? "-"}
          </td>

          {/* Actions */}
          <td className="w-[10%] px-3 py-2 text-sm align-top text-right">
            {editMode ? (
              <div className="flex justify-end gap-2">
                <button className="text-blue-600 hover:text-blue-800">
                  <Pencil className="h-4 w-4" />
                </button>
                <button className="text-red-600 hover:text-red-800">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="h-4" /> // keeps column width consistent
            )}
          </td>
        </tr>

        {/* Children */}
        {isExpanded && type === "pillar" && (
          <>
            {item.themes.map((theme: any, i: number) =>
              renderRow(theme, "theme", index, i)
            )}
          </>
        )}
        {isExpanded && type === "theme" && (
          <>
            {item.subthemes.map((st: any, i: number) =>
              renderRow(st, "subtheme", index, i)
            )}
          </>
        )}
      </>
    );
  };

  return (
    <div>
      {/* Toolbar */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex gap-2">
          <button
            onClick={expandAll}
            className="px-3 py-1 border rounded text-sm hover:bg-gray-50"
          >
            Expand All
          </button>
          <button
            onClick={collapseAll}
            className="px-3 py-1 border rounded text-sm hover:bg-gray-50"
          >
            Collapse All
          </button>
          {editMode && (
            <button className="ml-2 px-3 py-1 border rounded text-sm bg-blue-50 text-blue-700 hover:bg-blue-100 flex items-center gap-1">
              <Plus className="h-4 w-4" /> Add Pillar
            </button>
          )}
        </div>
        <button
          onClick={() => setEditMode(!editMode)}
          className="px-3 py-1 border rounded text-sm hover:bg-gray-50"
        >
          {editMode ? "Exit Edit Mode" : "Enter Edit Mode"}
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto border rounded">
        <table className="w-full border-collapse">
          <thead className="bg-gray-50">
            <tr>
              <th className="w-[20%] px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase">
                Type / Ref Code
              </th>
              <th className="w-[55%] px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase">
                Name / Description
              </th>
              <th className="w-[15%] px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase">
                Sort Order
              </th>
              <th className="w-[10%] px-3 py-2 text-right text-xs font-semibold text-gray-600 uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {tree.map((pillar, i) => renderRow(pillar, "pillar", i, i))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

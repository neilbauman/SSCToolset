"use client";

import { useState } from "react";
import type { NormalizedFramework } from "@/lib/types/framework";
import {
  ChevronDown,
  ChevronRight,
  Pencil,
  Trash,
  Plus,
} from "lucide-react";

type Props = {
  tree: NormalizedFramework[];
};

export default function FrameworkEditor({ tree }: Props) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [editMode, setEditMode] = useState(false);

  // Toggle expand/collapse
  const toggleExpand = (id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Expand all
  const expandAll = () => {
    const all: Record<string, boolean> = {};
    const markAll = (items: any[]) => {
      for (const item of items) {
        all[item.id] = true;
        if (item.themes) markAll(item.themes);
        if (item.subthemes) markAll(item.subthemes);
      }
    };
    markAll(tree);
    setExpanded(all);
  };

  // Collapse all
  const collapseAll = () => {
    setExpanded({});
  };

  // Recursive Ref Code generator
  const getRefCode = (
    type: "pillar" | "theme" | "subtheme",
    sortOrder: number,
    parentCodes: string[] = []
  ) => {
    if (type === "pillar") return `P${sortOrder}`;
    if (type === "theme") return `T${parentCodes[0]}.${sortOrder}`;
    if (type === "subtheme") return `ST${parentCodes[0]}.${parentCodes[1]}.${sortOrder}`;
    return "";
  };

  return (
    <div className="rounded-lg border border-gray-300 bg-white shadow-sm">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b bg-gray-50 px-4 py-2">
        <div className="flex gap-2">
          <button
            onClick={expandAll}
            className="rounded border px-2 py-1 text-sm hover:bg-gray-100"
          >
            Expand All
          </button>
          <button
            onClick={collapseAll}
            className="rounded border px-2 py-1 text-sm hover:bg-gray-100"
          >
            Collapse All
          </button>
        </div>
        <div className="flex gap-2">
          {editMode && (
            <button
              className="rounded border border-green-600 px-3 py-1 text-sm text-green-700 hover:bg-green-50"
            >
              + Add Pillar
            </button>
          )}
          <button
            onClick={() => setEditMode(!editMode)}
            className="rounded border px-3 py-1 text-sm hover:bg-gray-100"
          >
            {editMode ? "Exit Edit Mode" : "Enter Edit Mode"}
          </button>
        </div>
      </div>

      {/* Table */}
      <table className="w-full border-collapse text-sm">
        <thead className="bg-gray-100 text-left text-xs font-semibold uppercase text-gray-600">
          <tr>
            <th className="w-[20%] px-4 py-2">Type / Ref Code</th>
            <th className="w-[55%] px-4 py-2">Name / Description</th>
            <th className="w-[10%] px-4 py-2 text-center">Sort Order</th>
            <th className="w-[15%] px-4 py-2 text-center">Actions</th>
          </tr>
        </thead>
        <tbody>
          {tree.map((pillar, pIndex) => (
            <Row
              key={pillar.id}
              item={pillar}
              type="pillar"
              sortOrder={pIndex + 1}
              expanded={expanded}
              toggleExpand={toggleExpand}
              editMode={editMode}
              getRefCode={getRefCode}
              parentCodes={[`${pIndex + 1}`]}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

type RowProps = {
  item: any;
  type: "pillar" | "theme" | "subtheme";
  sortOrder: number;
  expanded: Record<string, boolean>;
  toggleExpand: (id: string) => void;
  editMode: boolean;
  getRefCode: (
    type: "pillar" | "theme" | "subtheme",
    sortOrder: number,
    parentCodes: string[]
  ) => string;
  parentCodes: string[];
};

function Row({
  item,
  type,
  sortOrder,
  expanded,
  toggleExpand,
  editMode,
  getRefCode,
  parentCodes,
}: RowProps) {
  const isExpanded = expanded[item.id];
  const hasChildren =
    (type === "pillar" && item.themes?.length) ||
    (type === "theme" && item.subthemes?.length);

  const badgeColor =
    type === "pillar"
      ? "bg-blue-100 text-blue-700"
      : type === "theme"
      ? "bg-green-100 text-green-700"
      : "bg-purple-100 text-purple-700";

  const refCode = getRefCode(type, sortOrder, parentCodes);

  return (
    <>
      <tr className="border-t">
        {/* Type + Ref Code */}
        <td className="px-4 py-2 align-top">
          <div className="flex items-center gap-2">
            {hasChildren && (
              <button
                onClick={() => toggleExpand(item.id)}
                className="text-gray-500 hover:text-gray-800"
              >
                {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </button>
            )}
            <span
              className={`rounded px-2 py-0.5 text-xs font-medium capitalize ${badgeColor}`}
            >
              {type}
            </span>
            <span className="text-xs text-gray-600">{refCode}</span>
          </div>
        </td>

        {/* Name + Description */}
        <td className="px-4 py-2 align-top">
          <div className="font-medium">{item.name}</div>
          <div className="text-xs text-gray-600">{item.description}</div>
        </td>

        {/* Sort Order */}
        <td className="px-4 py-2 text-center align-top">{sortOrder}</td>

        {/* Actions */}
        <td className="px-4 py-2 text-center align-top">
          {editMode ? (
            <div className="flex justify-center gap-2">
              <button className="text-blue-600 hover:text-blue-800">
                <Pencil size={16} />
              </button>
              <button className="text-red-600 hover:text-red-800">
                <Trash size={16} />
              </button>
              <button className="text-green-600 hover:text-green-800">
                <Plus size={16} />
              </button>
            </div>
          ) : (
            <div className="text-gray-400">—</div>
          )}
        </td>
      </tr>

      {/* Children */}
      {isExpanded &&
        type === "pillar" &&
        item.themes?.map((theme: any, tIndex: number) => (
          <Row
            key={theme.id}
            item={theme}
            type="theme"
            sortOrder={tIndex + 1}
            expanded={expanded}
            toggleExpand={toggleExpand}
            editMode={editMode}
            getRefCode={getRefCode}
            parentCodes={[`${sortOrder}`]}
          />
        ))}

      {isExpanded &&
        type === "theme" &&
        item.subthemes?.map((st: any, sIndex: number) => (
          <Row
            key={st.id}
            item={st}
            type="subtheme"
            sortOrder={sIndex + 1}
            expanded={expanded}
            toggleExpand={toggleExpand}
            editMode={editMode}
            getRefCode={getRefCode}
            parentCodes={[parentCodes[0], `${sortOrder}`]}
          />
        ))}
    </>
  );
}

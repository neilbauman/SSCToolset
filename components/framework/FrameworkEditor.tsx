"use client";

import { useState } from "react";
import type { NormalizedFramework, Theme, Subtheme } from "@/lib/types/framework";

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
    tree.forEach((pillar) => {
      all[pillar.id] = true;
      pillar.themes.forEach((theme) => {
        all[theme.id] = true;
        theme.subthemes.forEach((st) => (all[st.id] = true));
      });
    });
    setExpanded(all);
  };

  const collapseAll = () => setExpanded({});

  const renderPillars = (pillars: NormalizedFramework[]): JSX.Element[] => {
    return pillars.flatMap((pillar, pIndex) => {
      const refCode = `P${pIndex + 1}`;
      const isExpanded = expanded[pillar.id];
      const hasChildren = pillar.themes.length > 0;

      return [
        renderRow("Pillar", refCode, pillar.name, pillar.description, pIndex + 1, hasChildren, isExpanded, () =>
          toggleExpand(pillar.id)
        ),
        ...(hasChildren && isExpanded ? renderThemes(pillar.themes, refCode) : []),
      ];
    });
  };

  const renderThemes = (themes: Theme[], parentRef: string): JSX.Element[] => {
    return themes.flatMap((theme, tIndex) => {
      const refCode = `T${parentRef}.${tIndex + 1}`;
      const isExpanded = expanded[theme.id];
      const hasChildren = theme.subthemes.length > 0;

      return [
        renderRow("Theme", refCode, theme.name, theme.description, tIndex + 1, hasChildren, isExpanded, () =>
          toggleExpand(theme.id)
        ),
        ...(hasChildren && isExpanded ? renderSubthemes(theme.subthemes, refCode) : []),
      ];
    });
  };

  const renderSubthemes = (subthemes: Subtheme[], parentRef: string): JSX.Element[] => {
    return subthemes.map((st, stIndex) => {
      const refCode = `ST${parentRef}.${stIndex + 1}`;
      return renderRow("Subtheme", refCode, st.name, st.description, stIndex + 1, false, false);
    });
  };

  const renderRow = (
    type: "Pillar" | "Theme" | "Subtheme",
    refCode: string,
    name: string,
    description: string,
    sortOrder: number,
    hasChildren: boolean,
    isExpanded: boolean,
    onToggle?: () => void
  ): JSX.Element => {
    return (
      <tr key={refCode} className="border-b">
        {/* Type / Ref */}
        <td className="w-[20%] px-2 py-2 align-top">
          <div className="flex items-center gap-2">
            {hasChildren && (
              <button onClick={onToggle} className="text-xs text-gray-500">
                {isExpanded ? "▾" : "▸"}
              </button>
            )}
            <span
              className={`text-xs px-2 py-0.5 rounded ${
                type === "Pillar"
                  ? "bg-blue-100 text-blue-700"
                  : type === "Theme"
                  ? "bg-green-100 text-green-700"
                  : "bg-purple-100 text-purple-700"
              }`}
            >
              {type}
            </span>
            <span className="text-xs text-gray-600">{refCode}</span>
          </div>
        </td>

        {/* Name / Desc */}
        <td className="w-[50%] px-2 py-2 align-top">
          <div className="font-medium">{name}</div>
          {description && <div className="text-xs text-gray-500">{description}</div>}
        </td>

        {/* Sort Order */}
        <td className="w-[15%] px-2 py-2 align-top text-sm text-gray-600">
          {sortOrder}
        </td>

        {/* Actions */}
        <td className="w-[15%] px-2 py-2 align-top text-right">
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
            <th className="text-left px-2 py-2 w-[50%]">Name / Description</th>
            <th className="text-left px-2 py-2 w-[15%]">Sort Order</th>
            <th className="text-right px-2 py-2 w-[15%]">Actions</th>
          </tr>
        </thead>
        <tbody>{renderPillars(tree)}</tbody>
      </table>
    </div>
  );
}

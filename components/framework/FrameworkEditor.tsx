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

  const toggleExpand = (id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const expandAll = () => {
    const all: Record<string, boolean> = {};
    tree.forEach((p) => {
      all[p.id] = true;
      p.themes.forEach((t) => {
        all[t.id] = true;
        t.subthemes.forEach((s) => {
          all[s.id] = true;
        });
      });
    });
    setExpanded(all);
  };

  const collapseAll = () => {
    setExpanded({});
  };

  return (
    <div>
      {/* Controls row */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex gap-2">
          <button
            onClick={expandAll}
            className="px-3 py-1 rounded border text-sm bg-white hover:bg-gray-50"
          >
            Expand All
          </button>
          <button
            onClick={collapseAll}
            className="px-3 py-1 rounded border text-sm bg-white hover:bg-gray-50"
          >
            Collapse All
          </button>
          {editMode && (
            <button className="px-3 py-1 rounded border text-sm bg-white hover:bg-gray-50">
              + Add Pillar
            </button>
          )}
        </div>
        <div>
          <button
            onClick={() => setEditMode((v) => !v)}
            className="px-3 py-1 rounded border text-sm bg-white hover:bg-gray-50"
          >
            {editMode ? "Exit Edit Mode" : "Enter Edit Mode"}
          </button>
        </div>
      </div>

      {/* Framework Table */}
      <table className="w-full table-fixed border-collapse">
        <thead>
          <tr className="bg-gray-50 text-left text-xs font-semibold text-gray-600 uppercase">
            <th className="px-4 py-2 w-[20%]">Type / Ref Code</th>
            <th className="px-4 py-2 w-[55%]">Name / Description</th>
            <th className="px-4 py-2 w-[10%] text-right">Sort Order</th>
            <th className="px-4 py-2 w-[15%] text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {tree.map((pillar, pi) => (
            <>
              {/* Pillar Row */}
              <tr key={pillar.id} className="border-b">
                <td className="px-4 py-2 w-[20%]">
                  <button
                    onClick={() => toggleExpand(pillar.id)}
                    className="inline-flex items-center"
                  >
                    {expanded[pillar.id] ? (
                      <ChevronDown className="w-4 h-4 mr-1" />
                    ) : (
                      <ChevronRight className="w-4 h-4 mr-1" />
                    )}
                    Pillar
                  </button>
                </td>
                <td className="px-4 py-2 w-[55%]">
                  <div className="font-medium">{pillar.name}</div>
                  {pillar.description && (
                    <div className="text-xs text-gray-500">{pillar.description}</div>
                  )}
                </td>
                <td className="px-4 py-2 w-[10%] text-right">{pi + 1}</td>
                <td className="px-4 py-2 w-[15%] text-right">
                  {editMode ? (
                    <div className="flex justify-end gap-2">
                      <Edit2 className="w-4 h-4 cursor-pointer text-gray-600 hover:text-gray-800" />
                      <Trash2 className="w-4 h-4 cursor-pointer text-red-600 hover:text-red-800" />
                      <Plus className="w-4 h-4 cursor-pointer text-green-600 hover:text-green-800" />
                    </div>
                  ) : (
                    <div className="h-4" />
                  )}
                </td>
              </tr>

              {/* Themes */}
              {expanded[pillar.id] &&
                pillar.themes.map((theme, ti) => (
                  <>
                    <tr key={theme.id} className="border-b">
                      <td className="px-4 py-2 pl-8 w-[20%]">
                        <button
                          onClick={() => toggleExpand(theme.id)}
                          className="inline-flex items-center"
                        >
                          {expanded[theme.id] ? (
                            <ChevronDown className="w-4 h-4 mr-1" />
                          ) : (
                            <ChevronRight className="w-4 h-4 mr-1" />
                          )}
                          Theme
                        </button>
                      </td>
                      <td className="px-4 py-2 w-[55%]">
                        <div className="font-medium">{theme.name}</div>
                        {theme.description && (
                          <div className="text-xs text-gray-500">{theme.description}</div>
                        )}
                      </td>
                      <td className="px-4 py-2 w-[10%] text-right">
                        {pi + 1}.{ti + 1}
                      </td>
                      <td className="px-4 py-2 w-[15%] text-right">
                        {editMode ? (
                          <div className="flex justify-end gap-2">
                            <Edit2 className="w-4 h-4 cursor-pointer text-gray-600 hover:text-gray-800" />
                            <Trash2 className="w-4 h-4 cursor-pointer text-red-600 hover:text-red-800" />
                            <Plus className="w-4 h-4 cursor-pointer text-green-600 hover:text-green-800" />
                          </div>
                        ) : (
                          <div className="h-4" />
                        )}
                      </td>
                    </tr>

                    {/* Subthemes */}
                    {expanded[theme.id] &&
                      theme.subthemes.map((sub, si) => (
                        <tr key={sub.id} className="border-b">
                          <td className="px-4 py-2 pl-16 w-[20%]">Subtheme</td>
                          <td className="px-4 py-2 w-[55%]">
                            <div className="font-medium">{sub.name}</div>
                            {sub.description && (
                              <div className="text-xs text-gray-500">{sub.description}</div>
                            )}
                          </td>
                          <td className="px-4 py-2 w-[10%] text-right">
                            {pi + 1}.{ti + 1}.{si + 1}
                          </td>
                          <td className="px-4 py-2 w-[15%] text-right">
                            {editMode ? (
                              <div className="flex justify-end gap-2">
                                <Edit2 className="w-4 h-4 cursor-pointer text-gray-600 hover:text-gray-800" />
                                <Trash2 className="w-4 h-4 cursor-pointer text-red-600 hover:text-red-800" />
                              </div>
                            ) : (
                              <div className="h-4" />
                            )}
                          </td>
                        </tr>
                      ))}
                  </>
                ))}
            </>
          ))}
        </tbody>
      </table>
    </div>
  );
}

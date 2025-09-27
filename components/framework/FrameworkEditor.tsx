"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Pencil, Trash2 } from "lucide-react";
import type { NormalizedFramework } from "@/lib/types/framework";

type Props = {
  tree: NormalizedFramework[];
};

export default function FrameworkEditor({ tree }: Props) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [editMode, setEditMode] = useState(false);

  const toggle = (id: string) =>
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  const expandAll = () => {
    const all: Record<string, boolean> = {};
    const walk = (nodes: NormalizedFramework[]) => {
      for (const n of nodes) {
        all[n.id] = true;
        for (const t of n.themes) {
          all[t.id] = true;
          for (const s of t.subthemes) {
            all[s.id] = true;
          }
        }
      }
    };
    walk(tree);
    setExpanded(all);
  };

  const collapseAll = () => setExpanded({});

  return (
    <div className="mt-4 border rounded-lg p-4 bg-white">
      {/* Controls */}
      <div className="flex justify-between mb-2">
        <div className="flex gap-2">
          <button
            onClick={expandAll}
            className="px-2 py-1 border rounded text-sm bg-gray-50 hover:bg-gray-100"
          >
            Expand All
          </button>
          <button
            onClick={collapseAll}
            className="px-2 py-1 border rounded text-sm bg-gray-50 hover:bg-gray-100"
          >
            Collapse All
          </button>
        </div>
        <button
          onClick={() => setEditMode(!editMode)}
          className="px-3 py-1 border rounded text-sm bg-gray-50 hover:bg-gray-100"
        >
          {editMode ? "Exit Edit Mode" : "Enter Edit Mode"}
        </button>
      </div>

      {/* Table */}
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-gray-50 text-left text-xs font-semibold text-gray-600 uppercase">
            <th className="px-4 py-2 w-[15%]">Type / Ref Code</th>
            <th className="px-4 py-2 w-[55%]">Name / Description</th>
            <th className="px-4 py-2 w-[10%]">Sort Order</th>
            {editMode && (
              <th className="px-4 py-2 w-[20%] text-right">Actions</th>
            )}
          </tr>
        </thead>
        <tbody>
          {tree.map((pillar, i) => (
            <>
              {/* Pillar row */}
              <tr key={pillar.id} className="border-t">
                {/* Type / Ref Code */}
                <td className="px-4 py-2 align-top">
                  <div
                    className="flex items-center gap-2 cursor-pointer"
                    onClick={() => toggle(pillar.id)}
                  >
                    {expanded[pillar.id] ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                    <span className="rounded bg-blue-100 text-blue-700 px-2 py-0.5 text-xs">
                      Pillar
                    </span>
                    <span className="text-xs text-gray-500">P{i + 1}</span>
                  </div>
                </td>

                {/* Name / Description */}
                <td className="px-4 py-2">
                  <div className="font-semibold">{pillar.name}</div>
                  {pillar.description && (
                    <div className="text-xs text-gray-600">
                      {pillar.description}
                    </div>
                  )}
                </td>

                {/* Sort Order */}
                <td className="px-4 py-2 text-gray-600">{i + 1}</td>

                {/* Actions */}
                {editMode && (
                  <td className="px-4 py-2 text-right">
                    <div className="flex justify-end gap-2">
                      <button className="text-gray-500 hover:text-blue-600">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button className="text-gray-500 hover:text-red-600">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                )}
              </tr>

              {/* Themes */}
              {expanded[pillar.id] &&
                pillar.themes.map((theme, j) => (
                  <>
                    <tr key={theme.id} className="border-t bg-gray-50">
                      <td className="px-8 py-2 align-top">
                        <div
                          className="flex items-center gap-2 cursor-pointer"
                          onClick={() => toggle(theme.id)}
                        >
                          {expanded[theme.id] ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                          <span className="rounded bg-green-100 text-green-700 px-2 py-0.5 text-xs">
                            Theme
                          </span>
                          <span className="text-xs text-gray-500">
                            T{i + 1}.{j + 1}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-2">
                        <div className="font-medium">{theme.name}</div>
                        {theme.description && (
                          <div className="text-xs text-gray-600">
                            {theme.description}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-2 text-gray-600">{j + 1}</td>
                      {editMode && (
                        <td className="px-4 py-2 text-right">
                          <div className="flex justify-end gap-2">
                            <button className="text-gray-500 hover:text-blue-600">
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button className="text-gray-500 hover:text-red-600">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>

                    {/* Subthemes */}
                    {expanded[theme.id] &&
                      theme.subthemes.map((st, k) => (
                        <tr key={st.id} className="border-t">
                          <td className="px-12 py-2 align-top">
                            <span className="rounded bg-purple-100 text-purple-700 px-2 py-0.5 text-xs">
                              Subtheme
                            </span>
                            <span className="ml-2 text-xs text-gray-500">
                              ST{i + 1}.{j + 1}.{k + 1}
                            </span>
                          </td>
                          <td className="px-4 py-2">
                            <div className="font-medium">{st.name}</div>
                            {st.description && (
                              <div className="text-xs text-gray-600">
                                {st.description}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-2 text-gray-600">{k + 1}</td>
                          {editMode && (
                            <td className="px-4 py-2 text-right">
                              <div className="flex justify-end gap-2">
                                <button className="text-gray-500 hover:text-blue-600">
                                  <Pencil className="w-4 h-4" />
                                </button>
                                <button className="text-gray-500 hover:text-red-600">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          )}
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

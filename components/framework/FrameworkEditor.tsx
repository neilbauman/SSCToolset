"use client";

import { useState } from "react";
import type { NormalizedFramework } from "@/lib/types/framework";
import {
  ChevronRight,
  ChevronDown,
  Edit,
  Trash,
  Plus,
} from "lucide-react";

type Props = {
  tree: NormalizedFramework[];
};

export default function FrameworkEditor({ tree }: Props) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [editMode, setEditMode] = useState(false);

  const toggleExpand = (id: string) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="overflow-x-auto">
      {/* Controls */}
      <div className="flex justify-between items-center mb-4">
        <div className="space-x-2">
          <button
            onClick={() => {
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
            }}
            className="px-3 py-1 text-sm border rounded"
          >
            Expand All
          </button>
          <button
            onClick={() => setExpanded({})}
            className="px-3 py-1 text-sm border rounded"
          >
            Collapse All
          </button>
        </div>
        <div className="space-x-2">
          <button
            onClick={() => setEditMode((prev) => !prev)}
            className="px-3 py-1 text-sm border rounded"
          >
            {editMode ? "Exit Edit Mode" : "Enter Edit Mode"}
          </button>
          {editMode && (
            <button className="px-3 py-1 text-sm border rounded bg-blue-600 text-white">
              + Add Pillar
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <table className="min-w-full border border-gray-300 text-sm">
        <thead className="bg-gray-100">
          <tr>
            <th className="px-4 py-2 text-left w-[35%]">Type / Ref Code</th>
            <th className="px-4 py-2 text-left w-[35%]">Name / Description</th>
            <th className="px-4 py-2 text-center w-[15%]">Sort Order</th>
            <th className="px-4 py-2 text-right w-[15%]">Actions</th>
          </tr>
        </thead>
        <tbody>
          {tree.map((pillar, pi) => {
            const pillarExpanded = expanded[pillar.id];
            return (
              <>
                <tr key={pillar.id} className="border-b">
                  <td className="px-4 py-2 flex items-center space-x-2">
                    <button
                      onClick={() => toggleExpand(pillar.id)}
                      className="text-gray-500"
                    >
                      {pillarExpanded ? (
                        <ChevronDown size={16} />
                      ) : (
                        <ChevronRight size={16} />
                      )}
                    </button>
                    <span className="inline-block bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs">
                      Pillar
                    </span>
                    <span className="text-xs font-mono">P{pi + 1}</span>
                  </td>
                  <td className="px-4 py-2">
                    <div className="font-medium">{pillar.name}</div>
                    <div className="text-xs text-gray-600">
                      {pillar.description}
                    </div>
                  </td>
                  <td className="px-4 py-2 text-center">-</td>
                  <td className="px-4 py-2 text-right">
                    {editMode && (
                      <div className="flex justify-end space-x-2">
                        <button className="text-gray-600 hover:text-blue-600">
                          <Edit size={16} />
                        </button>
                        <button className="text-gray-600 hover:text-red-600">
                          <Trash size={16} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>

                {pillarExpanded &&
                  pillar.themes.map((theme, ti) => {
                    const themeExpanded = expanded[theme.id];
                    return (
                      <>
                        <tr key={theme.id} className="border-b">
                          <td className="px-4 py-2 pl-10 flex items-center space-x-2">
                            <button
                              onClick={() => toggleExpand(theme.id)}
                              className="text-gray-500"
                            >
                              {themeExpanded ? (
                                <ChevronDown size={16} />
                              ) : (
                                <ChevronRight size={16} />
                              )}
                            </button>
                            <span className="inline-block bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs">
                              Theme
                            </span>
                            <span className="text-xs font-mono">
                              T{pi + 1}.{ti + 1}
                            </span>
                          </td>
                          <td className="px-4 py-2">
                            <div className="font-medium">{theme.name}</div>
                            <div className="text-xs text-gray-600">
                              {theme.description}
                            </div>
                          </td>
                          <td className="px-4 py-2 text-center">-</td>
                          <td className="px-4 py-2 text-right">
                            {editMode && (
                              <div className="flex justify-end space-x-2">
                                <button className="text-gray-600 hover:text-blue-600">
                                  <Edit size={16} />
                                </button>
                                <button className="text-gray-600 hover:text-red-600">
                                  <Trash size={16} />
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>

                        {themeExpanded &&
                          theme.subthemes.map((subtheme, si) => (
                            <tr key={subtheme.id} className="border-b">
                              <td className="px-4 py-2 pl-16 flex items-center space-x-2">
                                <span className="inline-block bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded text-xs">
                                  Subtheme
                                </span>
                                <span className="text-xs font-mono">
                                  ST{pi + 1}.{ti + 1}.{si + 1}
                                </span>
                              </td>
                              <td className="px-4 py-2">
                                <div className="font-medium">
                                  {subtheme.name}
                                </div>
                                <div className="text-xs text-gray-600">
                                  {subtheme.description}
                                </div>
                              </td>
                              <td className="px-4 py-2 text-center">-</td>
                              <td className="px-4 py-2 text-right">
                                {editMode && (
                                  <div className="flex justify-end space-x-2">
                                    <button className="text-gray-600 hover:text-blue-600">
                                      <Edit size={16} />
                                    </button>
                                    <button className="text-gray-600 hover:text-red-600">
                                      <Trash size={16} />
                                    </button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          ))}
                      </>
                    );
                  })}
              </>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

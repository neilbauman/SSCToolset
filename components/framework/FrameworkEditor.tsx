"use client";

import { useState } from "react";
import type { NormalizedFramework } from "@/lib/types/framework";
import { ChevronRight, ChevronDown, Edit, Trash, Plus } from "lucide-react";

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

      <table className="min-w-full border text-sm">
        <thead>
          <tr className="bg-gray-100">
            <th className="px-4 py-2 text-left w-1/4">Type / Ref Code</th>
            <th className="px-4 py-2 text-left w-1/2">Name / Description</th>
            <th className="px-4 py-2 text-center w-[10%]">Sort Order</th>
            <th className="px-4 py-2 text-right w-[15%]">Actions</th>
          </tr>
        </thead>
        <tbody>
          {tree.map((pillar, pIdx) => {
            const isExpanded = expanded[pillar.id];
            return (
              <>
                <tr key={pillar.id} className="border-b">
                  <td className="px-4 py-2">
                    <div className="flex items-center">
                      <button
                        onClick={() => toggleExpand(pillar.id)}
                        className="mr-2"
                      >
                        {isExpanded ? (
                          <ChevronDown size={16} />
                        ) : (
                          <ChevronRight size={16} />
                        )}
                      </button>
                      <span className="px-2 py-1 rounded text-xs bg-blue-100 text-blue-700">
                        Pillar
                      </span>
                      <span className="ml-2 font-mono text-gray-600">
                        P{pIdx + 1}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-2">
                    <div className="font-medium">{pillar.name}</div>
                    <div className="text-xs text-gray-500">
                      {pillar.description}
                    </div>
                  </td>
                  <td className="px-4 py-2 text-center">{pIdx + 1}</td>
                  <td className="px-4 py-2 text-right space-x-2">
                    {editMode && (
                      <>
                        <button className="text-blue-600 hover:underline">
                          <Edit size={16} />
                        </button>
                        <button className="text-red-600 hover:underline">
                          <Trash size={16} />
                        </button>
                        <button className="text-green-600 hover:underline">
                          <Plus size={16} />
                        </button>
                      </>
                    )}
                  </td>
                </tr>
                {isExpanded &&
                  pillar.themes.map((theme, tIdx) => {
                    const themeExpanded = expanded[theme.id];
                    return (
                      <>
                        <tr key={theme.id} className="border-b">
                          <td className="px-4 py-2 pl-10">
                            <div className="flex items-center">
                              <button
                                onClick={() => toggleExpand(theme.id)}
                                className="mr-2"
                              >
                                {themeExpanded ? (
                                  <ChevronDown size={16} />
                                ) : (
                                  <ChevronRight size={16} />
                                )}
                              </button>
                              <span className="px-2 py-1 rounded text-xs bg-green-100 text-green-700">
                                Theme
                              </span>
                              <span className="ml-2 font-mono text-gray-600">
                                T{pIdx + 1}.{tIdx + 1}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-2">
                            <div className="font-medium">{theme.name}</div>
                            <div className="text-xs text-gray-500">
                              {theme.description}
                            </div>
                          </td>
                          <td className="px-4 py-2 text-center">{tIdx + 1}</td>
                          <td className="px-4 py-2 text-right space-x-2">
                            {editMode && (
                              <>
                                <button className="text-blue-600 hover:underline">
                                  <Edit size={16} />
                                </button>
                                <button className="text-red-600 hover:underline">
                                  <Trash size={16} />
                                </button>
                                <button className="text-green-600 hover:underline">
                                  <Plus size={16} />
                                </button>
                              </>
                            )}
                          </td>
                        </tr>
                        {themeExpanded &&
                          theme.subthemes.map((sub, sIdx) => (
                            <tr key={sub.id} className="border-b">
                              <td className="px-4 py-2 pl-16">
                                <div className="flex items-center">
                                  <span className="px-2 py-1 rounded text-xs bg-purple-100 text-purple-700">
                                    Subtheme
                                  </span>
                                  <span className="ml-2 font-mono text-gray-600">
                                    ST{pIdx + 1}.{tIdx + 1}.{sIdx + 1}
                                  </span>
                                </div>
                              </td>
                              <td className="px-4 py-2">
                                <div className="font-medium">{sub.name}</div>
                                <div className="text-xs text-gray-500">
                                  {sub.description}
                                </div>
                              </td>
                              <td className="px-4 py-2 text-center">
                                {sIdx + 1}
                              </td>
                              <td className="px-4 py-2 text-right space-x-2">
                                {editMode && (
                                  <>
                                    <button className="text-blue-600 hover:underline">
                                      <Edit size={16} />
                                    </button>
                                    <button className="text-red-600 hover:underline">
                                      <Trash size={16} />
                                    </button>
                                  </>
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

"use client";

import { useState, useEffect } from "react";
import { ChevronDown, ChevronRight, Pencil, Trash2 } from "lucide-react";
import { getVersionTree } from "@/lib/services/framework";
import type { NormalizedFramework } from "@/lib/types/framework";

type Props = {
  versionId: string;
};

export default function FrameworkEditor({ versionId }: Props) {
  const [tree, setTree] = useState<NormalizedFramework[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    getVersionTree(versionId).then(setTree).catch(console.error);
  }, [versionId]);

  const toggle = (id: string) =>
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

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

  const collapseAll = () => setExpanded({});

  return (
    <div>
      {/* Controls */}
      <div className="flex justify-between mb-2">
        <div className="flex gap-2">
          <button onClick={expandAll} className="px-2 py-1 border rounded text-sm bg-gray-50 hover:bg-gray-100">
            Expand All
          </button>
          <button onClick={collapseAll} className="px-2 py-1 border rounded text-sm bg-gray-50 hover:bg-gray-100">
            Collapse All
          </button>
          {editMode && (
            <button className="px-2 py-1 border rounded text-sm bg-gray-50 hover:bg-gray-100">
              Add Pillar
            </button>
          )}
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
            <th className="px-4 py-2 w-[10%] text-right">Sort Order</th>
            <th className="px-4 py-2 w-[20%] text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {tree.map((pillar, i) => (
            <>
              {/* Pillar row */}
              <tr key={pillar.id} className="border-t">
                <td className="px-4 py-2 align-top">
                  <div className="flex items-center gap-2 cursor-pointer" onClick={() => toggle(pillar.id)}>
                    {expanded[pillar.id] ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                    <span className="rounded bg-blue-100 text-blue-700 px-2 py-0.5 text-xs">Pillar</span>
                    <span className="text-xs text-gray-500">P{i + 1}</span>
                  </div>
                </td>
                <td className="px-4 py-2">
                  <div className="font-semibold">{pillar.name}</div>
                  {pillar.description && (
                    <div className="text-xs text-gray-600">{pillar.description}</div>
                  )}
                </td>
                <td className="px-4 py-2 text-right text-gray-600">{i + 1}</td>
                <td className="px-4 py-2 text-right">
                  {editMode && (
                    <div className="flex justify-end gap-2">
                      <button className="text-gray-500 hover:text-blue-600"><Pencil className="w-4 h-4" /></button>
                      <button className="text-gray-500 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  )}
                </td>
              </tr>

              {/* Themes under pillar */}
              {expanded[pillar.id] &&
                pillar.themes.map((theme, j) => (
                  <>
                    <tr key={theme.id} className="border-t bg-gray-50">
                      <td className="px-8 py-2 align-top">
                        <div className="flex items-center gap-2 cursor-pointer" onClick={() => toggle(theme.id)}>
                          {expanded[theme.id] ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                          <span className="rounded bg-green-100 text-green-700 px-2 py-0.5 text-xs">Theme</span>
                          <span className="text-xs text-gray-500">T{j + 1}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2">
                        <div className="font-semibold">{theme.name}</div>
                        {theme.description && (
                          <div className="text-xs text-gray-600">{theme.description}</div>
                        )}
                      </td>
                      <td className="px-4 py-2 text-right text-gray-600">{j + 1}</td>
                      <td className="px-4 py-2 text-right">
                        {editMode && (
                          <div className="flex justify-end gap-2">
                            <button className="text-gray-500 hover:text-blue-600"><Pencil className="w-4 h-4" /></button>
                            <button className="text-gray-500 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        )}
                      </td>
                    </tr>

                    {/* Subthemes under theme */}
                    {expanded[theme.id] &&
                      theme.subthemes.map((sub, k) => (
                        <tr key={sub.id} className="border-t">
                          <td className="px-12 py-2 align-top">
                            <div className="flex items-center gap-2">
                              <span className="rounded bg-purple-100 text-purple-700 px-2 py-0.5 text-xs">
                                Subtheme
                              </span>
                              <span className="text-xs text-gray-500">
                                ST{j + 1}.{k + 1}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-2">
                            <div className="font-semibold">{sub.name}</div>
                            {sub.description && (
                              <div className="text-xs text-gray-600">{sub.description}</div>
                            )}
                          </td>
                          <td className="px-4 py-2 text-right text-gray-600">{k + 1}</td>
                          <td className="px-4 py-2 text-right">
                            {editMode && (
                              <div className="flex justify-end gap-2">
                                <button className="text-gray-500 hover:text-blue-600"><Pencil className="w-4 h-4" /></button>
                                <button className="text-gray-500 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                              </div>
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

"use client";

import { useEffect, useState } from "react";
import {
  ChevronRight,
  ChevronDown,
  Pencil,
  Trash2,
  Expand,
  Minimize,
} from "lucide-react";
import type { NormalizedFramework } from "@/lib/types/framework";

type Props = { versionId: string };

export default function FrameworkEditor({ versionId }: Props) {
  const [tree, setTree] = useState<NormalizedFramework[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/framework/versions/${versionId}/tree`, {
          cache: "no-store",
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as NormalizedFramework[];
        if (!cancelled) setTree(data);
      } catch (err: any) {
        console.error("Failed to load framework tree", err);
        if (!cancelled) setError("Failed to load framework tree.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [versionId]);

  const toggle = (id: string) =>
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  const expandAll = () => {
    const all: Record<string, boolean> = {};
    tree.forEach((p) => {
      all[p.id] = true;
      p.themes.forEach((t) => {
        all[t.id] = true;
      });
    });
    setExpanded(all);
  };

  const collapseAll = () => setExpanded({});

  if (loading) return <div className="text-sm text-gray-600">Loading framework…</div>;
  if (error) return <div className="text-sm text-red-600">{error}</div>;
  if (!tree || tree.length === 0) return <div className="text-sm text-gray-600">No framework items found.</div>;

  return (
    <div className="overflow-x-auto">
      {/* Controls */}
      <div className="flex justify-between items-center mb-2">
        <div className="flex gap-2">
          <button
            onClick={expandAll}
            className="flex items-center gap-1 text-sm px-2 py-1 border rounded hover:bg-gray-50"
          >
            <Expand className="w-4 h-4" /> Expand All
          </button>
          <button
            onClick={collapseAll}
            className="flex items-center gap-1 text-sm px-2 py-1 border rounded hover:bg-gray-50"
          >
            <Minimize className="w-4 h-4" /> Collapse All
          </button>
        </div>
        <button
          onClick={() => setEditMode(!editMode)}
          className={`text-sm px-3 py-1 border rounded ${
            editMode
              ? "bg-blue-600 text-white hover:bg-blue-700"
              : "hover:bg-gray-50"
          }`}
        >
          {editMode ? "Exit Edit Mode" : "Enter Edit Mode"}
        </button>
      </div>

      {/* Table */}
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-gray-50 text-left text-xs font-semibold text-gray-600 uppercase">
            <th className="px-4 py-2 w-1/4">Type / Name</th>
            <th className="px-4 py-2">Sort Order</th>
            {editMode && <th className="px-4 py-2">Actions</th>}
          </tr>
        </thead>
        <tbody>
          {tree.map((pillar, i) => (
            <>
              {/* Pillar row */}
              <tr key={pillar.id} className="border-t">
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
                    <div>
                      <div className="font-semibold">{pillar.name}</div>
                      {pillar.description && (
                        <div className="text-xs text-gray-600">{pillar.description}</div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-2 text-gray-600">{i + 1}</td>
                {editMode && (
                  <td className="px-4 py-2 flex gap-2">
                    <button className="text-gray-500 hover:text-blue-600">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button className="text-gray-500 hover:text-red-600">
                      <Trash2 className="w-4 h-4" />
                    </button>
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
                          <div>
                            <div className="font-medium">{theme.name}</div>
                            {theme.description && (
                              <div className="text-xs text-gray-600">{theme.description}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-2 text-gray-600">{j + 1}</td>
                      {editMode && (
                        <td className="px-4 py-2 flex gap-2">
                          <button className="text-gray-500 hover:text-blue-600">
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button className="text-gray-500 hover:text-red-600">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      )}
                    </tr>

                    {/* Subthemes */}
                    {expanded[theme.id] &&
                      theme.subthemes.map((s, k) => (
                        <tr key={s.id} className="border-t">
                          <td className="px-12 py-2 align-top">
                            <div className="flex items-center gap-2">
                              <span className="rounded bg-purple-100 text-purple-700 px-2 py-0.5 text-xs">
                                Subtheme
                              </span>
                              <div>
                                <div>{s.name}</div>
                                {s.description && (
                                  <div className="text-xs text-gray-600">{s.description}</div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-2 text-gray-600">{k + 1}</td>
                          {editMode && (
                            <td className="px-4 py-2 flex gap-2">
                              <button className="text-gray-500 hover:text-blue-600">
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button className="text-gray-500 hover:text-red-600">
                                <Trash2 className="w-4 h-4" />
                              </button>
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

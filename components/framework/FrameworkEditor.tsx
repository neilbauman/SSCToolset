// components/framework/FrameworkEditor.tsx
"use client";

import React, { useEffect, useState } from "react";
import {
  getFrameworkTree,
  replaceFrameworkVersionItems,
} from "@/lib/services/framework";
import type { NormalizedFramework } from "@/lib/types/framework";
import AddPillarModal from "./AddPillarModal";
import AddThemeModal from "./AddThemeModal";
import AddSubthemeModal from "./AddSubthemeModal";

type Props = {
  versionId: string;
  editable?: boolean;
};

export default function FrameworkEditor({ versionId, editable = true }: Props) {
  const [tree, setTree] = useState<NormalizedFramework[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [dirty, setDirty] = useState(false);
  const [showAddPillar, setShowAddPillar] = useState(false);
  const [addThemeParent, setAddThemeParent] = useState<NormalizedFramework | null>(null);
  const [addSubthemeParent, setAddSubthemeParent] = useState<NormalizedFramework | null>(null);

  useEffect(() => {
    loadTree();
  }, [versionId]);

  const loadTree = async () => {
    const data = await getFrameworkTree(versionId);
    setTree(data);
    setExpanded(new Set(data.map((n) => n.id))); // default expanded
    setDirty(false);
  };

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const copy = new Set(prev);
      if (copy.has(id)) copy.delete(id);
      else copy.add(id);
      return copy;
    });
  };

  const expandAll = () => {
    const allIds: string[] = [];
    const walk = (nodes: NormalizedFramework[]) => {
      for (const n of nodes) {
        allIds.push(n.id);
        if (n.themes) walk(n.themes);
        if (n.subthemes) walk(n.subthemes);
      }
    };
    walk(tree);
    setExpanded(new Set(allIds));
  };

  const collapseAll = () => setExpanded(new Set());

  const handleSave = async () => {
    await replaceFrameworkVersionItems(versionId, tree);
    await loadTree();
  };

  const handleDiscard = async () => {
    await loadTree();
  };

  const renderNode = (node: NormalizedFramework, depth: number) => {
    const isExpanded = expanded.has(node.id);
    const hasChildren =
      (node.type === "pillar" && node.themes && node.themes.length > 0) ||
      (node.type === "theme" && node.subthemes && node.subthemes.length > 0);

    return (
      <React.Fragment key={node.id}>
        <tr>
          <td className="px-2 py-1 w-[20%]">
            <div className="flex items-center gap-2" style={{ marginLeft: depth * 16 }}>
              {hasChildren && (
                <button
                  onClick={() => toggleExpand(node.id)}
                  className="text-xs text-blue-600"
                >
                  {isExpanded ? "−" : "+"}
                </button>
              )}
              <span className="font-semibold">{node.ref_code}</span>
            </div>
          </td>
          <td className="px-2 py-1 w-[40%]">
            <div>{node.name}</div>
            {node.description && (
              <div className="text-xs text-gray-500">{node.description}</div>
            )}
          </td>
          <td className="px-2 py-1 w-[10%]">{node.sort_order}</td>
          <td className="px-2 py-1 w-[30%]">
            {editable && (
              <div className="flex gap-2">
                <button className="text-blue-600 text-sm">Edit</button>
                <button className="text-red-600 text-sm">Delete</button>
                {node.type === "pillar" && (
                  <button
                    className="text-green-600 text-sm"
                    onClick={() => setAddThemeParent(node)}
                  >
                    Add Theme
                  </button>
                )}
                {node.type === "theme" && (
                  <button
                    className="text-green-600 text-sm"
                    onClick={() => setAddSubthemeParent(node)}
                  >
                    Add Subtheme
                  </button>
                )}
              </div>
            )}
          </td>
        </tr>

        {isExpanded && node.themes &&
          node.themes.map((t) => renderNode(t, depth + 1))}

        {isExpanded && node.subthemes &&
          node.subthemes.map((s) => renderNode(s, depth + 1))}
      </React.Fragment>
    );
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      {editable && (
        <div className="flex justify-between items-center">
          <div className="flex gap-2">
            <button
              onClick={() => setShowAddPillar(true)}
              className="px-3 py-1 rounded bg-blue-600 text-white text-sm"
            >
              + Add Pillar
            </button>
            <button
              onClick={expandAll}
              className="px-2 py-1 rounded bg-gray-200 text-sm"
            >
              Expand All
            </button>
            <button
              onClick={collapseAll}
              className="px-2 py-1 rounded bg-gray-200 text-sm"
            >
              Collapse All
            </button>
          </div>
          {dirty && (
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                className="px-3 py-1 rounded bg-green-600 text-white text-sm"
              >
                Save
              </button>
              <button
                onClick={handleDiscard}
                className="px-3 py-1 rounded bg-red-600 text-white text-sm"
              >
                Discard
              </button>
            </div>
          )}
        </div>
      )}

      {/* Table */}
      <table className="w-full border-collapse border text-sm">
        <thead>
          <tr className="bg-gray-100">
            <th className="px-2 py-1 text-left w-[20%]">Type / Ref Code</th>
            <th className="px-2 py-1 text-left w-[40%]">Name / Description</th>
            <th className="px-2 py-1 text-left w-[10%]">Sort Order</th>
            <th className="px-2 py-1 text-left w-[30%]">Actions</th>
          </tr>
        </thead>
        <tbody>{tree.map((p) => renderNode(p, 0))}</tbody>
      </table>

      {/* Modals */}
      {showAddPillar && (
        <AddPillarModal
          versionId={versionId}
          existing={tree}
          onClose={() => setShowAddPillar(false)}
          onAdd={(pillar) => {
            setTree((prev) => [...prev, pillar]);
            setDirty(true);
          }}
        />
      )}
      {addThemeParent && (
        <AddThemeModal
          versionId={versionId}
          parent={addThemeParent}
          onClose={() => setAddThemeParent(null)}
          onAdd={(theme) => {
            setTree((prev) =>
              prev.map((p) =>
                p.id === addThemeParent.id
                  ? { ...p, themes: [...(p.themes || []), theme] }
                  : p
              )
            );
            setDirty(true);
          }}
        />
      )}
      {addSubthemeParent && (
        <AddSubthemeModal
          versionId={versionId}
          parent={addSubthemeParent}
          onClose={() => setAddSubthemeParent(null)}
          onAdd={(sub) => {
            setTree((prev) =>
              prev.map((p) => ({
                ...p,
                themes: p.themes?.map((t) =>
                  t.id === addSubthemeParent.id
                    ? { ...t, subthemes: [...(t.subthemes || []), sub] }
                    : t
                ),
              }))
            );
            setDirty(true);
          }}
        />
      )}
    </div>
  );
}

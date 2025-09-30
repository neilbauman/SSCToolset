"use client";

import React, { useEffect, useState } from "react";
import {
  getVersionTree,
  replaceFrameworkVersionItems,
} from "@/lib/services/framework";
import type { NormalizedFramework } from "@/lib/types/framework";
import {
  Plus,
  Edit3,
  Trash2,
  PlusCircle,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

import AddPillarModal from "./AddPillarModal";
import AddThemeModal from "./AddThemeModal";
import AddSubthemeModal from "./AddSubthemeModal";

type Props = {
  versionId: string;
  editable: boolean;
};

export default function FrameworkEditor({ versionId, editable }: Props) {
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
    try {
      const data = await getVersionTree(versionId);
      setTree(data || []);
      setDirty(false);
    } catch (err) {
      console.error("Error loading framework tree:", err);
    }
  };

  const handleSave = async () => {
    try {
      await replaceFrameworkVersionItems(versionId, tree);
      setDirty(false);
      await loadTree();
    } catch (err) {
      console.error("Error saving framework:", err);
    }
  };

  const toggleExpand = (id: string) => {
    const copy = new Set(expanded);
    if (copy.has(id)) copy.delete(id);
    else copy.add(id);
    setExpanded(copy);
  };

  const expandAll = () => {
    const allIds = new Set<string>();
    const traverse = (nodes: NormalizedFramework[]) => {
      for (const n of nodes) {
        allIds.add(n.id);
        traverse(n.themes || []);
        traverse(n.subthemes || []);
      }
    };
    traverse(tree);
    setExpanded(allIds);
  };

  const collapseAll = () => setExpanded(new Set());

  const renderRow = (item: NormalizedFramework, level: number) => {
    const isExpanded = expanded.has(item.id);
    const hasChildren =
      (item.type === "pillar" && item.themes?.length) ||
      (item.type === "theme" && item.subthemes?.length);

    const badgeColor =
      item.type === "pillar"
        ? "bg-blue-100 text-blue-800"
        : item.type === "theme"
        ? "bg-green-100 text-green-800"
        : "bg-orange-100 text-orange-800";

    return (
      <React.Fragment key={item.id}>
        <tr>
          {/* Type / Ref Code */}
          <td
            className="px-2 py-1 align-top"
            style={{ paddingLeft: `${level * 16 + 8}px` }}
          >
            <div className="flex items-center gap-1">
              {hasChildren && (
                <button
                  onClick={() => toggleExpand(item.id)}
                  className="text-gray-600 hover:text-gray-900"
                >
                  {isExpanded ? (
                    <ChevronDown size={14} />
                  ) : (
                    <ChevronRight size={14} />
                  )}
                </button>
              )}
              <span
                className={`px-2 py-0.5 rounded text-xs font-medium ${badgeColor}`}
              >
                {item.type}
              </span>
              <span className="text-xs text-gray-500">{item.ref_code}</span>
            </div>
          </td>

          {/* Name / Description */}
          <td
            className="px-2 py-1 align-top"
            style={{ paddingLeft: `${level * 16 + 8}px` }}
          >
            <div className="font-medium">{item.name}</div>
            {item.description && (
              <div className="text-xs text-gray-500">{item.description}</div>
            )}
          </td>

          {/* Sort Order */}
          <td className="px-2 py-1 align-top">{item.sort_order ?? "-"}</td>

          {/* Actions */}
          <td className="px-2 py-1 align-top text-right">
            {editable && (
              <div className="flex justify-end gap-2 text-gray-600">
                <button className="hover:text-blue-600" title="Edit">
                  <Edit3 size={16} />
                </button>
                <button className="hover:text-red-600" title="Delete">
                  <Trash2 size={16} />
                </button>
                {item.type !== "subtheme" && (
                  <button
                    className="hover:text-green-600"
                    title={item.type === "pillar" ? "Add Theme" : "Add Subtheme"}
                    onClick={() =>
                      item.type === "pillar"
                        ? setAddThemeParent(item)
                        : setAddSubthemeParent(item)
                    }
                  >
                    <PlusCircle size={16} />
                  </button>
                )}
              </div>
            )}
          </td>
        </tr>

        {/* Render children if expanded */}
        {isExpanded &&
          (item.type === "pillar"
            ? item.themes?.map((t) => renderRow(t, level + 1))
            : item.subthemes?.map((s) => renderRow(s, level + 1)))}
      </React.Fragment>
    );
  };

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <button
            onClick={expandAll}
            className="px-2 py-1 text-sm rounded bg-gray-200 hover:bg-gray-300"
          >
            Expand All
          </button>
          <button
            onClick={collapseAll}
            className="px-2 py-1 text-sm rounded bg-gray-200 hover:bg-gray-300"
          >
            Collapse All
          </button>
          {editable && (
            <button
              onClick={() => setShowAddPillar(true)}
              className="px-2 py-1 text-sm rounded bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-1"
            >
              <Plus size={16} /> Add Pillar
            </button>
          )}
        </div>

        {dirty && (
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className="px-3 py-1 text-sm rounded bg-blue-600 text-white hover:bg-blue-700"
            >
              Save
            </button>
            <button
              onClick={loadTree}
              className="px-3 py-1 text-sm rounded bg-gray-200 hover:bg-gray-300"
            >
              Discard
            </button>
          </div>
        )}
      </div>

      {/* Table */}
      <table className="w-full border text-sm table-fixed">
        <thead className="bg-gray-100 text-sm">
          <tr>
            <th className="text-left px-2 py-2 w-[25%]">Type / Ref Code</th>
            <th className="text-left px-2 py-2 w-[45%]">Name / Description</th>
            <th className="text-left px-2 py-2 w-[15%]">Sort Order</th>
            <th className="text-right px-2 py-2 w-[15%]">Actions</th>
          </tr>
        </thead>
        <tbody>{tree.map((p) => renderRow(p, 0))}</tbody>
      </table>

      {/* Modals */}
      {showAddPillar && (
        <AddPillarModal
          versionId={versionId}
          existing={tree}
          onClose={() => setShowAddPillar(false)}
          onAdd={(pillar) => {
            setTree([...tree, pillar]);
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
            const updated = tree.map((p) =>
              p.id === addThemeParent.id
                ? { ...p, themes: [...(p.themes || []), theme] }
                : p
            );
            setTree(updated);
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
            const updated = tree.map((p) => ({
              ...p,
              themes: p.themes?.map((t) =>
                t.id === addSubthemeParent.id
                  ? { ...t, subthemes: [...(t.subthemes || []), sub] }
                  : t
              ),
            }));
            setTree(updated);
            setDirty(true);
          }}
        />
      )}
    </div>
  );
}

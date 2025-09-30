"use client";

import { useEffect, useState } from "react";
import {
  getVersionTree,
  replaceFrameworkVersionItems,
  deletePillar,
  deleteTheme,
  deleteSubtheme,
} from "@/lib/services/framework";
import type { NormalizedFramework } from "@/lib/types/framework";
import { ChevronRight, ChevronDown, Plus, Pencil, Trash2 } from "lucide-react";
import EditEntityModal from "./EditEntityModal";
import AddPillarModal from "./AddPillarModal";
import AddThemeModal from "./AddThemeModal";
import AddSubthemeModal from "./AddSubthemeModal";

type Props = {
  versionId: string;
  editable?: boolean;
};

export default function FrameworkEditor({ versionId, editable = false }: Props) {
  const [tree, setTree] = useState<NormalizedFramework[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [dirty, setDirty] = useState(false);

  const [editingEntity, setEditingEntity] = useState<NormalizedFramework | null>(null);
  const [showAddPillar, setShowAddPillar] = useState(false);
  const [addThemeParent, setAddThemeParent] = useState<NormalizedFramework | null>(null);
  const [addSubthemeParent, setAddSubthemeParent] =
    useState<NormalizedFramework | null>(null);

  useEffect(() => {
    loadTree();
  }, [versionId]);

  async function loadTree() {
    const data = await getVersionTree(versionId);
    setTree(data || []);
    setExpanded(new Set());
    setDirty(false);
  }

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function expandAll() {
    const allIds = new Set<string>();
    const collectIds = (items: NormalizedFramework[]) => {
      for (const i of items) {
        allIds.add(i.id);
        if (i.themes) collectIds(i.themes);
        if (i.subthemes) collectIds(i.subthemes);
      }
    };
    collectIds(tree);
    setExpanded(allIds);
  }

  function collapseAll() {
    setExpanded(new Set());
  }

  async function handleSave() {
    await replaceFrameworkVersionItems(versionId, tree);
    await loadTree();
  }

  function handleDiscard() {
    loadTree();
  }

  // Recursive row renderer
  const renderRows = (items: NormalizedFramework[], level = 0, parentSort?: number) =>
    items.map((node) => {
      const hasChildren =
        (node.type === "pillar" && node.themes && node.themes.length > 0) ||
        (node.type === "theme" && node.subthemes && node.subthemes.length > 0);

      const isExpanded = expanded.has(node.id);

      return (
        <div key={node.id}>
          <div
            className="grid grid-cols-12 items-center border-b text-sm"
            style={{ paddingLeft: `${level * 16}px` }}
          >
            {/* Type / Ref Code */}
            <div className="col-span-3 flex items-center gap-2 py-2">
              {hasChildren && (
                <button
                  onClick={() => toggleExpand(node.id)}
                  className="text-gray-500"
                >
                  {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </button>
              )}
              <span
                className={`px-2 py-0.5 rounded text-xs font-medium ${
                  node.type === "pillar"
                    ? "bg-blue-100 text-blue-700"
                    : node.type === "theme"
                    ? "bg-green-100 text-green-700"
                    : "bg-orange-100 text-orange-700"
                }`}
              >
                {node.type}
              </span>
              <span className="text-gray-500 text-xs">{node.ref_code}</span>
            </div>

            {/* Name / Description */}
            <div className="col-span-5 py-2">
              <div className="font-medium">{node.name}</div>
              {node.description && (
                <div className="text-xs text-gray-500">{node.description}</div>
              )}
            </div>

            {/* Sort Order */}
            <div className="col-span-2 py-2 text-center">{node.sort_order}</div>

            {/* Actions */}
            <div className="col-span-2 py-2 flex justify-end gap-2">
              {editable && (
                <>
                  {/* Edit */}
                  <button
                    onClick={() => setEditingEntity(node)}
                    className="text-gray-600 hover:text-blue-600"
                    title="Edit"
                  >
                    <Pencil size={16} />
                  </button>

                  {/* Delete */}
                  <button
                    onClick={async () => {
                      try {
                        if (node.type === "pillar") await deletePillar(node.id);
                        else if (node.type === "theme") await deleteTheme(node.id);
                        else if (node.type === "subtheme") await deleteSubtheme(node.id);

                        const deleteNode = (
                          items: NormalizedFramework[]
                        ): NormalizedFramework[] =>
                          items
                            .filter((i) => i.id !== node.id)
                            .map((i) => ({
                              ...i,
                              themes: i.themes ? deleteNode(i.themes) : i.themes,
                              subthemes: i.subthemes
                                ? deleteNode(i.subthemes)
                                : i.subthemes,
                            }));

                        setTree(deleteNode(tree));
                        setDirty(true);
                      } catch (err: any) {
                        console.error("Error deleting entity:", err.message);
                      }
                    }}
                    className="text-gray-600 hover:text-red-600"
                    title="Delete"
                  >
                    <Trash2 size={16} />
                  </button>

                  {/* Add Child */}
                  {node.type === "pillar" && (
                    <button
                      onClick={() => setAddThemeParent(node)}
                      className="text-gray-600 hover:text-green-600"
                      title="Add Theme"
                    >
                      <Plus size={16} />
                    </button>
                  )}
                  {node.type === "theme" && (
                    <button
                      onClick={() => setAddSubthemeParent(node)}
                      className="text-gray-600 hover:text-green-600"
                      title="Add Subtheme"
                    >
                      <Plus size={16} />
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Children */}
          {isExpanded &&
            node.themes &&
            renderRows(node.themes, level + 1, node.sort_order)}
          {isExpanded &&
            node.subthemes &&
            renderRows(node.subthemes, level + 1, parentSort)}
        </div>
      );
    });

  return (
    <div>
      {/* Toolbar */}
      <div className="flex justify-between mb-2">
        <div className="flex gap-2">
          <button
            className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-sm"
            onClick={expandAll}
          >
            Expand All
          </button>
          <button
            className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-sm"
            onClick={collapseAll}
          >
            Collapse All
          </button>
          {editable && (
            <button
              className="px-2 py-1 bg-blue-600 text-white rounded text-sm"
              onClick={() => setShowAddPillar(true)}
            >
              + Add Pillar
            </button>
          )}
        </div>
        {dirty && (
          <div className="flex gap-2">
            <button
              className="px-3 py-1 bg-blue-600 text-white rounded text-sm"
              onClick={handleSave}
            >
              Save
            </button>
            <button
              className="px-3 py-1 bg-gray-200 rounded text-sm"
              onClick={handleDiscard}
            >
              Discard
            </button>
          </div>
        )}
      </div>

      {/* Header Row */}
      <div className="grid grid-cols-12 bg-gray-50 border-b font-medium text-sm">
        <div className="col-span-3 py-2 px-2">Type / Ref Code</div>
        <div className="col-span-5 py-2">Name / Description</div>
        <div className="col-span-2 py-2 text-center">Sort Order</div>
        <div className="col-span-2 py-2 text-right">Actions</div>
      </div>

      {/* Tree Rows */}
      <div>{renderRows(tree)}</div>

      {/* Edit Modal */}
      {editingEntity && (
        <EditEntityModal
          entity={editingEntity}
          onClose={() => setEditingEntity(null)}
          onSaveLocal={({ name, description }) => {
            const updateTree = (items: NormalizedFramework[]): NormalizedFramework[] =>
              items.map((i) =>
                i.id === editingEntity.id
                  ? { ...i, name, description }
                  : {
                      ...i,
                      themes: i.themes ? updateTree(i.themes) : i.themes,
                      subthemes: i.subthemes ? updateTree(i.subthemes) : i.subthemes,
                    }
              );
            setTree(updateTree(tree));
            setDirty(true);
          }}
        />
      )}

      {/* Add Pillar Modal */}
      {showAddPillar && (
        <AddPillarModal
          versionId={versionId}
          existing={tree}
          onClose={() => setShowAddPillar(false)}
          onAdd={(pillar) => {
            setTree([...tree, pillar]);
            setDirty(true);
            setShowAddPillar(false);
          }}
        />
      )}

      {/* Add Theme Modal */}
      {addThemeParent && (
        <AddThemeModal
          versionId={versionId}
          pillarId={addThemeParent.id}
          existing={addThemeParent.themes || []}
          pillarSortOrder={addThemeParent.sort_order}
          onClose={() => setAddThemeParent(null)}
          onAdd={(theme) => {
            const updated = tree.map((p) =>
              p.id === addThemeParent.id
                ? { ...p, themes: [...(p.themes || []), theme] }
                : p
            );
            setTree(updated);
            setDirty(true);
            setAddThemeParent(null);
          }}
        />
      )}

      {/* Add Subtheme Modal */}
      {addSubthemeParent && (
        <AddSubthemeModal
          versionId={versionId}
          themeId={addSubthemeParent.id}
          existing={addSubthemeParent.subthemes || []}
          pillarSortOrder={tree.find((p) =>
            p.themes?.some((t) => t.id === addSubthemeParent.id)
          )?.sort_order}
          themeSortOrder={addSubthemeParent.sort_order}
          onClose={() => setAddSubthemeParent(null)}
          onAdd={(sub) => {
            const update = (items: NormalizedFramework[]): NormalizedFramework[] =>
              items.map((i) =>
                i.id === addSubthemeParent.id
                  ? { ...i, subthemes: [...(i.subthemes || []), sub] }
                  : {
                      ...i,
                      themes: i.themes ? update(i.themes) : i.themes,
                      subthemes: i.subthemes ? update(i.subthemes) : i.subthemes,
                    }
              );
            setTree(update(tree));
            setDirty(true);
            setAddSubthemeParent(null);
          }}
        />
      )}
    </div>
  );
}

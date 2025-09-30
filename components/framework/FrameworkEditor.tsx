// components/framework/FrameworkEditor.tsx
"use client";

import React, { useState, useMemo, useCallback } from "react";
import {
  ChevronRight,
  ChevronDown,
  GripVertical,
  Pencil,
  Trash2,
  Plus,
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

import type { NormalizedFramework } from "@/lib/types/framework";
import {
  replaceFrameworkVersionItems,
  getFrameworkTree,
} from "@/lib/services/framework";
import AddPillarModal from "./AddPillarModal";
import AddThemeModal from "./AddThemeModal";
import AddSubthemeModal from "./AddSubthemeModal";

type Props = {
  versionId: string;
  initialTree: NormalizedFramework[];
};

export default function FrameworkEditor({ versionId, initialTree }: Props) {
  const [tree, setTree] = useState<NormalizedFramework[]>(initialTree);
  const [expanded, setExpanded] = useState<Set<string>>(
    new Set(tree.map((n) => n.id))
  );
  const [dirty, setDirty] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor));

  // ─────────────────────────────────────────────
  // Expand / Collapse
  // ─────────────────────────────────────────────
  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const copy = new Set(prev);
      if (copy.has(id)) copy.delete(id);
      else copy.add(id);
      return copy;
    });
  };

  const expandAll = () =>
    setExpanded(new Set(flattenTree(tree).map((n) => n.id)));
  const collapseAll = () => setExpanded(new Set());

  // ─────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────
  const flattenTree = (nodes: NormalizedFramework[]): NormalizedFramework[] => {
    let result: NormalizedFramework[] = [];
    for (const node of nodes) {
      result.push(node);
      if (node.themes) result = result.concat(flattenTree(node.themes));
      if (node.subthemes)
        result = result.concat(flattenTree(node.subthemes));
    }
    return result;
  };

  const markDirty = () => setDirty(true);

  // ─────────────────────────────────────────────
  // Actions
  // ─────────────────────────────────────────────
  const handleSave = async () => {
    await replaceFrameworkVersionItems(versionId, tree);
    const refreshed = await getFrameworkTree(versionId);
    setTree(refreshed);
    setDirty(false);
  };

  const handleDiscard = async () => {
    const refreshed = await getFrameworkTree(versionId);
    setTree(refreshed);
    setDirty(false);
  };

  const handleDelete = (id: string, type: "pillar" | "theme" | "subtheme") => {
    function remove(nodes: NormalizedFramework[]): NormalizedFramework[] {
      return nodes
        .filter((n) => n.id !== id)
        .map((n) => ({
          ...n,
          themes: n.themes ? remove(n.themes) : undefined,
          subthemes: n.subthemes ? remove(n.subthemes) : undefined,
        }));
    }
    setTree((prev) => remove(prev));
    markDirty();
  };

  const handleAddChild = (
    parentId: string,
    type: "pillar" | "theme" | "subtheme"
  ) => {
    // open the correct modal
    if (type === "pillar") {
      setShowPillarModal(true);
    }
    if (type === "theme") {
      setThemeParent(parentId);
      setShowThemeModal(true);
    }
    if (type === "subtheme") {
      setSubthemeParent(parentId);
      setShowSubthemeModal(true);
    }
  };

  // ─────────────────────────────────────────────
  // Drag & Drop
  // ─────────────────────────────────────────────
  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setTree((prev) => {
      const idxA = prev.findIndex((n) => n.id === active.id);
      const idxB = prev.findIndex((n) => n.id === over.id);
      if (idxA === -1 || idxB === -1) return prev;
      const newOrder = arrayMove(prev, idxA, idxB).map((n, i) => ({
        ...n,
        sort_order: i + 1,
      }));
      markDirty();
      return newOrder;
    });
  };

  // ─────────────────────────────────────────────
  // Modals
  // ─────────────────────────────────────────────
  const [showPillarModal, setShowPillarModal] = useState(false);
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [showSubthemeModal, setShowSubthemeModal] = useState(false);
  const [themeParent, setThemeParent] = useState<string | null>(null);
  const [subthemeParent, setSubthemeParent] = useState<string | null>(null);

  // ─────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────
  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-2">
          <button
            onClick={() => setShowPillarModal(true)}
            className="px-3 py-1 rounded bg-blue-600 text-white text-sm"
          >
            + Add Pillar
          </button>
          <button
            onClick={expandAll}
            className="px-2 py-1 text-sm border rounded"
          >
            Expand All
          </button>
          <button
            onClick={collapseAll}
            className="px-2 py-1 text-sm border rounded"
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
              className="px-3 py-1 rounded bg-gray-300 text-sm"
            >
              Discard
            </button>
          </div>
        )}
      </div>

      {/* Tree Table */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={tree.map((n) => n.id)}
          strategy={verticalListSortingStrategy}
        >
          <table className="w-full border-collapse">
            <thead>
              <tr className="text-left text-sm text-gray-600">
                <th className="w-[15%] px-2 py-1">Type / Ref</th>
                <th className="w-[55%] px-2 py-1">Name / Description</th>
                <th className="w-[10%] px-2 py-1">Sort</th>
                <th className="w-[20%] px-2 py-1">Actions</th>
              </tr>
            </thead>
            <tbody>
              {tree.map((node) => (
                <FrameworkRow
                  key={node.id}
                  node={node}
                  expanded={expanded}
                  toggleExpand={toggleExpand}
                  onDelete={handleDelete}
                  onAddChild={handleAddChild}
                />
              ))}
            </tbody>
          </table>
        </SortableContext>
      </DndContext>

      {/* Modals */}
      {showPillarModal && (
        <AddPillarModal
          onClose={() => setShowPillarModal(false)}
          onAdded={(pillars) => {
            setTree((prev) => [...prev, ...pillars]);
            markDirty();
          }}
        />
      )}
      {showThemeModal && themeParent && (
        <AddThemeModal
          parentId={themeParent}
          onClose={() => setShowThemeModal(false)}
          onAdded={(themes) => {
            setTree((prev) =>
              prev.map((p) =>
                p.id === themeParent
                  ? { ...p, themes: [...(p.themes ?? []), ...themes] }
                  : p
              )
            );
            markDirty();
          }}
        />
      )}
      {showSubthemeModal && subthemeParent && (
        <AddSubthemeModal
          parentId={subthemeParent}
          onClose={() => setShowSubthemeModal(false)}
          onAdded={(subs) => {
            setTree((prev) =>
              prev.map((p) => ({
                ...p,
                themes: p.themes?.map((t) =>
                  t.id === subthemeParent
                    ? { ...t, subthemes: [...(t.subthemes ?? []), ...subs] }
                    : t
                ),
              }))
            );
            markDirty();
          }}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Row Component
// ─────────────────────────────────────────────
function FrameworkRow({
  node,
  expanded,
  toggleExpand,
  onDelete,
  onAddChild,
}: {
  node: NormalizedFramework;
  expanded: Set<string>;
  toggleExpand: (id: string) => void;
  onDelete: (id: string, type: "pillar" | "theme" | "subtheme") => void;
  onAddChild: (id: string, type: "pillar" | "theme" | "subtheme") => void;
}) {
  const hasChildren =
    (node.type === "pillar" && node.themes && node.themes.length > 0) ||
    (node.type === "theme" && node.subthemes && node.subthemes.length > 0);

  return (
    <>
      <tr className="border-t">
        <td className="px-2 py-1 text-sm">
          <div className="flex items-center gap-1">
            {hasChildren && (
              <button onClick={() => toggleExpand(node.id)}>
                {expanded.has(node.id) ? (
                  <ChevronDown size={16} />
                ) : (
                  <ChevronRight size={16} />
                )}
              </button>
            )}
            <span className="font-mono text-xs">{node.ref_code}</span>
          </div>
        </td>
        <td className="px-2 py-1">
          <div className="text-sm font-medium">{node.name}</div>
          {node.description && (
            <div className="text-xs text-gray-500">{node.description}</div>
          )}
        </td>
        <td className="px-2 py-1 text-sm">{node.sort_order}</td>
        <td className="px-2 py-1 text-sm">
          <div className="flex gap-2">
            <button
              className="text-blue-600 hover:underline"
              onClick={() => onAddChild(node.id, node.type)}
            >
              <Plus size={14} />
            </button>
            <button
              className="text-gray-600 hover:underline"
              onClick={() => alert("TODO: edit")}
            >
              <Pencil size={14} />
            </button>
            <button
              className="text-red-600 hover:underline"
              onClick={() => onDelete(node.id, node.type)}
            >
              <Trash2 size={14} />
            </button>
          </div>
        </td>
      </tr>
      {expanded.has(node.id) &&
        node.type === "pillar" &&
        node.themes?.map((theme) => (
          <FrameworkRow
            key={theme.id}
            node={theme}
            expanded={expanded}
            toggleExpand={toggleExpand}
            onDelete={onDelete}
            onAddChild={onAddChild}
          />
        ))}
      {expanded.has(node.id) &&
        node.type === "theme" &&
        node.subthemes?.map((sub) => (
          <FrameworkRow
            key={sub.id}
            node={sub}
            expanded={expanded}
            toggleExpand={toggleExpand}
            onDelete={onDelete}
            onAddChild={onAddChild}
          />
        ))}
    </>
  );
}

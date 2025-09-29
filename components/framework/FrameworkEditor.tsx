"use client";

import React, { useMemo, useState, useCallback } from "react";
import {
  ChevronRight,
  ChevronDown,
  GripVertical,
  Pencil,
  Trash2,
  Plus,
  Ban,
} from "lucide-react";
import type { NormalizedFramework } from "@/lib/types/framework";
import AddPillarModal from "./AddPillarModal";

type Props = {
  tree: NormalizedFramework[];
  versionId: string;
  editMode?: boolean;
  onChanged?: () => Promise<void>;
};

function TypeBadge({ type }: { type: "pillar" | "theme" | "subtheme" }) {
  const styles: Record<typeof type, string> = {
    pillar:
      "bg-blue-50 text-blue-700 border border-blue-200 text-[12px] px-2 py-[2px] rounded-full",
    theme:
      "bg-green-50 text-green-700 border border-green-200 text-[12px] px-2 py-[2px] rounded-full",
    subtheme:
      "bg-purple-50 text-purple-700 border border-purple-200 text-[12px] px-2 py-[2px] rounded-full",
  };
  const label =
    type === "pillar" ? "Pillar" : type === "theme" ? "Theme" : "Subtheme";
  return <span className={styles[type]}>{label}</span>;
}

// Sort utility
function sortByOrder<T extends { sort_order?: number; name?: string }>(
  arr: T[]
) {
  return [...arr].sort((a, b) => {
    const A =
      typeof a.sort_order === "number" ? a.sort_order : Number.MAX_SAFE_INTEGER;
    const B =
      typeof b.sort_order === "number" ? b.sort_order : Number.MAX_SAFE_INTEGER;
    if (A !== B) return A - B;
    return String(a.name ?? "").localeCompare(String(b.name ?? ""));
  });
}

// Deduper
function uniqueById<T extends { id: string }>(arr: T[]) {
  const seen = new Set<string>();
  return arr.filter((it) => {
    if (seen.has(it.id)) return false;
    seen.add(it.id);
    return true;
  });
}

export default function FrameworkEditor({
  tree,
  versionId,
  editMode = true,
  onChanged,
}: Props) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [dirty, setDirty] = useState(false);
  const [localTree, setLocalTree] = useState<NormalizedFramework[]>(tree);
  const [showAddPillar, setShowAddPillar] = useState(false);

  // reset local tree when version changes
  React.useEffect(() => {
    setLocalTree(tree);
    setDirty(false);
    setExpanded({});
  }, [tree, versionId]);

  const pillars = useMemo(
    () => uniqueById(sortByOrder(localTree ?? [])),
    [localTree]
  );

  const expandAll = useCallback(() => {
    const all: Record<string, boolean> = {};
    const walk = (items: NormalizedFramework[]) => {
      for (const p of items) {
        all[p.id] = true;
        if (p.themes) walk(p.themes);
        if (p.subthemes) walk(p.subthemes);
        if (p.children) walk(p.children);
      }
    };
    walk(localTree);
    setExpanded(all);
  }, [localTree]);

  const collapseAll = useCallback(() => {
    setExpanded({});
  }, []);

  // 🔧 Save/discard handlers
  async function handleSave() {
    console.log("Saving changes (not wired yet):", localTree);
    setDirty(false);
    if (onChanged) await onChanged();
  }

  function handleDiscard() {
    setLocalTree(tree);
    setDirty(false);
  }

  // 🔧 Adapter for catalogue → NormalizedFramework
  function handleAddPillarsFromCatalogue(items: any[]) {
    const normalized: NormalizedFramework[] = items.map((p: any) => ({
      id: p.id,
      type: "pillar",
      name: p.name,
      description: p.description ?? "",
      color: p.color ?? null,
      icon: p.icon ?? null,
      themes: (p.themes ?? []).map((t: any) => ({
        id: t.id,
        type: "theme",
        name: t.name,
        description: t.description ?? "",
        color: t.color ?? null,
        icon: t.icon ?? null,
        subthemes: (t.subthemes ?? []).map((s: any) => ({
          id: s.id,
          type: "subtheme",
          name: s.name,
          description: s.description ?? "",
          color: s.color ?? null,
          icon: s.icon ?? null,
        })),
      })),
    }));

    setLocalTree([...localTree, ...normalized]);
    setDirty(true);
  }

  function handleCreateNewPillar(name: string, description?: string) {
    const newPillar: NormalizedFramework = {
      id: `temp-${Date.now()}`,
      type: "pillar",
      name,
      description: description ?? "",
      color: null,
      icon: null,
      themes: [],
      subthemes: [],
      children: [],
    };
    setLocalTree([...localTree, newPillar]);
    setDirty(true);
  }

  // 🔧 Render node (pillars → themes → subthemes)
  const renderNode = useCallback(
    (node: NormalizedFramework) => {
      const isExpanded = expanded[node.id] ?? false;
      const hasChildren =
        (node.themes && node.themes.length > 0) ||
        (node.subthemes && node.subthemes.length > 0) ||
        (node.children && node.children.length > 0);

      return (
        <div key={node.id} className="ml-4">
          <div className="flex items-center space-x-2 p-1 rounded hover:bg-gray-50">
            {hasChildren && (
              <button
                onClick={() =>
                  setExpanded((prev) => ({
                    ...prev,
                    [node.id]: !isExpanded,
                  }))
                }
                className="text-gray-500"
              >
                {isExpanded ? (
                  <ChevronDown size={16} />
                ) : (
                  <ChevronRight size={16} />
                )}
              </button>
            )}
            <GripVertical size={14} className="text-gray-400" />
            <TypeBadge type={node.type} />
            <span className="flex-1">{node.name}</span>
            {editMode && (
              <div className="flex space-x-1">
                <button
                  className="text-gray-500 hover:text-blue-600"
                  title="Edit"
                >
                  <Pencil size={14} />
                </button>
                <button
                  className="text-gray-500 hover:text-red-600"
                  title="Delete"
                >
                  <Trash2 size={14} />
                </button>
                {node.type !== "subtheme" && (
                  <button
                    className="text-gray-500 hover:text-green-600"
                    title="Add child"
                  >
                    <Plus size={14} />
                  </button>
                )}
              </div>
            )}
          </div>

          {isExpanded && (
            <div className="ml-4">
              {node.themes?.map((t) => renderNode(t))}
              {node.subthemes?.map((s) => renderNode(s))}
              {node.children?.map((c) => renderNode(c))}
            </div>
          )}
        </div>
      );
    },
    [expanded, editMode]
  );

  return (
    <div className="border rounded-md p-4">
      {/* Save / Discard controls */}
      {editMode && dirty && (
        <div className="flex space-x-2 mb-4">
          <button
            className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
            onClick={handleSave}
          >
            Save (not wired yet)
          </button>
          <button
            className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 text-sm"
            onClick={handleDiscard}
          >
            Discard
          </button>
        </div>
      )}

      {/* Toolbar */}
      {editMode && (
        <div className="flex space-x-2 mb-4">
          <button
            className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
            onClick={() => setShowAddPillar(true)}
          >
            + Add Pillar
          </button>
          <button
            className="px-3 py-1 bg-gray-100 rounded hover:bg-gray-200 text-sm"
            onClick={expandAll}
          >
            Expand all
          </button>
          <button
            className="px-3 py-1 bg-gray-100 rounded hover:bg-gray-200 text-sm"
            onClick={collapseAll}
          >
            Collapse all
          </button>
        </div>
      )}

      {/* Render pillars */}
      <div>{pillars.map((p) => renderNode(p))}</div>

      {/* Add Pillar Modal */}
      {showAddPillar && (
        <AddPillarModal
          versionId={versionId}
          existingPillarIds={localTree.map((n) => n.id)}
          onClose={() => setShowAddPillar(false)}
          onSubmit={(payload) => {
            if (payload.mode === "catalogue") {
              handleAddPillarsFromCatalogue(payload.items);
            } else {
              handleCreateNewPillar(payload.name, payload.description);
            }
            setShowAddPillar(false);
          }}
        />
      )}
    </div>
  );
}

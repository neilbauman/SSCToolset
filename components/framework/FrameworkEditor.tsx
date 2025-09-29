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
  editMode?: boolean; // ✅ optional now
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
  editMode = false,
  onChanged,
}: Props) {
  const [localTree, setLocalTree] = useState<NormalizedFramework[]>(tree);
  const [dirty, setDirty] = useState(false);
  const [showAddPillar, setShowAddPillar] = useState(false);

  // Reset local tree when props change
  React.useEffect(() => {
    setLocalTree(tree);
    setDirty(false);
  }, [tree, versionId]);

  // Save / Discard (not wired yet)
  async function handleSave() {
    console.log("Saving changes (not wired yet):", localTree);
    setDirty(false);
    if (onChanged) await onChanged();
  }

  function handleDiscard() {
    setLocalTree(tree);
    setDirty(false);
  }

  // Adding pillars (placeholder — just updates local state for now)
  function handleAddPillarsFromCatalogue(items: NormalizedFramework[]) {
    setLocalTree([...localTree, ...items]);
    setDirty(true);
  }

  function handleCreateNewPillar(name: string, description?: string) {
    const newPillar: NormalizedFramework = {
      id: `temp-${Date.now()}`,
      type: "pillar",
      name,
      description,
      children: [],
    };
    setLocalTree([...localTree, newPillar]);
    setDirty(true);
  }

  // UI: Tree rendering
  const renderNode = useCallback(
    (node: NormalizedFramework, depth = 0) => {
      const [open, setOpen] = useState(true);
      const children = node.children ?? [];

      return (
        <div key={node.id} style={{ marginLeft: depth * 16 }}>
          <div className="flex items-center space-x-2 p-1 rounded hover:bg-gray-50">
            {children.length > 0 && (
              <button onClick={() => setOpen(!open)} className="text-gray-500">
                {open ? (
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
          {open &&
            children.map((child) => renderNode(child, depth + 1))}
        </div>
      );
    },
    [editMode]
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

      {/* Add Pillar */}
      {editMode && (
        <div className="mb-4">
          <button
            className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
            onClick={() => setShowAddPillar(true)}
          >
            + Add Pillar
          </button>
        </div>
      )}

      {/* Tree */}
      <div>{sortByOrder(uniqueById(localTree)).map((n) => renderNode(n))}</div>

      {/* Modal */}
      {showAddPillar && (
        <AddPillarModal
          versionId={versionId}
          existingPillarIds={localTree.map((n) => n.id)}
          onClose={() => setShowAddPillar(false)}
          onSubmit={(payload) => {
            if (payload.mode === "catalogue") {
              // later: expand to include children themes/subthemes from Supabase
              const newItems = payload.items; // NormalizedFramework[]
              handleAddPillarsFromCatalogue(newItems);
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

"use client";

import { useState, useCallback } from "react";
import type { NormalizedFramework } from "@/lib/types/framework";
import AddPillarModal from "./AddPillarModal";
import AddThemeModal from "./AddThemeModal";
import AddSubthemeModal from "./AddSubthemeModal";

type Props = {
  tree: NormalizedFramework[];
  versionId: string;
  editMode: boolean;
  onChanged: () => void;
};

export default function FrameworkEditor({
  tree,
  versionId,
  editMode,
  onChanged,
}: Props) {
  const [localTree, setLocalTree] = useState<NormalizedFramework[]>(tree ?? []);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [dirty, setDirty] = useState(false);

  const [showAddPillar, setShowAddPillar] = useState(false);
  const [showAddThemeFor, setShowAddThemeFor] = useState<string | null>(null);
  const [showAddSubthemeFor, setShowAddSubthemeFor] = useState<string | null>(
    null
  );

  // ─────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────
  function toggleExpandAll(expand: boolean) {
    const all: Record<string, boolean> = {};
    function mark(node: NormalizedFramework) {
      all[node.id] = expand;
      node.themes?.forEach(mark);
      node.subthemes?.forEach(mark);
    }
    localTree.forEach(mark);
    setExpanded(all);
  }

  function computeRefCode(node: NormalizedFramework, idxPath: number[]): string {
    if (node.type === "pillar") return `P${idxPath[0] + 1}`;
    if (node.type === "theme")
      return `T${idxPath[1] + 1}.${idxPath[0] + 1}`;
    if (node.type === "subtheme")
      return `ST${idxPath[2] + 1}.${idxPath[1] + 1}.${idxPath[0] + 1}`;
    return "";
  }

  // ─────────────────────────────────────────────
  // Add Handlers
  // ─────────────────────────────────────────────
  function handleAddPillarsFromCatalogue(items: any[]) {
    const converted: NormalizedFramework[] = items.map((p, idx) => ({
      id: `temp-${Date.now()}-${idx}`,
      type: "pillar",
      name: p.name,
      description: p.description ?? "",
      color: null,
      icon: null,
      sort_order: p.sort_order ?? localTree.length + 1,
      ref_code: `P${localTree.length + 1}`,
      themes: [],
    }));
    setLocalTree([...localTree, ...converted]);
    setDirty(true);
  }

  function handleAddThemesFromCatalogue(parentId: string, items: any[]) {
    const updated = localTree.map((pillar) => {
      if (pillar.id !== parentId) return pillar;
      const newThemes: NormalizedFramework[] = items.map((t, idx) => ({
        id: `temp-${Date.now()}-${idx}`,
        type: "theme",
        name: t.name,
        description: t.description ?? "",
        color: null,
        icon: null,
        sort_order: t.sort_order ?? (pillar.themes?.length || 0) + 1,
        ref_code: `T${(pillar.themes?.length || 0) + 1}.${pillar.ref_code}`,
        subthemes: [],
      }));
      return { ...pillar, themes: [...(pillar.themes || []), ...newThemes] };
    });
    setLocalTree(updated);
    setDirty(true);
  }

  function handleAddSubthemesFromCatalogue(parentId: string, items: any[]) {
    const updated = localTree.map((pillar) => ({
      ...pillar,
      themes: pillar.themes?.map((theme) => {
        if (theme.id !== parentId) return theme;
        const newSubs: NormalizedFramework[] = items.map((s, idx) => ({
          id: `temp-${Date.now()}-${idx}`,
          type: "subtheme",
          name: s.name,
          description: s.description ?? "",
          color: null,
          icon: null,
          sort_order: s.sort_order ?? (theme.subthemes?.length || 0) + 1,
          ref_code: `ST${(theme.subthemes?.length || 0) + 1}.${theme.ref_code}`,
        }));
        return { ...theme, subthemes: [...(theme.subthemes || []), ...newSubs] };
      }),
    }));
    setLocalTree(updated);
    setDirty(true);
  }

  // ─────────────────────────────────────────────
  // Render Helpers
  // ─────────────────────────────────────────────
  const renderNode = useCallback(
    (node: NormalizedFramework, idxPath: number[] = []): JSX.Element => {
      const isExpanded = expanded[node.id] ?? false;
      const hasChildren =
        (node.themes && node.themes.length > 0) ||
        (node.subthemes && node.subthemes.length > 0);

      return (
        <div key={node.id} className="ml-4 border-l pl-4">
          <div className="flex items-center justify-between py-1">
            <div className="flex items-center space-x-2">
              {hasChildren && (
                <button
                  className="text-xs text-gray-500"
                  onClick={() =>
                    setExpanded({ ...expanded, [node.id]: !isExpanded })
                  }
                >
                  {isExpanded ? "−" : "+"}
                </button>
              )}
              <span className="font-medium">{node.name}</span>
              {node.description && (
                <span className="text-xs text-gray-500 ml-2">
                  {node.description}
                </span>
              )}
            </div>
            {editMode && (
              <div className="flex space-x-2">
                {node.type === "pillar" && (
                  <button
                    className="text-xs text-blue-600"
                    onClick={() => setShowAddThemeFor(node.id)}
                  >
                    + Theme
                  </button>
                )}
                {node.type === "theme" && (
                  <button
                    className="text-xs text-green-600"
                    onClick={() => setShowAddSubthemeFor(node.id)}
                  >
                    + Subtheme
                  </button>
                )}
              </div>
            )}
          </div>
          {isExpanded && node.themes?.map((t, idx) => renderNode(t, [idx, ...idxPath]))}
          {isExpanded &&
            node.subthemes?.map((s, idx) => renderNode(s, [idx, ...idxPath]))}
        </div>
      );
    },
    [expanded, editMode, localTree]
  );

  // ─────────────────────────────────────────────
  // Save Handler
  // ─────────────────────────────────────────────
  async function handleSave() {
    console.log("TODO: persist localTree to Supabase", localTree);
    setDirty(false);
    onChanged();
  }

  return (
    <div>
      {/* Controls */}
      {editMode && (
        <div className="flex justify-between mb-4">
          <div className="space-x-2">
            <button
              onClick={() => toggleExpandAll(true)}
              className="px-2 py-1 text-xs bg-gray-200 rounded"
            >
              Expand All
            </button>
            <button
              onClick={() => toggleExpandAll(false)}
              className="px-2 py-1 text-xs bg-gray-200 rounded"
            >
              Collapse All
            </button>
          </div>
          <div className="space-x-2">
            <button
              onClick={handleSave}
              disabled={!dirty}
              className={`px-3 py-1 text-xs rounded ${
                dirty ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-500"
              }`}
            >
              Save
            </button>
            <button
              onClick={() => {
                setLocalTree(tree);
                setDirty(false);
              }}
              className="px-3 py-1 text-xs bg-gray-200 rounded"
            >
              Cancel
            </button>
            <button
              onClick={() => setShowAddPillar(true)}
              className="px-3 py-1 text-xs bg-green-600 text-white rounded"
            >
              + Pillar
            </button>
          </div>
        </div>
      )}

      {/* Tree */}
      <div>{localTree.map((p, idx) => renderNode(p, [idx]))}</div>

      {/* Modals */}
      {showAddPillar && (
        <AddPillarModal
          versionId={versionId}
          existingPillarIds={localTree.map((n) => n.id)}
          isPersisted={true}
          onClose={() => setShowAddPillar(false)}
          onSubmit={(payload) => {
            if (payload.mode === "catalogue") {
              handleAddPillarsFromCatalogue(payload.items);
            } else {
              handleAddPillarsFromCatalogue([
                { id: `temp-${Date.now()}`, name: payload.name, description: payload.description },
              ]);
            }
          }}
        />
      )}

      {showAddThemeFor && (
        <AddThemeModal
          versionId={versionId}
          parentPillarId={showAddThemeFor}
          existingThemeIds={
            localTree.find((p) => p.id === showAddThemeFor)?.themes?.map((t) => t.id) || []
          }
          existingSubthemeIds={[]}
          isPersisted={true}
          onClose={() => setShowAddThemeFor(null)}
          onSubmit={(payload) => {
            if (payload.mode === "catalogue") {
              handleAddThemesFromCatalogue(showAddThemeFor, payload.items);
            } else {
              handleAddThemesFromCatalogue(showAddThemeFor, [
                { id: `temp-${Date.now()}`, name: payload.name, description: payload.description },
              ]);
            }
          }}
        />
      )}

      {showAddSubthemeFor && (
        <AddSubthemeModal
          versionId={versionId}
          parentThemeId={showAddSubthemeFor}
          existingSubthemeIds={
            localTree
              .flatMap((p) => p.themes || [])
              .find((t) => t.id === showAddSubthemeFor)?.subthemes?.map((s) => s.id) || []
          }
          isPersisted={true}
          onClose={() => setShowAddSubthemeFor(null)}
          onSubmit={(payload) => {
            if (payload.mode === "catalogue") {
              handleAddSubthemesFromCatalogue(showAddSubthemeFor, payload.items);
            } else {
              handleAddSubthemesFromCatalogue(showAddSubthemeFor, [
                { id: `temp-${Date.now()}`, name: payload.name, description: payload.description },
              ]);
            }
          }}
        />
      )}
    </div>
  );
}

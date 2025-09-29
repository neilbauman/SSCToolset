"use client";

import React, { useMemo, useState, useCallback } from "react";
import {
  ChevronRight,
  ChevronDown,
  GripVertical,
  Pencil,
  Trash2,
  Plus,
} from "lucide-react";
import type { NormalizedFramework } from "@/lib/types/framework";
import AddPillarModal from "./AddPillarModal";
import AddThemeModal from "./AddThemeModal";
import AddSubthemeModal from "./AddSubthemeModal";
import {
  createPillar,
  createTheme,
  createSubtheme,
  replaceFrameworkVersionItems,
} from "@/lib/services/framework";

type Props = {
  tree: NormalizedFramework[];
  versionId: string;
  editMode?: boolean;
  onChanged?: () => Promise<void>;
};

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
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

function uniqueById<T extends { id: string }>(arr: T[]) {
  const seen = new Set<string>();
  return arr.filter((it) => {
    if (seen.has(it.id)) return false;
    seen.add(it.id);
    return true;
  });
}

function buildDisplayTree(pillars: NormalizedFramework[]): NormalizedFramework[] {
  return pillars
    .slice()
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.name.localeCompare(b.name))
    .map((pillar, pIndex) => {
      const pillarOrder = pIndex + 1;
      const pillarRef = `P${pillarOrder}`;
      return {
        ...pillar,
        sort_order: pillarOrder,
        ref_code: pillarRef,
        themes: (pillar.themes ?? [])
          .slice()
          .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.name.localeCompare(b.name))
          .map((theme, tIndex) => {
            const themeOrder = tIndex + 1;
            const themeRef = `T${pillarOrder}.${themeOrder}`;
            return {
              ...theme,
              sort_order: themeOrder,
              ref_code: themeRef,
              subthemes: (theme.subthemes ?? [])
                .slice()
                .sort(
                  (a, b) =>
                    (a.sort_order ?? 0) - (b.sort_order ?? 0) ||
                    a.name.localeCompare(b.name)
                )
                .map((sub, sIndex) => {
                  const subOrder = sIndex + 1;
                  const subRef = `ST${pillarOrder}.${themeOrder}.${subOrder}`;
                  return {
                    ...sub,
                    sort_order: subOrder,
                    ref_code: subRef,
                  };
                }),
            };
          }),
      };
    });
}

function isTemp(id: string) {
  return id.startsWith("temp-");
}

function isUUID(id: string) {
  return /^[0-9a-fA-F-]{36}$/.test(id);
}

// ─────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────
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
  const [showAddThemeFor, setShowAddThemeFor] = useState<string | null>(null);
  const [showAddSubthemeFor, setShowAddSubthemeFor] = useState<string | null>(
    null
  );

  React.useEffect(() => {
    setLocalTree(tree);
    setDirty(false);
    setExpanded({});
  }, [tree, versionId]);

  const displayTree = useMemo(() => {
    const deduped = uniqueById(localTree ?? []);
    return buildDisplayTree(deduped);
  }, [localTree]);

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

  // ─────────────────────────────────────────────
  // SAVE staged tree → persist catalogue (if needed) + version_items
  // ─────────────────────────────────────────────
  async function handleSave() {
    try {
      const resolvedPillars: NormalizedFramework[] = [];

      // 1) Walk pillars
      for (let pIdx = 0; pIdx < localTree.length; pIdx++) {
        let pillar = localTree[pIdx];
        let pillarId = pillar.id;

        // If temp pillar, create in catalogue
        if (isTemp(pillarId)) {
          const created = await createPillar(pillar.name, pillar.description ?? "");
          pillarId = created.id;
        }

        // Rebuild themes
        const resolvedThemes: NormalizedFramework[] = [];
        for (let tIdx = 0; tIdx < (pillar.themes ?? []).length; tIdx++) {
          let theme = pillar.themes![tIdx];
          let themeId = theme.id;

          // If temp theme, create in catalogue
          if (isTemp(themeId)) {
            const created = await createTheme(pillarId, theme.name, theme.description ?? "");
            themeId = created.id;
          }

          // Rebuild subthemes
          const resolvedSubs: NormalizedFramework[] = [];
          for (let sIdx = 0; sIdx < (theme.subthemes ?? []).length; sIdx++) {
            let sub = theme.subthemes![sIdx];
            let subId = sub.id;

            if (isTemp(subId)) {
              const created = await createSubtheme(themeId, sub.name, sub.description ?? "");
              subId = created.id;
            }

            resolvedSubs.push({
              ...sub,
              id: subId,
            });
          }

          resolvedThemes.push({
            ...theme,
            id: themeId,
            subthemes: resolvedSubs,
          });
        }

        resolvedPillars.push({
          ...pillar,
          id: pillarId,
          themes: resolvedThemes,
        });
      }

      // 2) Build version_items
      const items: {
        version_id: string;
        pillar_id: string | null;
        theme_id: string | null;
        subtheme_id: string | null;
        sort_order: number;
        ref_code: string;
      }[] = [];

      resolvedPillars.forEach((p, pIdx) => {
        const pOrder = pIdx + 1;
        const pRef = `P${pOrder}`;

        items.push({
          version_id: versionId,
          pillar_id: p.id,
          theme_id: null,
          subtheme_id: null,
          sort_order: pOrder,
          ref_code: pRef,
        });

        (p.themes ?? []).forEach((t, tIdx) => {
          const tOrder = tIdx + 1;
          const tRef = `P${pOrder}.T${tOrder}`;

          items.push({
            version_id: versionId,
            pillar_id: p.id,
            theme_id: t.id,
            subtheme_id: null,
            sort_order: tOrder,
            ref_code: tRef,
          });

          (t.subthemes ?? []).forEach((s, sIdx) => {
            const sOrder = sIdx + 1;
            const sRef = `P${pOrder}.T${tOrder}.S${sOrder}`;

            items.push({
              version_id: versionId,
              pillar_id: p.id,
              theme_id: t.id,
              subtheme_id: s.id,
              sort_order: sOrder,
              ref_code: sRef,
            });
          });
        });
      });

      // 3) Replace items in DB
      await replaceFrameworkVersionItems(versionId, items);

      setDirty(false);
      if (onChanged) await onChanged();
    } catch (err: any) {
      console.error("Save failed:", err.message);
      alert(`Save failed: ${err.message}`);
    }
  }

  // ─────────────────────────────────────────────
  // Local handlers
  // ─────────────────────────────────────────────
  function handleDiscard() {
    setLocalTree(tree);
    setDirty(false);
  }

  function handleAddThemesToPillar(pillarId: string, themes: any[]) {
    const updated = localTree.map((p) => {
      if (p.id !== pillarId) return p;
      return { ...p, themes: [...(p.themes ?? []), ...themes] };
    });
    setLocalTree(updated);
    setDirty(true);
  }

  function handleAddSubthemesToTheme(themeId: string, subthemes: any[]) {
    const updated = localTree.map((p) => ({
      ...p,
      themes: (p.themes ?? []).map((t) => {
        if (t.id !== themeId) return t;
        return { ...t, subthemes: [...(t.subthemes ?? []), ...subthemes] };
      }),
    }));
    setLocalTree(updated);
    setDirty(true);
  }

  // ─────────────────────────────────────────────
  // Render Node
  // ─────────────────────────────────────────────
  const renderNode = useCallback(
    (node: NormalizedFramework): React.ReactNode => {
      const isExpanded = expanded[node.id] ?? false;
      const hasChildren =
        (node.themes && node.themes.length > 0) ||
        (node.subthemes && node.subthemes.length > 0);

      return (
        <>
          <tr key={node.id} className="border-t">
            <td className="px-2 py-1 w-1/6">
              <div className="flex items-center space-x-2">
                {hasChildren && (
                  <button
                    onClick={() =>
                      setExpanded((prev) => ({ ...prev, [node.id]: !isExpanded }))
                    }
                    className="text-gray-500"
                  >
                    {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </button>
                )}
                <GripVertical size={14} className="text-gray-400" />
                <TypeBadge type={node.type} />
                <span className="text-xs text-gray-500">{node.ref_code}</span>
              </div>
            </td>
            <td className="px-2 py-1 w-1/2">
              <div className="font-medium">{node.name}</div>
              {node.description && (
                <div className="text-xs text-gray-500">{node.description}</div>
              )}
            </td>
            <td className="px-2 py-1 w-1/6">{node.sort_order ?? "-"}</td>
            <td className="px-2 py-1 w-1/6 text-right">
              {editMode && (
                <div className="flex justify-end space-x-2">
                  <button className="text-gray-500 hover:text-blue-600" title="Edit">
                    <Pencil size={14} />
                  </button>
                  <button className="text-gray-500 hover:text-red-600" title="Delete">
                    <Trash2 size={14} />
                  </button>
                  {node.type !== "subtheme" && (
                    <button
                      className="text-gray-500 hover:text-green-600"
                      title="Add child"
                      onClick={() => {
                        if (node.type === "pillar") setShowAddThemeFor(node.id);
                        if (node.type === "theme") setShowAddSubthemeFor(node.id);
                      }}
                    >
                      <Plus size={14} />
                    </button>
                  )}
                </div>
              )}
            </td>
          </tr>
          {isExpanded && (
            <>
              {node.themes?.map((t) => renderNode(t))}
              {node.subthemes?.map((s) => renderNode(s))}
            </>
          )}
        </>
      );
    },
    [expanded, editMode]
  );

  // ─────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────
  return (
    <div className="border rounded-md p-4">
      {editMode && dirty && (
        <div className="flex space-x-2 mb-4">
          <button
            className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
            onClick={handleSave}
          >
            Save
          </button>
          <button
            className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 text-sm"
            onClick={handleDiscard}
          >
            Discard
          </button>
        </div>
      )}

      {editMode && (
        <div className="flex justify-between items-center mb-2">
          <div className="flex space-x-2">
            <button
              className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
              onClick={() => setShowAddPillar(true)}
            >
              + Add Pillar
            </button>
          </div>
          <div className="flex space-x-2">
            <button
              className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 text-sm"
              onClick={expandAll}
            >
              Expand All
            </button>
            <button
              className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 text-sm"
              onClick={collapseAll}
            >
              Collapse All
            </button>
          </div>
        </div>
      )}

      <table className="w-full text-sm border border-gray-200 rounded-md">
        <thead className="bg-gray-50 text-gray-700">
          <tr>
            <th className="px-2 py-1 text-left w-1/6">Type / Ref Code</th>
            <th className="px-2 py-1 text-left w-1/2">Name / Description</th>
            <th className="px-2 py-1 text-left w-1/6">Sort Order</th>
            <th className="px-2 py-1 text-right w-1/6">Actions</th>
          </tr>
        </thead>
        <tbody>{displayTree.map((p) => renderNode(p))}</tbody>
      </table>

      {showAddPillar && (
        <AddPillarModal
          versionId={versionId}
          existingPillarIds={localTree.map((n) => n.id)}
          isPersisted
          onClose={() => setShowAddPillar(false)}
          onSubmit={(payload) => {
            if (payload.mode === "catalogue") {
              const normalized = payload.items.map((p) => ({
                id: p.id,
                type: "pillar" as const,
                name: p.name,
                description: p.description ?? "",
                color: null,
                icon: null,
                themes: (p.themes ?? []).map((t) => ({
                  id: t.id,
                  type: "theme" as const,
                  name: t.name,
                  description: t.description ?? "",
                  color: null,
                  icon: null,
                  subthemes: (t.subthemes ?? []).map((s) => ({
                    id: s.id,
                    type: "subtheme" as const,
                    name: s.name,
                    description: s.description ?? "",
                    color: null,
                    icon: null,
                  })),
                })),
                subthemes: [],
              }));
              setLocalTree([...localTree, ...normalized]);
            } else {
              setLocalTree([
                ...localTree,
                {
                  id: `temp-${Date.now()}`,
                  type: "pillar",
                  name: payload.name,
                  description: payload.description,
                  color: null,
                  icon: null,
                  themes: [],
                  subthemes: [],
                },
              ]);
            }
            setDirty(true);
            setShowAddPillar(false);
          }}
        />
      )}

      {showAddThemeFor && (
        <AddThemeModal
          versionId={versionId}
          parentPillarId={showAddThemeFor}
          existingThemeIds={
            localTree.find((p) => p.id === showAddThemeFor)?.themes?.map((t) => t.id) ?? []
          }
          existingSubthemeIds={
            localTree
              .find((p) => p.id === showAddThemeFor)
              ?.themes?.flatMap((t) => t.subthemes?.map((s) => s.id) ?? []) ?? []
          }
          isPersisted
          onClose={() => setShowAddThemeFor(null)}
          onSubmit={(payload) => {
            if (payload.mode === "catalogue") {
              handleAddThemesToPillar(showAddThemeFor, payload.items);
            } else {
              handleAddThemesToPillar(showAddThemeFor, [
                {
                  id: `temp-${Date.now()}`,
                  type: "theme",
                  name: payload.name,
                  description: payload.description,
                  color: null,
                  icon: null,
                  subthemes: [],
                },
              ]);
            }
            setShowAddThemeFor(null);
          }}
        />
      )}

      {showAddSubthemeFor && (
        <AddSubthemeModal
          versionId={versionId}
          parentThemeId={showAddSubthemeFor}
          existingSubthemeIds={
            localTree
              .flatMap((p) => p.themes ?? [])
              .find((t) => t.id === show

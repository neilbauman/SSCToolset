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

function buildDisplayTree(pillars: NormalizedFramework[]): NormalizedFramework[] {
  return pillars
    .map((pillar, pIndex) => {
      const pillarRef = `P${pIndex + 1}`;
      return {
        ...pillar,
        sort_order: pIndex + 1,
        ref_code: pillarRef,
        themes: (pillar.themes ?? []).map((theme, tIndex) => {
          const themeRef = `P${pIndex + 1}.T${tIndex + 1}`;
          return {
            ...theme,
            sort_order: tIndex + 1,
            ref_code: themeRef,
            subthemes: (theme.subthemes ?? []).map((sub, sIndex) => {
              const subRef = `P${pIndex + 1}.T${tIndex + 1}.S${sIndex + 1}`;
              return { ...sub, sort_order: sIndex + 1, ref_code: subRef };
            }),
          };
        }),
      };
    });
}

function isTemp(id: string) {
  return id.startsWith("temp-");
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

  const displayTree = useMemo(
    () => buildDisplayTree(localTree ?? []),
    [localTree]
  );

  // ─────────────────────────────────────────────
  // SAVE: create catalogue entries for temp IDs + replace items
  // ─────────────────────────────────────────────
  async function handleSave() {
    try {
      const resolvedPillars: NormalizedFramework[] = [];

      for (let pIdx = 0; pIdx < localTree.length; pIdx++) {
        let pillar = localTree[pIdx];
        let pillarId = pillar.id;
        if (isTemp(pillarId)) {
          const created = await createPillar(pillar.name, pillar.description ?? "");
          pillarId = created.id;
        }

        const resolvedThemes: NormalizedFramework[] = [];
        for (let tIdx = 0; tIdx < (pillar.themes ?? []).length; tIdx++) {
          let theme = pillar.themes![tIdx];
          let themeId = theme.id;
          if (isTemp(themeId)) {
            const created = await createTheme(pillarId, theme.name, theme.description ?? "");
            themeId = created.id;
          }

          const resolvedSubs: NormalizedFramework[] = [];
          for (let sIdx = 0; sIdx < (theme.subthemes ?? []).length; sIdx++) {
            let sub = theme.subthemes![sIdx];
            let subId = sub.id;
            if (isTemp(subId)) {
              const created = await createSubtheme(themeId, sub.name, sub.description ?? "");
              subId = created.id;
            }
            resolvedSubs.push({ ...sub, id: subId });
          }

          resolvedThemes.push({ ...theme, id: themeId, subthemes: resolvedSubs });
        }

        resolvedPillars.push({ ...pillar, id: pillarId, themes: resolvedThemes });
      }

      // Flatten for framework_version_items
      const items: {
        version_id: string;
        pillar_id: string | null;
        theme_id: string | null;
        subtheme_id: string | null;
        sort_order: number;
        ref_code: string;
      }[] = [];

      resolvedPillars.forEach((p, pIdx) => {
        const pRef = `P${pIdx + 1}`;
        items.push({
          version_id: versionId,
          pillar_id: p.id,
          theme_id: null,
          subtheme_id: null,
          sort_order: pIdx + 1,
          ref_code: pRef,
        });

        (p.themes ?? []).forEach((t, tIdx) => {
          const tRef = `P${pIdx + 1}.T${tIdx + 1}`;
          items.push({
            version_id: versionId,
            pillar_id: p.id,
            theme_id: t.id,
            subtheme_id: null,
            sort_order: tIdx + 1,
            ref_code: tRef,
          });

          (t.subthemes ?? []).forEach((s, sIdx) => {
            const sRef = `P${pIdx + 1}.T${tIdx + 1}.S${sIdx + 1}`;
            items.push({
              version_id: versionId,
              pillar_id: p.id,
              theme_id: t.id,
              subtheme_id: s.id,
              sort_order: sIdx + 1,
              ref_code: sRef,
            });
          });
        });
      });

      await replaceFrameworkVersionItems(versionId, items);
      setDirty(false);
      if (onChanged) await onChanged();
    } catch (err: any) {
      console.error("Save failed:", err.message);
      alert(`Save failed: ${err.message}`);
    }
  }

  function handleDiscard() {
    setLocalTree(tree);
    setDirty(false);
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

  return (
    <div className="border rounded-md p-4">
      {/* Save/Discard */}
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

      {/* Table */}
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

      {/* Modals (same wiring as before, omitted for brevity) */}
      {showAddPillar && (
        <AddPillarModal
          versionId={versionId}
          existingPillarIds={localTree.map((n) => n.id)}
          isPersisted
          onClose={() => setShowAddPillar(false)}
          onSubmit={(payload) => {
            // same logic as before to add pillar
            setDirty(true);
            setShowAddPillar(false);
          }}
        />
      )}
    </div>
  );
}

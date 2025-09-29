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

// ───────────────────────────────────────────────────────────────────────────────
// Props
// PrimaryFrameworkClient should pass the already-fetched tree (from RPC/API)
// and the versionId. onChanged is called after a mutation to refresh upstream.
// ───────────────────────────────────────────────────────────────────────────────
type Props = {
  tree: NormalizedFramework[];
  versionId: string;
  onChanged?: () => Promise<void>;
};

// Small badge component for Type column
function TypeBadge({ type }: { type: "pillar" | "theme" | "subtheme" }) {
  const styles: Record<typeof type, string> = {
    pillar:
      "bg-blue-50 text-blue-700 border border-blue-200 text-[12px] px-2 py-[2px] rounded-full",
    theme:
      "bg-green-50 text-green-700 border border-green-200 text-[12px] px-2 py-[2px] rounded-full",
    subtheme:
      "bg-purple-50 text-purple-700 border border-purple-200 text-[12px] px-2 py-[2px] rounded-full",
  };
  const label = type === "pillar" ? "Pillar" : type === "theme" ? "Theme" : "Subtheme";
  return <span className={styles[type]}>{label}</span>;
}

// Utility: stable sort (ASC) with graceful fallback
function sortByOrder<T extends { sort_order?: number; name?: string }>(arr: T[]) {
  return [...arr].sort((a, b) => {
    const A = typeof a.sort_order === "number" ? a.sort_order : Number.MAX_SAFE_INTEGER;
    const B = typeof b.sort_order === "number" ? b.sort_order : Number.MAX_SAFE_INTEGER;
    if (A !== B) return A - B;
    const an = (a as any).name ?? "";
    const bn = (b as any).name ?? "";
    return String(an).localeCompare(String(bn));
  });
}

// Utility: dedupe by id
function uniqueById<T extends { id: string }>(arr: T[]) {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const it of arr) {
    if (!seen.has(it.id)) {
      seen.add(it.id);
      out.push(it);
    }
  }
  return out;
}

export default function FrameworkEditor({ tree, versionId, onChanged }: Props) {
  // Collapsed by default (requested)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [editMode, setEditMode] = useState<boolean>(true);

  // Defensive: remove accidental pillar duplicates from input
  const pillars = useMemo(
    () => uniqueById(sortByOrder(tree ?? [])),
    [tree]
  );

  const expandAll = useCallback(() => {
    const all: Record<string, boolean> = {};
    const walk = (items: NormalizedFramework[]) => {
      for (const p of items) {
        all[p.id] = true;
        if (p.themes) {
          for (const t of p.themes) {
            all[t.id] = true;
            if (t.subthemes) {
              for (const s of t.subthemes) {
                all[s.id] = true;
              }
            }
          }
        }
      }
    };
    walk(pillars);
    setExpanded(all);
  }, [pillars]);

  const collapseAll = useCallback(() => setExpanded({}), []);

  const toggle = (id: string) =>
    setExpanded((e) => ({ ...e, [id]: !e[id] }));

  // Compute ref codes strictly by depth + sibling index (1-based)
  const refCode = (
    level: 0 | 1 | 2,
    pIndex: number,
    tIndex?: number,
    sIndex?: number
  ) => {
    if (level === 0) return `P${pIndex}`;
    if (level === 1) return `T${pIndex}.${tIndex ?? 1}`;
    return `ST${pIndex}.${tIndex ?? 1}.${sIndex ?? 1}`;
  };

  // Sort-order display (simple human index per level)
  const indexLabel = (level: 0 | 1 | 2, pI: number, tI?: number, sI?: number) => {
    if (level === 0) return String(pI);
    if (level === 1) return String(tI ?? 1);
    return String(sI ?? 1);
  };

  // Row renderer
  const Row = ({
    item,
    level,
    pIndex,
    tIndex,
    sIndex,
  }: {
    item: NormalizedFramework;
    level: 0 | 1 | 2;
    pIndex: number;
    tIndex?: number;
    sIndex?: number;
  }) => {
    // Determine type by depth (prevents “everything is a Pillar”)
    const type: "pillar" | "theme" | "subtheme" =
      level === 0 ? "pillar" : level === 1 ? "theme" : "subtheme";

    const padding = 16 + level * 22; // subtle indent per level
    const hasChildren =
      (type === "pillar" && item.themes && item.themes.length > 0) ||
      (type === "theme" && item.subthemes && item.subthemes.length > 0);

    const isOpen = !!expanded[item.id];
    const code = refCode(level, pIndex, tIndex, sIndex);
    const order = indexLabel(level, pIndex, tIndex, sIndex);

    return (
      <tr className="border-b last:border-b-0">
        {/* Type / Ref Code */}
        <td className="py-2 pr-2 align-top" style={{ width: "28%" }}>
          <div className="flex items-start">
            {/* caret */}
            <button
              aria-label={isOpen ? "Collapse" : "Expand"}
              className="mt-[2px] mr-2 text-gray-500"
              onClick={() => (hasChildren ? toggle(item.id) : null)}
            >
              {hasChildren ? (
                isOpen ? (
                  <ChevronDown size={16} />
                ) : (
                  <ChevronRight size={16} />
                )
              ) : (
                <span className="inline-block w-4" />
              )}
            </button>

            {/* disabled drag handle (placeholder only) */}
            <span className="mr-2 text-gray-300 cursor-not-allowed">
              <GripVertical size={16} />
            </span>

            <div className="flex items-center space-x-2">
              <TypeBadge type={type} />
              <span className="text-xs text-gray-500">{code}</span>
            </div>
          </div>
        </td>

        {/* Name / Description */}
        <td className="py-2 align-top" style={{ width: "52%" }}>
          <div style={{ paddingLeft: padding }}>
            <div className="font-medium text-gray-900">{item.name}</div>
            {item.description && (
              <div className="text-sm text-gray-500">{item.description}</div>
            )}
          </div>
        </td>

        {/* Sort Order (centered) */}
        <td className="py-2 align-top text-center text-gray-700" style={{ width: "8%" }}>
          {order}
        </td>

        {/* Actions (always present column; icons only in edit mode) */}
        <td className="py-2 align-top" style={{ width: "12%" }}>
          <div className="flex items-center justify-end space-x-3 pr-1">
            {editMode ? (
              <>
                {/* edit (opens modal elsewhere – wiring later) */}
                <button
                  aria-label="Edit"
                  className="text-gray-500 hover:text-gray-700"
                  onClick={() => {
                    /* open edit modal – to be wired in Phase 2 */
                  }}
                >
                  <Pencil size={16} />
                </button>

                {/* delete (to be wired; respect has-children rule) */}
                <button
                  aria-label="Delete"
                  className="text-gray-500 hover:text-red-600"
                  onClick={() => {
                    /* open confirm – to be wired in Phase 2 */
                  }}
                >
                  <Trash2 size={16} />
                </button>

                {/* add child (Theme or Subtheme depending on depth) */}
                {type !== "subtheme" && (
                  <button
                    aria-label="Add child"
                    className="text-gray-500 hover:text-gray-700"
                    onClick={() => {
                      /* open add modal – to be wired in Phase 2 */
                    }}
                  >
                    <Plus size={16} />
                  </button>
                )}
              </>
            ) : (
              <span className="text-gray-300">
                <Ban size={16} />
              </span>
            )}
          </div>
        </td>
      </tr>
    );
  };

  // Render the full table body with correct indexing
  const Rows = () => {
    const pSorted = sortByOrder(pillars);
    return (
      <>
        {pSorted.map((p, pIdx) => {
          const pillarIndex = pIdx + 1;
          const pRow = (
            <Row key={p.id} item={p} level={0} pIndex={pillarIndex} />
          );

          const tOpen = expanded[p.id];
          const themes = sortByOrder(p.themes ?? []);
          const tRows =
            tOpen &&
            themes.map((t, tIdx) => {
              const themeIndex = tIdx + 1;
              const tRow = (
                <Row
                  key={t.id}
                  item={t}
                  level={1}
                  pIndex={pillarIndex}
                  tIndex={themeIndex}
                />
              );
              const sOpen = expanded[t.id];
              const subs = sortByOrder(t.subthemes ?? []);
              const sRows =
                sOpen &&
                subs.map((s, sIdx) => (
                  <Row
                    key={s.id}
                    item={s}
                    level={2}
                    pIndex={pillarIndex}
                    tIndex={themeIndex}
                    sIndex={sIdx + 1}
                  />
                ));
              return (
                <React.Fragment key={`${t.id}-frag`}>
                  {tRow}
                  {sRows}
                </React.Fragment>
              );
            });

          return (
            <React.Fragment key={`${p.id}-group`}>
              {pRow}
              {tRows}
            </React.Fragment>
          );
        })}
      </>
    );
  };

  return (
    <div className="w-full">
      {/* header row: collapse / expand + Add Pillar (left); edit toggle on the right */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-4">
          <button
            className="text-sm text-gray-600 hover:text-gray-800"
            onClick={collapseAll}
          >
            Collapse all
          </button>
          <button
            className="text-sm text-gray-600 hover:text-gray-800"
            onClick={expandAll}
          >
            Expand all
          </button>
          <button
            className="ml-2 inline-flex items-center rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
            onClick={() => {
              /* open Add Pillar modal (From Catalogue / Create New) – wired in Phase 2 */
            }}
          >
            <Plus size={16} className="mr-1" />
            Add Pillar
          </button>
        </div>

        <div className="text-sm text-gray-500">
          {editMode ? (
            <button
              className="hover:text-gray-700"
              onClick={() => setEditMode(false)}
            >
              Exit edit mode
            </button>
          ) : (
            <button
              className="hover:text-gray-700"
              onClick={() => setEditMode(true)}
            >
              Enter edit mode
            </button>
          )}
        </div>
      </div>

      {/* table */}
      <div className="overflow-x-auto rounded-md border border-gray-200">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-700">
            <tr>
              <th className="py-2 px-3 font-medium" style={{ width: "28%" }}>
                Type / Ref Code
              </th>
              <th className="py-2 px-3 font-medium" style={{ width: "52%" }}>
                Name / Description
              </th>
              <th className="py-2 px-3 font-medium text-center" style={{ width: "8%" }}>
                Sort Order
              </th>
              <th className="py-2 px-3 font-medium text-right" style={{ width: "12%" }}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            <Rows />
          </tbody>
        </table>
      </div>
    </div>
  );
}

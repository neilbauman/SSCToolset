// components/framework/FrameworkEditor.tsx

"use client";

import { useMemo, useState, useCallback } from "react";
import { NormalizedFramework } from "@/lib/types/framework";
import {
  ChevronRight,
  ChevronDown,
  GripVertical,
  Pencil,
  Trash2,
  Plus,
} from "lucide-react";

type Props = {
  tree: any[];              // raw RPC response (pillars with nested themes/subthemes)
  versionId: string;        // current version id
  onChanged?: () => void;   // call to refetch after mutations
};

/**
 * Normalize incoming RPC tree and derive:
 * - type for each node
 * - sort_order per level (1..N within its parent)
 * - ref_code: P{p}, T{p}.{t}, ST{p}.{t}.{s}
 */
function useNormalized(tree: any[]): NormalizedFramework[] {
  return useMemo(() => {
    if (!Array.isArray(tree)) return [];

    const pillars = (tree ?? []) as any[];

    const out: NormalizedFramework[] = pillars.map((p, pIdx) => {
      const pillarIndex = pIdx + 1;

      const pillar: NormalizedFramework = {
        id: p.id,
        type: "pillar",
        name: p.name ?? "",
        description: p.description ?? "",
        color: p.color ?? null,
        icon: p.icon ?? null,
        can_have_indicators: p.can_have_indicators ?? false,
        sort_order: pillarIndex,
        ref_code: `P${pillarIndex}`,
        themes: [],
      };

      const rawThemes: any[] = Array.isArray(p.themes) ? p.themes : [];
      pillar.themes = rawThemes.map((t, tIdx) => {
        const themeIndex = tIdx + 1;

        const theme: NormalizedFramework = {
          id: t.id,
          type: "theme",
          name: t.name ?? "",
          description: t.description ?? "",
          color: t.color ?? null,
          icon: t.icon ?? null,
          can_have_indicators: t.can_have_indicators ?? true,
          sort_order: themeIndex,
          ref_code: `T${pillarIndex}.${themeIndex}`,
          subthemes: [],
        };

        const rawSubs: any[] = Array.isArray(t.subthemes) ? t.subthemes : [];
        theme.subthemes = rawSubs.map((s, sIdx) => {
          const subIndex = sIdx + 1;

          const sub: NormalizedFramework = {
            id: s.id,
            type: "subtheme",
            name: s.name ?? "",
            description: s.description ?? "",
            color: s.color ?? null,
            icon: s.icon ?? null,
            can_have_indicators: s.can_have_indicators ?? true,
            sort_order: subIndex,
            ref_code: `ST${pillarIndex}.${themeIndex}.${subIndex}`,
          };

          return sub;
        });

        return theme;
      });

      return pillar;
    });

    return out;
  }, [tree]);
}

type RowProps = {
  item: NormalizedFramework;
  level: number;
  openSet: Set<string>;
  toggle: (id: string) => void;
  editMode: boolean;
};

function Badge({ kind }: { kind: "pillar" | "theme" | "subtheme" }) {
  const style =
    kind === "pillar"
      ? "bg-blue-100 text-blue-700"
      : kind === "theme"
      ? "bg-green-100 text-green-700"
      : "bg-purple-100 text-purple-700";
  const label =
    kind === "pillar" ? "Pillar" : kind === "theme" ? "Theme" : "Subtheme";
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs ${style}`}>
      {label}
    </span>
  );
}

function Row({ item, level, openSet, toggle, editMode }: RowProps) {
  const hasChildren =
    (item.type === "pillar" && item.themes && item.themes.length > 0) ||
    (item.type === "theme" && item.subthemes && item.subthemes.length > 0);

  const isOpen = openSet.has(item.id);
  const padding = 12 + level * 20;

  return (
    <>
      <tr className="border-b last:border-b-0">
        {/* Type / Ref Code */}
        <td className="py-2 align-top">
          <div className="flex items-center">
            <div className="w-5 flex items-center justify-center">
              {hasChildren ? (
                <button
                  onClick={() => toggle(item.id)}
                  className="text-gray-500 hover:text-gray-700"
                  aria-label={isOpen ? "Collapse" : "Expand"}
                >
                  {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </button>
              ) : (
                <div className="w-4" />
              )}
            </div>

            {/* drag placeholder (disabled) */}
            <div className="w-5 flex items-center justify-center opacity-30">
              <GripVertical size={14} />
            </div>

            <div className="ml-1">
              <Badge kind={item.type} />
              <span className="ml-2 text-gray-500 text-xs">{item.ref_code}</span>
            </div>
          </div>
        </td>

        {/* Name / Description */}
        <td className="py-2 align-top" style={{ paddingLeft: padding }}>
          <div className="font-medium">{item.name || "—"}</div>
          {item.description ? (
            <div className="text-gray-500 text-xs">{item.description}</div>
          ) : null}
        </td>

        {/* Sort Order */}
        <td className="py-2 align-top">
          <div className="text-center text-sm">{item.sort_order ?? "-"}</div>
        </td>

        {/* Actions (always keeps column visible; icons appear only in edit mode) */}
        <td className="py-2 align-top">
          <div className="flex items-center gap-3 justify-end">
            {/* Edit */}
            <button
              className={`text-gray-500 hover:text-gray-700 ${editMode ? "opacity-100" : "opacity-0 pointer-events-none"}`}
              title="Edit"
            >
              <Pencil size={16} />
            </button>
            {/* Delete */}
            <button
              className={`text-gray-500 hover:text-gray-700 ${editMode ? "opacity-100" : "opacity-0 pointer-events-none"}`}
              title="Delete"
            >
              <Trash2 size={16} />
            </button>
            {/* Add child (Theme or Subtheme) */}
            <button
              className={`text-gray-500 hover:text-gray-700 ${editMode ? "opacity-100" : "opacity-0 pointer-events-none"}`}
              title="Add"
            >
              <Plus size={16} />
            </button>
          </div>
        </td>
      </tr>

      {/* Children */}
      {isOpen && item.type === "pillar" && item.themes?.map((t) => (
        <Row
          key={t.id}
          item={t}
          level={level + 1}
          openSet={openSet}
          toggle={toggle}
          editMode={editMode}
        />
      ))}

      {isOpen && item.type === "theme" && item.subthemes?.map((s) => (
        <Row
          key={s.id}
          item={s}
          level={level + 1}
          openSet={openSet}
          toggle={toggle}
          editMode={editMode}
        />
      ))}
    </>
  );
}

export default function FrameworkEditor({ tree, versionId, onChanged }: Props) {
  const data = useNormalized(tree);

  // Collapsed by default
  const [openSet, setOpenSet] = useState<Set<string>>(new Set());
  const [editMode, setEditMode] = useState(true);

  const toggle = useCallback((id: string) => {
    setOpenSet((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const expandAll = useCallback(() => {
    const all = new Set<string>();
    for (const p of data) {
      all.add(p.id);
      p.themes?.forEach((t) => {
        all.add(t.id);
      });
    }
    setOpenSet(all);
  }, [data]);

  const collapseAll = useCallback(() => {
    setOpenSet(new Set());
  }, []);

  return (
    <div className="border rounded-md overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-white">
        <div className="flex items-center gap-3">
          <button className="text-blue-600 hover:underline" onClick={collapseAll}>
            Collapse all
          </button>
          <button className="text-blue-600 hover:underline" onClick={expandAll}>
            Expand all
          </button>
          <button
            className="ml-2 inline-flex items-center gap-1 rounded bg-blue-600 text-white text-sm px-3 py-1.5"
            title="Add Pillar"
          >
            <Plus size={16} /> Add Pillar
          </button>
        </div>

        <button
          onClick={() => setEditMode((v) => !v)}
          className="text-gray-600 hover:underline text-sm"
        >
          {editMode ? "Exit edit mode" : "Enter edit mode"}
        </button>
      </div>

      {/* Table header */}
      <div className="w-full">
        <table className="w-full table-fixed">
          <colgroup>
            {/* Type/RefCode ~22%, Name ~58%, Sort ~10%, Actions ~10% */}
            <col style={{ width: "22%" }} />
            <col style={{ width: "58%" }} />
            <col style={{ width: "10%" }} />
            <col style={{ width: "10%" }} />
          </colgroup>

          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left text-sm font-medium text-gray-600 py-2 px-2">
                Type / Ref Code
              </th>
              <th className="text-left text-sm font-medium text-gray-600 py-2 px-2">
                Name / Description
              </th>
              <th className="text-center text-sm font-medium text-gray-600 py-2 px-2">
                Sort Order
              </th>
              <th className="text-right text-sm font-medium text-gray-600 py-2 px-2">
                Actions
              </th>
            </tr>
          </thead>

          <tbody className="bg-white">
            {data.map((pillar) => (
              <Row
                key={pillar.id}
                item={pillar}
                level={0}
                openSet={openSet}
                toggle={toggle}
                editMode={editMode}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

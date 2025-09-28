"use client";

import { useMemo, useState } from "react";
import type { NormalizedFramework } from "@/lib/types/framework";
import {
  ChevronRight,
  ChevronDown,
  Plus,
  Edit3,
  Trash2,
  MoveVertical,
} from "lucide-react";

type Props = {
  tree: NormalizedFramework[];
  editMode?: boolean;
};

export default function FrameworkEditor({ tree, editMode = false }: Props) {
  const [openPillars, setOpenPillars] = useState<Set<string>>(
    () => new Set<string>()
  );
  const [openThemes, setOpenThemes] = useState<Set<string>>(
    () => new Set<string>()
  );

  const togglePillar = (id: string) =>
    setOpenPillars((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  const toggleTheme = (id: string) =>
    setOpenThemes((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  const rows = useMemo(() => {
    const out: Array<{
      level: 0 | 1 | 2;
      key: string;
      ref: string;
      typeLabel: "Pillar" | "Theme" | "Subtheme";
      name: string;
      description?: string | null;
      sort?: number | null;
      pillarId?: string;
      themeId?: string;
      hasChildren?: boolean;
    }> = [];

    tree.forEach((p, pi) => {
      const pRef = `P${pi + 1}`;
      out.push({
        level: 0,
        key: `pillar:${p.id}`,
        ref: pRef,
        typeLabel: "Pillar",
        name: p.name,
        description: p.description ?? "",
        sort: pi + 1,
        pillarId: p.id,
        hasChildren: (p.themes?.length ?? 0) > 0,
      });

      p.themes?.forEach((t, ti) => {
        const tRef = `T${pi + 1}.${ti + 1}`;
        out.push({
          level: 1,
          key: `theme:${t.id}`,
          ref: tRef,
          typeLabel: "Theme",
          name: t.name,
          description: t.description ?? "",
          sort: ti + 1,
          pillarId: p.id,
          themeId: t.id,
          hasChildren: (t.subthemes?.length ?? 0) > 0,
        });

        t.subthemes?.forEach((s, si) => {
          const stRef = `ST${pi + 1}.${ti + 1}.${si + 1}`;
          out.push({
            level: 2,
            key: `subtheme:${s.id}`,
            ref: stRef,
            typeLabel: "Subtheme",
            name: s.name,
            description: s.description ?? "",
            sort: si + 1,
            pillarId: p.id,
            themeId: t.id,
            hasChildren: false,
          });
        });
      });
    });

    return out;
  }, [tree]);

  const badge = (label: string, tone: "blue" | "green" | "violet") => {
    const tones =
      tone === "blue"
        ? "bg-blue-50 text-blue-700 ring-blue-200"
        : tone === "green"
        ? "bg-green-50 text-green-700 ring-green-200"
        : "bg-violet-50 text-violet-700 ring-violet-200";
    return (
      <span className={`rounded-full px-2 py-0.5 text-xs ring-1 ${tones}`}>
        {label.toLowerCase()}
      </span>
    );
  };

  const indentCls = (level: 0 | 1 | 2) =>
    level === 0 ? "" : level === 1 ? "pl-4" : "pl-8";

  const isRowVisible = (r: (typeof rows)[number]) => {
    if (r.level === 0) return true;
    if (r.level === 1) return openPillars.has(r.pillarId!);
    return openPillars.has(r.pillarId!) && openThemes.has(r.themeId!);
  };

  const caretFor = (r: (typeof rows)[number]) => {
    if (!r.hasChildren) return <span className="w-4" />;

    if (r.level === 0) {
      const open = openPillars.has(r.pillarId!);
      const Icon = open ? ChevronDown : ChevronRight;
      return (
        <button
          onClick={() => togglePillar(r.pillarId!)}
          className="mr-1 inline-flex h-5 w-5 items-center justify-center rounded hover:bg-gray-100"
        >
          <Icon className="h-4 w-4 text-gray-600" />
        </button>
      );
    }

    if (r.level === 1) {
      const open = openThemes.has(r.themeId!);
      const Icon = open ? ChevronDown : ChevronRight;
      return (
        <button
          onClick={() => toggleTheme(r.themeId!)}
          className="mr-1 inline-flex h-5 w-5 items-center justify-center rounded hover:bg-gray-100"
        >
          <Icon className="h-4 w-4 text-gray-600" />
        </button>
      );
    }

    return <span className="w-4" />;
  };

  const typeBadgeFor = (r: (typeof rows)[number]) =>
    r.typeLabel === "Pillar"
      ? badge("pillar", "blue")
      : r.typeLabel === "Theme"
      ? badge("theme", "green")
      : badge("subtheme", "violet");

  return (
    <div className="w-full">
      <div
        className="grid items-center border-b bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-600"
        style={{
          gridTemplateColumns: "32% 46% 12% 10%",
        }}
      >
        <div>TYPE / REF CODE</div>
        <div>NAME / DESCRIPTION</div>
        <div className="text-right">SORT</div>
        <div className="text-right">ACTIONS</div>
      </div>

      <div className="divide-y">
        {rows.map((r) =>
          isRowVisible(r) ? (
            <div
              key={r.key}
              className="grid items-center px-3 py-2 text-sm"
              style={{
                gridTemplateColumns: "32% 46% 12% 10%",
              }}
            >
              <div className={`flex items-center ${indentCls(r.level)}`}>
                {caretFor(r)}
                {typeBadgeFor(r)}
                <span className="ml-3 text-gray-500">{r.ref}</span>
              </div>

              <div className={`${indentCls(r.level)} -ml-2`}>
                <div className="font-medium text-gray-900">{r.name}</div>
                {r.description ? (
                  <div className="text-xs leading-5 text-gray-600">
                    {r.description}
                  </div>
                ) : null}
              </div>

              <div className="text-right text-gray-700">
                {typeof r.sort === "number" ? r.sort : ""}
              </div>

              <div className="flex justify-end gap-2">
                <button
                  className={`inline-flex h-6 w-6 items-center justify-center rounded hover:bg-gray-100 ${
                    editMode ? "opacity-100" : "opacity-0"
                  }`}
                  title="Move (not wired)"
                >
                  <MoveVertical className="h-4 w-4 text-gray-600" />
                </button>
                <button
                  className={`inline-flex h-6 w-6 items-center justify-center rounded hover:bg-gray-100 ${
                    editMode ? "opacity-100" : "opacity-0"
                  }`}
                  title="Edit (not wired)"
                >
                  <Edit3 className="h-4 w-4 text-gray-600" />
                </button>
                <button
                  className={`inline-flex h-6 w-6 items-center justify-center rounded hover:bg-gray-100 ${
                    editMode ? "opacity-100" : "opacity-0"
                  }`}
                  title="Add child (not wired)"
                >
                  <Plus className="h-4 w-4 text-gray-600" />
                </button>
                <button
                  className={`inline-flex h-6 w-6 items-center justify-center rounded hover:bg-gray-100 ${
                    editMode ? "opacity-100" : "opacity-0"
                  }`}
                  title="Delete (not wired)"
                >
                  <Trash2 className="h-4 w-4 text-red-600" />
                </button>
              </div>
            </div>
          ) : null
        )}
      </div>
    </div>
  );
}

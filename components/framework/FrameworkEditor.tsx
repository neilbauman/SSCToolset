// components/framework/FrameworkEditor.tsx
"use client";

import { useEffect, useState } from "react";

type Item = {
  id: string;
  version_id: string;
  type: "pillar" | "theme" | "subtheme";
  ref_code: string;
  name: string;
  description: string | null;
  sort_order: number;
  pillar_id: string | null;
  theme_id: string | null;
  subtheme_id: string | null;
};

interface FrameworkEditorProps {
  versionId: string;
}

export default function FrameworkEditor({ versionId }: FrameworkEditorProps) {
  const [items, setItems] = useState<Item[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetch(`/api/framework/versions/${versionId}/items`)
      .then((r) => r.json())
      .then((j) => {
        if (!active) return;
        setItems(Array.isArray(j?.data) ? j.data : []);
      })
      .catch(() => {
        if (!active) return;
        setItems([]);
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [versionId]);

  const toggle = (key: string, value?: boolean) =>
    setExpanded((e) => ({ ...e, [key]: value ?? !e[key] }));

  const expandAll = () => {
    const all: Record<string, boolean> = {};
    items.forEach((it) => {
      if (it.type !== "pillar") return;
      all[`p-${it.pillar_id}`] = true;
      items
        .filter((t) => t.type === "theme" && t.pillar_id === it.pillar_id)
        .forEach((t) => (all[`t-${t.theme_id}`] = true));
    });
    setExpanded(all);
  };

  const collapseAll = () => setExpanded({});

  // helpers to find children
  const themesOf = (pillarId: string | null) =>
    items.filter(
      (i) => i.type === "theme" && i.pillar_id && i.pillar_id === pillarId
    );

  const subsOf = (themeId: string | null) =>
    items.filter(
      (i) => i.type === "subtheme" && i.theme_id && i.theme_id === themeId
    );

  return (
    <div className="rounded-lg border bg-white">
      <div className="flex items-center gap-2 p-3">
        <button
          className="rounded border px-3 py-1 text-sm"
          onClick={expandAll}
        >
          Expand All
        </button>
        <button
          className="rounded border px-3 py-1 text-sm"
          onClick={collapseAll}
        >
          Collapse All
        </button>
        <div className="ml-auto text-sm text-gray-500">
          {loading ? "Loading…" : null}
        </div>
      </div>

      <div className="grid grid-cols-[200px_1fr_140px_120px] border-t text-sm font-medium text-gray-600">
        <div className="px-4 py-2">Type/Ref Code</div>
        <div className="px-4 py-2">Name/Description</div>
        <div className="px-4 py-2">Sort Order</div>
        <div className="px-4 py-2">Actions</div>
      </div>

      {/* Pillars */}
      {items
        .filter((i) => i.type === "pillar")
        .map((p) => {
          const pKey = `p-${p.pillar_id}`;
          const isPExpanded = !!expanded[pKey];
          const pThemes = themesOf(p.pillar_id);

          return (
            <div key={p.id} className="border-t">
              <div className="grid grid-cols-[200px_1fr_140px_120px]">
                <div className="px-4 py-3">
                  <button
                    className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded border"
                    onClick={() => toggle(pKey)}
                    aria-label={isPExpanded ? "Collapse" : "Expand"}
                  >
                    {isPExpanded ? "▾" : "▸"}
                  </button>
                  <span className="font-semibold">Pillar</span> {p.ref_code}
                </div>
                <div className="px-4 py-3">
                  <div className="font-medium">{p.name}</div>
                  {p.description ? (
                    <div className="text-gray-500">{p.description}</div>
                  ) : null}
                </div>
                <div className="px-4 py-3">{p.sort_order}</div>
                <div className="px-4 py-3">—</div>
              </div>

              {/* Themes */}
              {isPExpanded &&
                pThemes.map((t) => {
                  const tKey = `t-${t.theme_id}`;
                  const isTExpanded = !!expanded[tKey];
                  const tSubs = subsOf(t.theme_id);

                  return (
                    <div key={t.id} className="border-t bg-gray-50">
                      <div className="grid grid-cols-[200px_1fr_140px_120px]">
                        <div className="px-8 py-3">
                          <button
                            className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded border"
                            onClick={() => toggle(tKey)}
                            aria-label={isTExpanded ? "Collapse" : "Expand"}
                          >
                            {isTExpanded ? "▾" : "▸"}
                          </button>
                          <span className="font-semibold">Theme</span>{" "}
                          {t.ref_code}
                        </div>
                        <div className="px-4 py-3">
                          <div className="font-medium">{t.name}</div>
                          {t.description ? (
                            <div className="text-gray-500">{t.description}</div>
                          ) : null}
                        </div>
                        <div className="px-4 py-3">{t.sort_order}</div>
                        <div className="px-4 py-3">—</div>
                      </div>

                      {/* Subthemes */}
                      {isTExpanded &&
                        tSubs.map((s) => (
                          <div
                            key={s.id}
                            className="grid grid-cols-[200px_1fr_140px_120px] border-t"
                          >
                            <div className="px-12 py-3">
                              <span className="font-semibold">Subtheme</span>{" "}
                              {s.ref_code}
                            </div>
                            <div className="px-4 py-3">
                              <div className="font-medium">{s.name}</div>
                              {s.description ? (
                                <div className="text-gray-500">
                                  {s.description}
                                </div>
                              ) : null}
                            </div>
                            <div className="px-4 py-3">{s.sort_order}</div>
                            <div className="px-4 py-3">—</div>
                          </div>
                        ))}
                    </div>
                  );
                })}
            </div>
          );
        })}
    </div>
  );
}

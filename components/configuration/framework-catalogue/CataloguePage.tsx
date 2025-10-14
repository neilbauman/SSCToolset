"use client";

import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { Plus, Edit2, Trash2, RefreshCcw, ChevronDown, ChevronRight } from "lucide-react";
import AddPillarModal from "./AddPillarModal";
import AddThemeModal from "./AddThemeModal";
import AddSubthemeModal from "./AddSubthemeModal";
import EditPillarModal from "./EditPillarModal";
import EditThemeModal from "./EditThemeModal";
import EditSubthemeModal from "./EditSubthemeModal";

export type Pillar = {
  id: string;
  name: string;
  description: string | null;
  can_have_indicators: boolean | null;
};

export type Theme = {
  id: string;
  pillar_id: string | null;
  name: string;
  description: string | null;
  can_have_indicators: boolean | null;
  sort_order: number | null;
};

export type Subtheme = {
  id: string;
  theme_id: string | null;
  name: string;
  description: string | null;
  can_have_indicators: boolean | null;
  sort_order: number | null;
};

type Tree = Array<
  Pillar & {
    themes: Array<
      Theme & {
        subthemes: Subtheme[];
      }
    >;
  }
>;

export default function CataloguePage() {
  const [tree, setTree] = useState<Tree>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // Modals state
  const [openAddPillar, setOpenAddPillar] = useState(false);
  const [addThemeFor, setAddThemeFor] = useState<Pillar | null>(null);
  const [addSubthemeFor, setAddSubthemeFor] = useState<Theme | null>(null);

  const [editPillar, setEditPillar] = useState<Pillar | null>(null);
  const [editTheme, setEditTheme] = useState<Theme | null>(null);
  const [editSubtheme, setEditSubtheme] = useState<Subtheme | null>(null);

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    // Load pillars, themes, subthemes in parallel and assemble
    const [pillarsRes, themesRes, subsRes] = await Promise.all([
      supabase.from("pillar_catalogue").select("id,name,description,can_have_indicators").order("name", { ascending: true }),
      supabase.from("theme_catalogue").select("id,pillar_id,name,description,can_have_indicators,sort_order").order("sort_order", { ascending: true, nullsFirst: true }).order("name", { ascending: true }),
      supabase.from("subtheme_catalogue").select("id,theme_id,name,description,can_have_indicators,sort_order").order("sort_order", { ascending: true, nullsFirst: true }).order("name", { ascending: true }),
    ]);

    if (pillarsRes.error || themesRes.error || subsRes.error) {
      console.error("Load error", pillarsRes.error || themesRes.error || subsRes.error);
      setTree([]);
      return;
    }

    const pillars = (pillarsRes.data || []) as Pillar[];
    const themes = (themesRes.data || []) as Theme[];
    const subs = (subsRes.data || []) as Subtheme[];

    const themesByPillar = new Map<string, Theme[]>();
    for (const t of themes) {
      const key = t.pillar_id ?? "__none__";
      if (!themesByPillar.has(key)) themesByPillar.set(key, []);
      themesByPillar.get(key)!.push(t);
    }

    const subsByTheme = new Map<string, Subtheme[]>();
    for (const s of subs) {
      const key = s.theme_id ?? "__none__";
      if (!subsByTheme.has(key)) subsByTheme.set(key, []);
      subsByTheme.get(key)!.push(s);
    }

    const assembled: Tree = pillars.map((p) => ({
      ...p,
      themes: (themesByPillar.get(p.id) || []).map((t) => ({
        ...t,
        subthemes: subsByTheme.get(t.id) || [],
      })),
    }));

    setTree(assembled);
  }

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  /** Deletes respect DB cascade (Theme->Subtheme; Pillar->Theme->Subtheme) */
  async function deletePillar(p: Pillar) {
    if (!confirm(`Delete pillar "${p.name}"?\n\nThis also deletes its themes and subthemes.`)) return;
    const { error } = await supabase.from("pillar_catalogue").delete().eq("id", p.id);
    if (error) {
      console.error(error);
      alert("Delete failed.");
      return;
    }
    await loadAll();
  }

  async function deleteTheme(t: Theme) {
    if (!confirm(`Delete theme "${t.name}" and its subthemes?`)) return;
    const { error } = await supabase.from("theme_catalogue").delete().eq("id", t.id);
    if (error) {
      console.error(error);
      alert("Delete failed.");
      return;
    }
    await loadAll();
  }

  async function deleteSubtheme(s: Subtheme) {
    if (!confirm(`Delete subtheme "${s.name}"?`)) return;
    const { error } = await supabase.from("subtheme_catalogue").delete().eq("id", s.id);
    if (error) {
      console.error(error);
      alert("Delete failed.");
      return;
    }
    await loadAll();
  }

  const hasData = useMemo(() => tree.length > 0, [tree]);

  return (
    <div>
      {/* Toolbar */}
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-lg font-semibold" style={{ color: "var(--gsc-blue)" }}>
          Framework Catalogue
        </h2>
        <div className="flex items-center gap-2">
          <button onClick={loadAll} className="flex items-center gap-1 px-3 py-2 text-sm rounded-md border" title="Reload">
            <RefreshCcw className="w-4 h-4" />
            Reload
          </button>
          <button
            onClick={() => setOpenAddPillar(true)}
            className="flex items-center gap-1 px-3 py-2 text-sm rounded-md"
            style={{ background: "var(--gsc-blue)", color: "white" }}
          >
            <Plus className="w-4 h-4" />
            Add Pillar
          </button>
        </div>
      </div>

      {/* Header */}
      <div className="grid grid-cols-12 bg-[var(--gsc-beige)] border text-sm text-[var(--gsc-gray)] rounded-t-md">
        <div className="col-span-4 px-3 py-2 font-medium">Type / Code</div>
        <div className="col-span-6 px-3 py-2 font-medium">Name / Description</div>
        <div className="col-span-2 px-3 py-2 font-medium text-right">Actions</div>
      </div>

      {/* Body */}
      <div className="border border-t-0 rounded-b-md bg-white">
        {!hasData ? (
          <p className="text-sm text-gray-500 italic px-3 py-3">No pillars yet.</p>
        ) : (
          <div className="divide-y">
            {tree.map((p) => {
              const pOpen = expanded.has(p.id);
              return (
                <div key={p.id} className="text-sm">
                  {/* Pillar row */}
                  <div className="grid grid-cols-12 items-center px-3 py-2 hover:bg-[var(--gsc-beige)]/40">
                    <div className="col-span-4 flex items-center gap-2">
                      <button onClick={() => toggleExpand(p.id)} className="text-gray-500">
                        {pOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </button>
                      <span className="px-2 py-[2px] rounded text-xs font-medium" style={{ background: "#e6eef6", color: "var(--gsc-blue)" }}>
                        pillar
                      </span>
                    </div>
                    <div className="col-span-6">
                      <div className="font-medium text-gray-800">{p.name}</div>
                      <div className="text-xs text-gray-500">
                        {p.description || <span className="italic text-gray-400">—</span>}{" "}
                        {p.can_have_indicators ? (
                          <span className="ml-2 text-[10px] px-2 py-[1px] rounded-full" style={{ background: "#ecfdf5", color: "var(--gsc-green)", border: "1px solid #d1fae5" }}>
                            can hold indicators
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <div className="col-span-2">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => setEditPillar(p)} className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100" title="Edit pillar">
                          <Edit2 className="w-4 h-4" style={{ color: "var(--gsc-blue)" }} />
                        </button>
                        <button onClick={() => deletePillar(p)} className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100" title="Delete pillar">
                          <Trash2 className="w-4 h-4" style={{ color: "var(--gsc-red)" }} />
                        </button>
                        <button onClick={() => setAddThemeFor(p)} className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100" title="Add theme">
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Themes */}
                  {pOpen &&
                    p.themes.map((t) => {
                      const tOpen = expanded.has(t.id);
                      return (
                        <div key={t.id} className="pl-8 border-t">
                          <div className="grid grid-cols-12 items-center px-3 py-2 hover:bg-[var(--gsc-beige)]/40">
                            <div className="col-span-4 flex items-center gap-2">
                              <button onClick={() => toggleExpand(t.id)} className="text-gray-500">
                                {tOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                              </button>
                              <span className="px-2 py-[2px] rounded text-xs font-medium" style={{ background: "#eaf7ee", color: "var(--gsc-green)" }}>
                                theme
                              </span>
                              <span className="text-[11px] text-gray-500 ml-2">order: {t.sort_order ?? "—"}</span>
                            </div>
                            <div className="col-span-6">
                              <div className="font-medium text-gray-800">{t.name}</div>
                              <div className="text-xs text-gray-500">
                                {t.description || <span className="italic text-gray-400">—</span>}{" "}
                                {t.can_have_indicators ? (
                                  <span className="ml-2 text-[10px] px-2 py-[1px] rounded-full" style={{ background: "#ecfdf5", color: "var(--gsc-green)", border: "1px solid #d1fae5" }}>
                                    can hold indicators
                                  </span>
                                ) : null}
                              </div>
                            </div>
                            <div className="col-span-2">
                              <div className="flex items-center justify-end gap-1">
                                <button onClick={() => setEditTheme(t)} className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100" title="Edit theme">
                                  <Edit2 className="w-4 h-4" style={{ color: "var(--gsc-blue)" }} />
                                </button>
                                <button onClick={() => deleteTheme(t)} className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100" title="Delete theme">
                                  <Trash2 className="w-4 h-4" style={{ color: "var(--gsc-red)" }} />
                                </button>
                                <button onClick={() => setAddSubthemeFor(t)} className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100" title="Add subtheme">
                                  <Plus className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Subthemes */}
                          {tOpen &&
                            t.subthemes.map((s) => (
                              <div key={s.id} className="pl-8 border-t">
                                <div className="grid grid-cols-12 items-center px-3 py-2 hover:bg-[var(--gsc-beige)]/40">
                                  <div className="col-span-4 flex items-center gap-2">
                                    <span className="px-2 py-[2px] rounded text-xs font-medium" style={{ background: "#fff3e8", color: "var(--gsc-orange)" }}>
                                      subtheme
                                    </span>
                                    <span className="text-[11px] text-gray-500 ml-2">order: {s.sort_order ?? "—"}</span>
                                  </div>
                                  <div className="col-span-6">
                                    <div className="font-medium text-gray-800">{s.name}</div>
                                    <div className="text-xs text-gray-500">
                                      {s.description || <span className="italic text-gray-400">—</span>}{" "}
                                      {s.can_have_indicators ? (
                                        <span className="ml-2 text-[10px] px-2 py-[1px] rounded-full" style={{ background: "#ecfdf5", color: "var(--gsc-green)", border: "1px solid #d1fae5" }}>
                                          can hold indicators
                                        </span>
                                      ) : null}
                                    </div>
                                  </div>
                                  <div className="col-span-2">
                                    <div className="flex items-center justify-end gap-1">
                                      <button onClick={() => setEditSubtheme(s)} className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100" title="Edit subtheme">
                                        <Edit2 className="w-4 h-4" style={{ color: "var(--gsc-blue)" }} />
                                      </button>
                                      <button onClick={() => deleteSubtheme(s)} className="w-8 h-8 flex items-center justify-center rounded hover:bg-gray-100" title="Delete subtheme">
                                        <Trash2 className="w-4 h-4" style={{ color: "var(--gsc-red)" }} />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                        </div>
                      );
                    })}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modals */}
      {openAddPillar && <AddPillarModal open={openAddPillar} onClose={() => setOpenAddPillar(false)} onSaved={loadAll} />}

      {addThemeFor && (
        <AddThemeModal open={!!addThemeFor} pillar={addThemeFor} onClose={() => setAddThemeFor(null)} onSaved={loadAll} />
      )}

      {addSubthemeFor && (
        <AddSubthemeModal open={!!addSubthemeFor} theme={addSubthemeFor} onClose={() => setAddSubthemeFor(null)} onSaved={loadAll} />
      )}

      {editPillar && (
        <EditPillarModal open={!!editPillar} pillar={editPillar} onClose={() => setEditPillar(null)} onSaved={loadAll} />
      )}

      {editTheme && <EditThemeModal open={!!editTheme} theme={editTheme} onClose={() => setEditTheme(null)} onSaved={loadAll} />}

      {editSubtheme && (
        <EditSubthemeModal open={!!editSubtheme} subtheme={editSubtheme} onClose={() => setEditSubtheme(null)} onSaved={loadAll} />
      )}
    </div>
  );
}

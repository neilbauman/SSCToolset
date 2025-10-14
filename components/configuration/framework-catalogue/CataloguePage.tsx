"use client";

import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import Modal from "@/components/ui/Modal";
import AddPillarModal from "./AddPillarModal";
import EditPillarModal from "./EditPillarModal";
import AddThemeModal from "./AddThemeModal";
import EditThemeModal from "./EditThemeModal";
import AddSubthemeModal from "./AddSubthemeModal";
import EditSubthemeModal from "./EditSubthemeModal";
import IndicatorLinkModal from "./IndicatorLinkModal";
import {
  Plus,
  Edit2,
  Trash2,
  Loader2,
  ChevronRight,
  ChevronDown,
  BarChart2,
} from "lucide-react";

/** Types */
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

type IndicatorLite = { id: string; code: string; name: string };
type LinkRow = {
  id: string;
  indicator_id: string;
  pillar_id: string | null;
  theme_id: string | null;
  subtheme_id: string | null;
  indicator_catalogue: IndicatorLite | null;
};

type PillarMap = Record<string, Pillar>;
type ThemeMap = Record<string, Theme[]>;
type SubthemeMap = Record<string, Subtheme[]>;
type LinkMap = Record<string, IndicatorLite[]>; // key: pillar:<id> | theme:<id> | subtheme:<id>

export default function CataloguePage() {
  const [pillars, setPillars] = useState<Pillar[]>([]);
  const [themesByPillar, setThemesByPillar] = useState<ThemeMap>({});
  const [subsByTheme, setSubsByTheme] = useState<SubthemeMap>({});
  const [links, setLinks] = useState<LinkMap>({});
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  // Add/Edit modal state
  const [openAddPillar, setOpenAddPillar] = useState(false);
  const [editPillar, setEditPillar] = useState<Pillar | null>(null);

  const [addThemeFor, setAddThemeFor] = useState<Pillar | null>(null);
  const [editTheme, setEditTheme] = useState<Theme | null>(null);

  const [addSubFor, setAddSubFor] = useState<Theme | null>(null);
  const [editSub, setEditSub] = useState<Subtheme | null>(null);

  // Indicator linking modal
  const [openLinkModal, setOpenLinkModal] = useState(false);
  const [linkTarget, setLinkTarget] = useState<{
    type: "pillar" | "theme" | "subtheme";
    id: string;
    name: string;
  } | null>(null);

  useEffect(() => {
    loadTree();
  }, []);

  async function loadTree() {
    setLoading(true);

    // 1) Pillars
    const { data: ps, error: perr } = await supabase
      .from("pillar_catalogue")
      .select("id,name,description,can_have_indicators")
      .order("name", { ascending: true });
    if (perr) {
      console.error(perr);
      setPillars([]);
      setThemesByPillar({});
      setSubsByTheme({});
      setLinks({});
      setLoading(false);
      return;
    }

    // 2) Themes
    const { data: ts, error: terr } = await supabase
      .from("theme_catalogue")
      .select("id,pillar_id,name,description,can_have_indicators,sort_order")
      .order("pillar_id", { ascending: true, nullsFirst: true })
      .order("sort_order", { ascending: true, nullsFirst: true })
      .order("name", { ascending: true });

    // 3) Subthemes
    const { data: ss, error: serr } = await supabase
      .from("subtheme_catalogue")
      .select("id,theme_id,name,description,can_have_indicators,sort_order")
      .order("theme_id", { ascending: true, nullsFirst: true })
      .order("sort_order", { ascending: true, nullsFirst: true })
      .order("name", { ascending: true });

    // 4) Links with indicator names
    const { data: ls, error: lerr } = await supabase
      .from("catalogue_indicator_links")
      .select(
        "id,indicator_id,pillar_id,theme_id,subtheme_id,indicator_catalogue (id,code,name)"
      );

    const pillarList: Pillar[] = (ps || []) as Pillar[];
    const themeList: Theme[] = (ts || []) as Theme[];
    const subList: Subtheme[] = (ss || []) as Subtheme[];
    const linkList: LinkRow[] = (ls || []) as LinkRow[];

    // Build theme map
    const tMap: ThemeMap = {};
    for (const t of themeList) {
      const pid = t.pillar_id || "__NULL__";
      if (!tMap[pid]) tMap[pid] = [];
      tMap[pid].push(t);
    }

    // Build subtheme map
    const sMap: SubthemeMap = {};
    for (const s of subList) {
      const tid = s.theme_id || "__NULL__";
      if (!sMap[tid]) sMap[tid] = [];
      sMap[tid].push(s);
    }

    // Build link map
    const lMap: LinkMap = {};
    const addLink = (key: string, ind: IndicatorLite | null) => {
      if (!ind) return;
      if (!lMap[key]) lMap[key] = [];
      lMap[key].push(ind);
    };
    for (const l of linkList) {
      if (l.pillar_id) addLink(`pillar:${l.pillar_id}`, l.indicator_catalogue);
      if (l.theme_id) addLink(`theme:${l.theme_id}`, l.indicator_catalogue);
      if (l.subtheme_id) addLink(`subtheme:${l.subtheme_id}`, l.indicator_catalogue);
    }

    setPillars(pillarList);
    setThemesByPillar(tMap);
    setSubsByTheme(sMap);
    setLinks(lMap);
    setLoading(false);
  }

  // Expand/collapse helpers
  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }
  function isOpen(id: string) {
    return expanded.has(id);
  }

  // Delete handlers (safe: FK ON DELETE CASCADE for catalogue children; indicators not deleted)
  async function deletePillar(p: Pillar) {
    const ok = confirm(
      `Delete pillar "${p.name}"?\n\nThis will cascade to delete its themes and subthemes in the catalogue (indicators remain in the indicator library).`
    );
    if (!ok) return;
    const { error } = await supabase.from("pillar_catalogue").delete().eq("id", p.id);
    if (error) {
      console.error(error);
      alert("Delete failed.");
    } else {
      await loadTree();
    }
  }
  async function deleteTheme(t: Theme) {
    const ok = confirm(
      `Delete theme "${t.name}"?\n\nThis will cascade to delete its subthemes in the catalogue.`
    );
    if (!ok) return;
    const { error } = await supabase.from("theme_catalogue").delete().eq("id", t.id);
    if (error) {
      console.error(error);
      alert("Delete failed.");
    } else {
      await loadTree();
    }
  }
  async function deleteSubtheme(s: Subtheme) {
    const ok = confirm(`Delete subtheme "${s.name}"?`);
    if (!ok) return;
    const { error } = await supabase.from("subtheme_catalogue").delete().eq("id", s.id);
    if (error) {
      console.error(error);
      alert("Delete failed.");
    } else {
      await loadTree();
    }
  }

  // Render helper: indicator chips row
  function IndicatorChips({
    items,
  }: {
    items: IndicatorLite[] | undefined;
  }) {
    if (!items || items.length === 0) {
      return <div className="text-xs text-gray-400">—</div>;
    }
    // show compact, wrap
    return (
      <div className="flex flex-wrap gap-1">
        {items
          .slice()
          .sort((a, b) => a.name.localeCompare(b.name))
          .map((ind) => (
            <span
              key={ind.id}
              className="text-[11px] px-2 py-[2px] rounded-full border whitespace-nowrap"
              style={{
                borderColor: "var(--gsc-light-gray)",
                background: "white",
                color: "var(--gsc-gray)",
              }}
              title={`${ind.name} (${ind.code})`}
            >
              {ind.name}
            </span>
          ))}
      </div>
    );
  }

  const hasData = useMemo(() => pillars.length > 0, [pillars]);

  return (
    <div>
      {/* Toolbar */}
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-lg font-semibold" style={{ color: "var(--gsc-blue)" }}>
          Framework Catalogue
        </h2>
        <div className="flex items-center gap-2">
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

      {/* Empty state / loading */}
      {loading ? (
        <div className="flex items-center gap-2 text-gray-500 text-sm">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading catalogue…
        </div>
      ) : !hasData ? (
        <p className="text-sm text-gray-500 italic">No catalogue items yet.</p>
      ) : (
        <div className="border rounded-md overflow-hidden bg-white">
          {/* Header */}
          <div
            className="grid grid-cols-12 items-center text-sm font-medium border-b"
            style={{ background: "var(--gsc-beige)", color: "var(--gsc-gray)" }}
          >
            <div className="col-span-4 py-2 px-2">Entity / Name</div>
            <div className="col-span-5 py-2">Indicators</div>
            <div className="col-span-3 py-2 text-right">Actions</div>
          </div>

          {/* Body */}
          <div>
            {pillars.map((p) => {
              const pid = p.id;
              const tList = themesByPillar[pid] || [];
              const pKey = `pillar:${pid}`;
              return (
                <div key={pid} className="border-b">
                  {/* Pillar row */}
                  <div className="grid grid-cols-12 items-start text-sm px-2 py-2">
                    <div className="col-span-4 flex items-start gap-2">
                      <button
                        className="mt-[2px] text-gray-500"
                        onClick={() => toggle(pid)}
                        title={isOpen(pid) ? "Collapse" : "Expand"}
                      >
                        {isOpen(pid) ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </button>
                      <div>
                        <div className="font-medium" style={{ color: "var(--gsc-blue)" }}>
                          {p.name}
                        </div>
                        {p.description && (
                          <div className="text-xs text-gray-500">{p.description}</div>
                        )}
                      </div>
                    </div>
                    <div className="col-span-5">
                      <IndicatorChips items={links[pKey]} />
                    </div>
                    <div className="col-span-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => {
                            setLinkTarget({ type: "pillar", id: pid, name: p.name });
                            setOpenLinkModal(true);
                          }}
                          className="inline-flex items-center justify-center w-8 h-8 rounded hover:bg-gray-100"
                          title="Manage indicators"
                        >
                          <BarChart2 className="w-4 h-4" style={{ color: "var(--gsc-green)" }} />
                        </button>
                        <button
                          onClick={() => setEditPillar(p)}
                          className="inline-flex items-center justify-center w-8 h-8 rounded hover:bg-gray-100"
                          title="Edit pillar"
                        >
                          <Edit2 className="w-4 h-4" style={{ color: "var(--gsc-blue)" }} />
                        </button>
                        <button
                          onClick={() => deletePillar(p)}
                          className="inline-flex items-center justify-center w-8 h-8 rounded hover:bg-gray-100"
                          title="Delete pillar"
                        >
                          <Trash2 className="w-4 h-4" style={{ color: "var(--gsc-red)" }} />
                        </button>
                        <button
                          onClick={() => setAddThemeFor(p)}
                          className="inline-flex items-center justify-center px-2 h-8 rounded border hover:bg-gray-50 text-xs"
                          title="Add theme"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span className="ml-1">Theme</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Themes */}
                  {isOpen(pid) &&
                    tList.map((t) => {
                      const tid = t.id;
                      const sList = subsByTheme[tid] || [];
                      const tKey = `theme:${tid}`;
                      return (
                        <div key={tid} className="border-t">
                          {/* Theme row */}
                          <div className="grid grid-cols-12 items-start text-sm px-8 py-2">
                            <div className="col-span-4 flex items-start gap-2">
                              <button
                                className="mt-[2px] text-gray-500"
                                onClick={() => toggle(tid)}
                                title={isOpen(tid) ? "Collapse" : "Expand"}
                              >
                                {isOpen(tid) ? (
                                  <ChevronDown className="w-4 h-4" />
                                ) : (
                                  <ChevronRight className="w-4 h-4" />
                                )}
                              </button>
                              <div>
                                <div className="font-medium" style={{ color: "var(--gsc-green)" }}>
                                  {t.name}
                                </div>
                                {t.description && (
                                  <div className="text-xs text-gray-500">{t.description}</div>
                                )}
                              </div>
                            </div>
                            <div className="col-span-5">
                              <IndicatorChips items={links[tKey]} />
                            </div>
                            <div className="col-span-3">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={() => {
                                    setLinkTarget({ type: "theme", id: tid, name: t.name });
                                    setOpenLinkModal(true);
                                  }}
                                  className="inline-flex items-center justify-center w-8 h-8 rounded hover:bg-gray-100"
                                  title="Manage indicators"
                                >
                                  <BarChart2 className="w-4 h-4" style={{ color: "var(--gsc-green)" }} />
                                </button>
                                <button
                                  onClick={() => setEditTheme(t)}
                                  className="inline-flex items-center justify-center w-8 h-8 rounded hover:bg-gray-100"
                                  title="Edit theme"
                                >
                                  <Edit2 className="w-4 h-4" style={{ color: "var(--gsc-blue)" }} />
                                </button>
                                <button
                                  onClick={() => deleteTheme(t)}
                                  className="inline-flex items-center justify-center w-8 h-8 rounded hover:bg-gray-100"
                                  title="Delete theme"
                                >
                                  <Trash2 className="w-4 h-4" style={{ color: "var(--gsc-red)" }} />
                                </button>
                                <button
                                  onClick={() => setAddSubFor(t)}
                                  className="inline-flex items-center justify-center px-2 h-8 rounded border hover:bg-gray-50 text-xs"
                                  title="Add subtheme"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                  <span className="ml-1">Subtheme</span>
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Subthemes */}
                          {isOpen(tid) &&
                            sList.map((s) => {
                              const sid = s.id;
                              const sKey = `subtheme:${sid}`;
                              return (
                                <div key={sid} className="border-t">
                                  <div className="grid grid-cols-12 items-start text-sm px-16 py-2">
                                    <div className="col-span-4">
                                      <div className="font-medium" style={{ color: "var(--gsc-orange)" }}>
                                        {s.name}
                                      </div>
                                      {s.description && (
                                        <div className="text-xs text-gray-500">{s.description}</div>
                                      )}
                                    </div>
                                    <div className="col-span-5">
                                      <IndicatorChips items={links[sKey]} />
                                    </div>
                                    <div className="col-span-3">
                                      <div className="flex items-center justify-end gap-1">
                                        <button
                                          onClick={() => {
                                            setLinkTarget({
                                              type: "subtheme",
                                              id: sid,
                                              name: s.name,
                                            });
                                            setOpenLinkModal(true);
                                          }}
                                          className="inline-flex items-center justify-center w-8 h-8 rounded hover:bg-gray-100"
                                          title="Manage indicators"
                                        >
                                          <BarChart2
                                            className="w-4 h-4"
                                            style={{ color: "var(--gsc-green)" }}
                                          />
                                        </button>
                                        <button
                                          onClick={() => setEditSub(s)}
                                          className="inline-flex items-center justify-center w-8 h-8 rounded hover:bg-gray-100"
                                          title="Edit subtheme"
                                        >
                                          <Edit2 className="w-4 h-4" style={{ color: "var(--gsc-blue)" }} />
                                        </button>
                                        <button
                                          onClick={() => deleteSubtheme(s)}
                                          className="inline-flex items-center justify-center w-8 h-8 rounded hover:bg-gray-100"
                                          title="Delete subtheme"
                                        >
                                          <Trash2 className="w-4 h-4" style={{ color: "var(--gsc-red)" }} />
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      );
                    })}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Pillar Modals */}
      {openAddPillar && (
        <AddPillarModal
          open={openAddPillar}
          onClose={() => setOpenAddPillar(false)}
          onSaved={loadTree}
        />
      )}
      {editPillar && (
        <EditPillarModal
          open={!!editPillar}
          onClose={() => setEditPillar(null)}
          onSaved={loadTree}
          pillar={editPillar}
        />
      )}

      {/* Theme Modals */}
      {addThemeFor && (
        <AddThemeModal
          open={!!addThemeFor}
          onClose={() => setAddThemeFor(null)}
          onSaved={loadTree}
          pillar={addThemeFor}
        />
      )}
      {editTheme && (
        <EditThemeModal
          open={!!editTheme}
          onClose={() => setEditTheme(null)}
          onSaved={loadTree}
          theme={editTheme}
        />
      )}

      {/* Subtheme Modals */}
      {addSubFor && (
        <AddSubthemeModal
          open={!!addSubFor}
          onClose={() => setAddSubFor(null)}
          onSaved={loadTree}
          theme={addSubFor}
        />
      )}
      {editSub && (
        <EditSubthemeModal
          open={!!editSub}
          onClose={() => setEditSub(null)}
          onSaved={loadTree}
          subtheme={editSub}
        />
      )}

      {/* Indicator Link Modal */}
      {openLinkModal && linkTarget && (
        <IndicatorLinkModal
          open={openLinkModal}
          onClose={() => setOpenLinkModal(false)}
          onSaved={loadTree}
          entity={linkTarget}
        />
      )}
    </div>
  );
}

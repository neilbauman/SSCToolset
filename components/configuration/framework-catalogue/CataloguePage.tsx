"use client";
import { useEffect, useMemo, useState } from "react";
import { Plus, Edit2, Trash2, ArrowUp, ArrowDown, Loader2, RefreshCcw, Save } from "lucide-react";
import {
  listCatalogueTree, createPillar, updatePillar, deletePillar,
  createTheme, updateTheme, deleteTheme,
  createSubtheme, updateSubtheme, deleteSubtheme,
  setPillarOrder, setThemeOrder, setSubthemeOrder
} from "@/lib/services/frameworkCatalogue";
import AddPillarModal from "./AddPillarModal";
import EditPillarModal from "./EditPillarModal";
import AddThemeModal from "./AddThemeModal";
import EditThemeModal from "./EditThemeModal";
import AddSubthemeModal from "./AddSubthemeModal";
import EditSubthemeModal from "./EditSubthemeModal";

/* ---------- Type Definitions (exported for modals) ---------- */
export type Pillar = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  sort_order: number | null;
  themes?: Theme[];
};
export type Theme = {
  id: string;
  pillar_id: string;
  code: string;
  name: string;
  description: string | null;
  sort_order: number | null;
  subthemes?: Subtheme[];
};
export type Subtheme = {
  id: string;
  theme_id: string;
  code: string;
  name: string;
  description: string | null;
  sort_order: number | null;
};
/* ------------------------------------------------------------ */

export default function CataloguePage() {
  const [pillars, setPillars] = useState<Pillar[]>([]);
  const [expandedPillars, setExpandedPillars] = useState<Record<string, boolean>>({});
  const [expandedThemes, setExpandedThemes] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [dirtyOrder, setDirtyOrder] = useState(false);

  // Modals
  const [showAddPillar, setShowAddPillar] = useState(false);
  const [editPillar, setEditPillar] = useState<Pillar | null>(null);
  const [addThemeParent, setAddThemeParent] = useState<Pillar | null>(null);
  const [editTheme, setEditTheme] = useState<Theme | null>(null);
  const [addSubthemeParent, setAddSubthemeParent] = useState<Theme | null>(null);
  const [editSubtheme, setEditSubtheme] = useState<Subtheme | null>(null);

  /* ---------- Load Tree ---------- */
  useEffect(() => { loadTree(); }, []);
  async function loadTree() {
    setLoading(true);
    const data = await listCatalogueTree();
    setPillars(data);
    setExpandedPillars({});
    setExpandedThemes({});
    setDirtyOrder(false);
    setLoading(false);
  }

  /* ---------- Helpers ---------- */
  const toggle = (id: string, fn: any) => fn((p: any) => ({ ...p, [id]: !p[id] }));
  const move = (arr: any[], i: number, j: number) => { if (i < 0 || j < 0 || j >= arr.length) return arr; [arr[i], arr[j]] = [arr[j], arr[i]]; return arr; };

  const movePillar = (id: string, dir: "up" | "down") => setPillars(p => { const a = [...p]; const i = a.findIndex(x => x.id === id); return move(a, i, dir === "up" ? i - 1 : i + 1); });
  const moveTheme = (pid: string, id: string, dir: "up" | "down") => setPillars(p => p.map(pp => pp.id !== pid ? pp : { ...pp, themes: move([...pp.themes!], pp.themes!.findIndex(t => t.id === id), dir === "up" ? -1 : +1) }));
  const moveSubtheme = (tid: string, id: string, dir: "up" | "down") => setPillars(p => p.map(pp => ({ ...pp, themes: pp.themes?.map(t => t.id !== tid ? t : { ...t, subthemes: move([...t.subthemes!], t.subthemes!.findIndex(s => s.id === id), dir === "up" ? -1 : +1) }) })));

  async function saveOrder() {
    await setPillarOrder(pillars.map((p, i) => ({ id: p.id, sort_order: i })));
    for (const p of pillars) {
      await setThemeOrder(p.id, (p.themes || []).map((t, i) => ({ id: t.id, sort_order: i })));
      for (const t of p.themes || [])
        await setSubthemeOrder(t.id, (t.subthemes || []).map((s, i) => ({ id: s.id, sort_order: i })));
    }
    loadTree();
  }

  const confirmDelete = async (msg: string, fn: (id: string) => Promise<any>, id: string) => {
    if (confirm(msg)) { await fn(id); loadTree(); }
  };

  const hasData = useMemo(() => (pillars || []).length > 0, [pillars]);

  /* ---------- UI ---------- */
  return (
    <div>
      <div className="flex justify-between mb-3">
        <h2 className="text-lg font-semibold text-[var(--gsc-blue)]">Catalogue</h2>
        <div className="flex gap-2">
          <button onClick={loadTree} className="px-3 py-2 text-sm border rounded-md flex items-center gap-1">
            <RefreshCcw className="w-4 h-4" /> Reload
          </button>
          <button onClick={() => setShowAddPillar(true)} className="px-3 py-2 text-sm rounded-md flex items-center gap-1 text-white" style={{ background: "var(--gsc-blue)" }}>
            <Plus className="w-4 h-4" /> Add Pillar
          </button>
          {dirtyOrder && (
            <button onClick={saveOrder} className="px-3 py-2 text-sm rounded-md border flex items-center gap-1 text-[var(--gsc-blue)] border-[var(--gsc-blue)]">
              <Save className="w-4 h-4" /> Save Order
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-12 bg-[var(--gsc-beige)] border text-sm font-medium text-[var(--gsc-gray)]">
        <div className="col-span-3 p-2">Type / Code</div>
        <div className="col-span-7 p-2">Name / Description</div>
        <div className="col-span-2 p-2 text-right">Actions</div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-gray-500 text-sm mt-3">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading catalogue…
        </div>
      ) : !hasData ? (
        <p className="text-sm text-gray-500 italic mt-3">No pillars yet.</p>
      ) : (
        <div className="divide-y">
          {pillars.map((p, pi) => (
            <div key={p.id}>
              {/* ---- PILLAR ---- */}
              <div className="grid grid-cols-12 text-sm">
                <div className="col-span-3 flex items-center gap-2 p-2">
                  <button onClick={() => toggle(p.id, setExpandedPillars)}>
                    {expandedPillars[p.id] ? <ArrowDown className="w-4 h-4" /> : <ArrowUp className="w-4 h-4 rotate-180" />}
                  </button>
                  <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">pillar</span>
                  <span className="text-xs text-gray-500">{p.code}</span>
                </div>
                <div className="col-span-7 p-2">
                  <div className="font-medium">{p.name}</div>
                  {p.description && <div className="text-xs text-gray-500">{p.description}</div>}
                </div>
                <div className="col-span-2 p-2 flex justify-end gap-1">
                  <button onClick={() => movePillar(p.id, "up")} disabled={pi === 0}>
                    <ArrowUp className={`w-4 h-4 ${pi ? "text-gray-600" : "text-gray-300"}`} />
                  </button>
                  <button onClick={() => movePillar(p.id, "down")} disabled={pi === pillars.length - 1}>
                    <ArrowDown className={`w-4 h-4 ${pi === pillars.length - 1 ? "text-gray-300" : "text-gray-600"}`} />
                  </button>
                  <button onClick={() => setEditPillar(p)}>
                    <Edit2 className="w-4 h-4 text-[var(--gsc-blue)]" />
                  </button>
                  <button onClick={() => confirmDelete(`Delete pillar "${p.name}"?`, deletePillar, p.id)}>
                    <Trash2 className="w-4 h-4 text-[var(--gsc-red)]" />
                  </button>
                  <button onClick={() => setAddThemeParent(p)}>
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* ---- THEMES ---- */}
              {expandedPillars[p.id] &&
                (p.themes || []).map((t, ti) => (
                  <div key={t.id} className="grid grid-cols-12 text-sm border-t" style={{ paddingLeft: 24 }}>
                    <div className="col-span-3 flex items-center gap-2 p-2">
                      <button onClick={() => toggle(t.id, setExpandedThemes)}>
                        {expandedThemes[t.id] ? <ArrowDown className="w-4 h-4" /> : <ArrowUp className="w-4 h-4 rotate-180" />}
                      </button>
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">theme</span>
                      <span className="text-xs text-gray-500">{t.code}</span>
                    </div>
                    <div className="col-span-7 p-2">
                      <div className="font-medium">{t.name}</div>
                      {t.description && <div className="text-xs text-gray-500">{t.description}</div>}
                    </div>
                    <div className="col-span-2 p-2 flex justify-end gap-1">
                      <button onClick={() => moveTheme(p.id, t.id, "up")} disabled={!ti}>
                        <ArrowUp className={`w-4 h-4 ${ti ? "text-gray-600" : "text-gray-300"}`} />
                      </button>
                      <button onClick={() => moveTheme(p.id, t.id, "down")} disabled={ti === (p.themes!.length - 1)}>
                        <ArrowDown className={`w-4 h-4 ${ti === (p.themes!.length - 1) ? "text-gray-300" : "text-gray-600"}`} />
                      </button>
                      <button onClick={() => setEditTheme(t)}>
                        <Edit2 className="w-4 h-4 text-[var(--gsc-blue)]" />
                      </button>
                      <button onClick={() => confirmDelete(`Delete theme "${t.name}"?`, deleteTheme, t.id)}>
                        <Trash2 className="w-4 h-4 text-[var(--gsc-red)]" />
                      </button>
                      <button onClick={() => setAddSubthemeParent(t)}>
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>

                    {/* ---- SUBTHEMES ---- */}
                    {expandedThemes[t.id] &&
                      (t.subthemes || []).map((s, si) => (
                        <div key={s.id} className="col-span-12 grid grid-cols-12 text-sm border-t" style={{ paddingLeft: 48 }}>
                          <div className="col-span-3 flex items-center gap-2 p-2">
                            <span className="px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-700">subtheme</span>
                            <span className="text-xs text-gray-500">{s.code}</span>
                          </div>
                          <div className="col-span-7 p-2">
                            <div className="font-medium">{s.name}</div>
                            {s.description && <div className="text-xs text-gray-500">{s.description}</div>}
                          </div>
                          <div className="col-span-2 p-2 flex justify-end gap-1">
                            <button onClick={() => moveSubtheme(t.id, s.id, "up")} disabled={!si}>
                              <ArrowUp className={`w-4 h-4 ${si ? "text-gray-600" : "text-gray-300"}`} />
                            </button>
                            <button onClick={() => moveSubtheme(t.id, s.id, "down")} disabled={si === (t.subthemes!.length - 1)}>
                              <ArrowDown className={`w-4 h-4 ${si === (t.subthemes!.length - 1) ? "text-gray-300" : "text-gray-600"}`} />
                            </button>
                            <button onClick={() => setEditSubtheme(s)}>
                              <Edit2 className="w-4 h-4 text-[var(--gsc-blue)]" />
                            </button>
                            <button onClick={() => confirmDelete(`Delete subtheme "${s.name}"?`, deleteSubtheme, s.id)}>
                              <Trash2 className="w-4 h-4 text-[var(--gsc-red)]" />
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                ))}
            </div>
          ))}
        </div>
      )}

      {/* ---- Modals ---- */}
      {showAddPillar && <AddPillarModal open onClose={() => setShowAddPillar(false)} onSaved={loadTree} />}
      {editPillar && <EditPillarModal open pillar={editPillar} onClose={() => setEditPillar(null)} onSaved={loadTree} />}
      {addThemeParent && <AddThemeModal open pillar={addThemeParent} onClose={() => setAddThemeParent(null)} onSaved={loadTree} />}
      {editTheme && <EditThemeModal open theme={editTheme} onClose={() => setEditTheme(null)} onSaved={loadTree} />}
      {addSubthemeParent && <AddSubthemeModal open theme={addSubthemeParent} onClose={() => setAddSubthemeParent(null)} onSaved={loadTree} />}
      {editSubtheme && <EditSubthemeModal open subtheme={editSubtheme} onClose={() => setEditSubtheme(null)} onSaved={loadTree} />}
    </div>
  );
}

"use client";
import { useEffect, useMemo, useState } from "react";
import { Plus, Edit2, Trash2, ArrowUp, ArrowDown, Loader2, RefreshCcw, Save } from "lucide-react";
import {
  listCatalogueTree, createPillar, updatePillar, deletePillar,
  createTheme, updateTheme, deleteTheme,
  createSubtheme, updateSubtheme, deleteSubtheme,
  setPillarOrder, setThemeOrder, setSubthemeOrder
} from "@/lib/services/frameworkCatalogue";
import AddPillarModal from "./AddPillarModal"; import EditPillarModal from "./EditPillarModal";
import AddThemeModal from "./AddThemeModal"; import EditThemeModal from "./EditThemeModal";
import AddSubthemeModal from "./AddSubthemeModal"; import EditSubthemeModal from "./EditSubthemeModal";

export default function CataloguePage() {
  const [pillars, setPillars] = useState<any[]>([]), [expandedPillars, setEP] = useState({}),
    [expandedThemes, setET] = useState({}), [loading, setL] = useState(true),
    [dirty, setD] = useState(false),
    [addP, setAddP] = useState(false), [editP, setEditP] = useState(null),
    [addT, setAddT] = useState(null), [editT, setEditT] = useState(null),
    [addS, setAddS] = useState(null), [editS, setEditS] = useState(null);

  useEffect(() => { load(); }, []);
  async function load() { setL(true); setPillars(await listCatalogueTree()); setEP({}); setET({}); setD(false); setL(false); }
  const toggle = (id: string, fn: any) => fn((p: any) => ({ ...p, [id]: !p[id] }));
  const move = (arr: any[], i: number, j: number) => { if (i < 0 || j < 0 || j >= arr.length) return arr; [arr[i], arr[j]] = [arr[j], arr[i]]; return arr; };
  const mp = (id: string, d: "up" | "down") => setPillars(p => { const a = [...p]; const i = a.findIndex(x => x.id === id); return move(a, i, d === "up" ? i - 1 : i + 1); });
  const mt = (pid: string, id: string, d: "up" | "down") => setPillars(p => p.map(pp => pp.id !== pid ? pp : { ...pp, themes: move([...pp.themes], pp.themes.findIndex((x: any) => x.id === id), d === "up" ? -1 : +1) }));
  const ms = (tid: string, id: string, d: "up" | "down") => setPillars(p => p.map(pp => ({ ...pp, themes: pp.themes.map((t: any) => t.id !== tid ? t : { ...t, subthemes: move([...t.subthemes], t.subthemes.findIndex((x: any) => x.id === id), d === "up" ? -1 : +1) }) })));
  async function saveOrder() {
    await setPillarOrder(pillars.map((p, i) => ({ id: p.id, sort_order: i })));
    for (const p of pillars) { await setThemeOrder(p.id, (p.themes || []).map((t: any, i: number) => ({ id: t.id, sort_order: i })));
      for (const t of p.themes || []) await setSubthemeOrder(t.id, (t.subthemes || []).map((s: any, i: number) => ({ id: s.id, sort_order: i }))); }
    load();
  }

  const delConfirm = async (msg: string, fn: Function, id: string) => { if (confirm(msg)) { await fn(id); load(); } };
  const has = useMemo(() => (pillars || []).length > 0, [pillars]);

  return (
    <div>
      <div className="flex justify-between mb-3">
        <h2 className="text-lg font-semibold text-[var(--gsc-blue)]">Catalogue</h2>
        <div className="flex gap-2">
          <button onClick={load} className="px-3 py-2 text-sm border rounded-md flex items-center gap-1"><RefreshCcw className="w-4 h-4" />Reload</button>
          <button onClick={() => setAddP(true)} className="px-3 py-2 text-sm rounded-md flex items-center gap-1 text-white" style={{ background: "var(--gsc-blue)" }}><Plus className="w-4 h-4" />Add Pillar</button>
          {dirty && <button onClick={saveOrder} className="px-3 py-2 text-sm rounded-md border flex items-center gap-1 text-[var(--gsc-blue)] border-[var(--gsc-blue)]"><Save className="w-4 h-4" />Save Order</button>}
        </div>
      </div>

      <div className="grid grid-cols-12 bg-[var(--gsc-beige)] border text-sm font-medium text-[var(--gsc-gray)]">
        <div className="col-span-3 p-2">Type / Code</div><div className="col-span-7 p-2">Name / Description</div><div className="col-span-2 p-2 text-right">Actions</div>
      </div>

      {loading ? <div className="flex items-center gap-2 text-gray-500 text-sm mt-3"><Loader2 className="w-4 h-4 animate-spin" />Loading…</div> :
        !has ? <p className="text-sm text-gray-500 italic mt-3">No pillars yet.</p> :
          <div className="divide-y">
            {pillars.map((p, pi) => (
              <div key={p.id}>
                <div className="grid grid-cols-12 text-sm">
                  <div className="col-span-3 flex items-center gap-2 p-2">
                    <button onClick={() => toggle(p.id, setEP)}>{expandedPillars[p.id] ? <ArrowDown className="w-4 h-4" /> : <ArrowUp className="w-4 h-4 rotate-180" />}</button>
                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700">pillar</span>
                    <span className="text-xs text-gray-500">{p.code}</span>
                  </div>
                  <div className="col-span-7 p-2"><div className="font-medium">{p.name}</div>{p.description && <div className="text-xs text-gray-500">{p.description}</div>}</div>
                  <div className="col-span-2 p-2 flex justify-end gap-1">
                    <button onClick={() => mp(p.id, "up")} disabled={pi === 0}><ArrowUp className={`w-4 h-4 ${pi ? "text-gray-600" : "text-gray-300"}`} /></button>
                    <button onClick={() => mp(p.id, "down")} disabled={pi === pillars.length - 1}><ArrowDown className={`w-4 h-4 ${pi === pillars.length - 1 ? "text-gray-300" : "text-gray-600"}`} /></button>
                    <button onClick={() => setEditP(p)}><Edit2 className="w-4 h-4 text-[var(--gsc-blue)]" /></button>
                    <button onClick={() => delConfirm(`Delete pillar ${p.name}?`, deletePillar, p.id)}><Trash2 className="w-4 h-4 text-[var(--gsc-red)]" /></button>
                    <button onClick={() => setAddT(p)}><Plus className="w-4 h-4" /></button>
                  </div>
                </div>

                {expandedPillars[p.id] && (p.themes || []).map((t: any, ti: number) => (
                  <div key={t.id} className="grid grid-cols-12 text-sm border-t" style={{ paddingLeft: 24 }}>
                    <div className="col-span-3 flex items-center gap-2 p-2">
                      <button onClick={() => toggle(t.id, setET)}>{expandedThemes[t.id] ? <ArrowDown className="w-4 h-4" /> : <ArrowUp className="w-4 h-4 rotate-180" />}</button>
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">theme</span>
                      <span className="text-xs text-gray-500">{t.code}</span>
                    </div>
                    <div className="col-span-7 p-2"><div className="font-medium">{t.name}</div>{t.description && <div className="text-xs text-gray-500">{t.description}</div>}</div>
                    <div className="col-span-2 p-2 flex justify-end gap-1">
                      <button onClick={() => mt(p.id, t.id, "up")} disabled={!ti}><ArrowUp className={`w-4 h-4 ${ti ? "text-gray-600" : "text-gray-300"}`} /></button>
                      <button onClick={() => mt(p.id, t.id, "down")} disabled={ti === (p.themes?.length - 1)}><ArrowDown className={`w-4 h-4 ${ti === (p.themes?.length - 1) ? "text-gray-300" : "text-gray-600"}`} /></button>
                      <button onClick={() => setEditT(t)}><Edit2 className="w-4 h-4 text-[var(--gsc-blue)]" /></button>
                      <button onClick={() => delConfirm(`Delete theme ${t.name}?`, deleteTheme, t.id)}><Trash2 className="w-4 h-4 text-[var(--gsc-red)]" /></button>
                      <button onClick={() => setAddS(t)}><Plus className="w-4 h-4" /></button>
                    </div>

                    {expandedThemes[t.id] && (t.subthemes || []).map((s: any, si: number) => (
                      <div key={s.id} className="col-span-12 grid grid-cols-12 text-sm border-t" style={{ paddingLeft: 48 }}>
                        <div className="col-span-3 flex items-center gap-2 p-2"><span className="px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-700">subtheme</span><span className="text-xs text-gray-500">{s.code}</span></div>
                        <div className="col-span-7 p-2"><div className="font-medium">{s.name}</div>{s.description && <div className="text-xs text-gray-500">{s.description}</div>}</div>
                        <div className="col-span-2 p-2 flex justify-end gap-1">
                          <button onClick={() => ms(t.id, s.id, "up")} disabled={!si}><ArrowUp className={`w-4 h-4 ${si ? "text-gray-600" : "text-gray-300"}`} /></button>
                          <button onClick={() => ms(t.id, s.id, "down")} disabled={si === (t.subthemes?.length - 1)}><ArrowDown className={`w-4 h-4 ${si === (t.subthemes?.length - 1) ? "text-gray-300" : "text-gray-600"}`} /></button>
                          <button onClick={() => setEditS(s)}><Edit2 className="w-4 h-4 text-[var(--gsc-blue)]" /></button>
                          <button onClick={() => delConfirm(`Delete subtheme ${s.name}?`, deleteSubtheme, s.id)}><Trash2 className="w-4 h-4 text-[var(--gsc-red)]" /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ))}
          </div>}

      {addP && <AddPillarModal open={addP} onClose={() => setAddP(false)} onSaved={load} />}
      {editP && <EditPillarModal open={!!editP} pillar={editP} onClose={() => setEditP(null)} onSaved={load} />}
      {addT && <AddThemeModal open={!!addT} pillar={addT} onClose={() => setAddT(null)} onSaved={load} />}
      {editT && <EditThemeModal open={!!editT} theme={editT} onClose={() => setEditT(null)} onSaved={load} />}
      {addS && <AddSubthemeModal open={!!addS} theme={addS} onClose={() => setAddS(null)} onSaved={load} />}
      {editS && <EditSubthemeModal open={!!editS} subtheme={editS} onClose={() => setEditS(null)} onSaved={load} />}
    </div>
  );
}

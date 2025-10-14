"use client";
import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import AddPillarModal from "./AddPillarModal";
import EditPillarModal from "./EditPillarModal";
import AddThemeModal from "./AddThemeModal";
import EditThemeModal from "./EditThemeModal";
import AddSubthemeModal from "./AddSubthemeModal";
import EditSubthemeModal from "./EditSubthemeModal";
import IndicatorLinkModal from "./IndicatorLinkModal";
import { Plus, Edit2, Trash2, Loader2, ChevronRight, ChevronDown, BarChart2 } from "lucide-react";

type Pillar = { id: string; name: string; description: string | null };
type Theme = { id: string; pillar_id: string | null; name: string; description: string | null };
type Subtheme = { id: string; theme_id: string | null; name: string; description: string | null };
type Indicator = { id: string; code: string; name: string };
type LinkRow = { id: string; pillar_id: string | null; theme_id: string | null; subtheme_id: string | null; indicator_catalogue: Indicator | null };
type MapT<T> = Record<string, T[]>;

export default function CataloguePage() {
  const [pillars, setPillars] = useState<Pillar[]>([]);
  const [themesByPillar, setThemesByPillar] = useState<MapT<Theme>>({});
  const [subsByTheme, setSubsByTheme] = useState<MapT<Subtheme>>({});
  const [links, setLinks] = useState<Record<string, Indicator[]>>({});
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [openAddPillar, setOpenAddPillar] = useState(false);
  const [editPillar, setEditPillar] = useState<Pillar | null>(null);
  const [addThemeFor, setAddThemeFor] = useState<Pillar | null>(null);
  const [editTheme, setEditTheme] = useState<Theme | null>(null);
  const [addSubFor, setAddSubFor] = useState<Theme | null>(null);
  const [editSub, setEditSub] = useState<Subtheme | null>(null);
  const [openLinkModal, setOpenLinkModal] = useState(false);
  const [linkTarget, setLinkTarget] = useState<{ type: "pillar" | "theme" | "subtheme"; id: string; name: string } | null>(null);

  useEffect(() => { load(); }, []);
  async function load() {
    setLoading(true);
    const [p, t, s, l] = await Promise.all([
      supabase.from("pillar_catalogue").select("id,name,description").order("name"),
      supabase.from("theme_catalogue").select("id,pillar_id,name,description").order("pillar_id").order("name"),
      supabase.from("subtheme_catalogue").select("id,theme_id,name,description").order("theme_id").order("name"),
      supabase.from("catalogue_indicator_links").select("id,pillar_id,theme_id,subtheme_id,indicator_catalogue(id,code,name)")
    ]);
    const pillars = p.data || [], themes = t.data || [], subs = s.data || [];
    const linksRaw: LinkRow[] = (l.data || []).map((r: any) => ({ ...r, indicator_catalogue: Array.isArray(r.indicator_catalogue) ? r.indicator_catalogue[0] : r.indicator_catalogue }));
    const tm: MapT<Theme> = {}, sm: MapT<Subtheme> = {}, lm: Record<string, Indicator[]> = {};
    themes.forEach(v => { (tm[v.pillar_id || "_"] ||= []).push(v); });
    subs.forEach(v => { (sm[v.theme_id || "_"] ||= []).push(v); });
    linksRaw.forEach(v => {
      const k = v.pillar_id ? `pillar:${v.pillar_id}` : v.theme_id ? `theme:${v.theme_id}` : v.subtheme_id ? `subtheme:${v.subtheme_id}` : null;
      if (!k || !v.indicator_catalogue) return; (lm[k] ||= []).push(v.indicator_catalogue);
    });
    setPillars(pillars); setThemesByPillar(tm); setSubsByTheme(sm); setLinks(lm); setLoading(false);
  }

  const toggle = (id: string) => setExpanded(e => { const n = new Set(e); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const isOpen = (id: string) => expanded.has(id);
  const hasData = useMemo(() => pillars.length > 0, [pillars]);
  const del = async (tbl: string, id: string) => { if (confirm("Delete item?")) { await supabase.from(tbl).delete().eq("id", id); load(); } };
  const Chips = ({ a }: { a?: Indicator[] }) => !a?.length ? <span className="text-xs text-gray-400">—</span> :
    <div className="flex flex-wrap gap-1">{a.sort((x, y) => x.name.localeCompare(y.name)).map(i =>
      <span key={i.id} className="text-[11px] px-2 py-[2px] rounded-full border" style={{ borderColor: "var(--gsc-light-gray)", color: "var(--gsc-gray)" }}>{i.name}</span>)}</div>;

  return (
    <div>
      <div className="flex justify-between mb-3"><h2 className="text-lg font-semibold" style={{ color: "var(--gsc-blue)" }}>Framework Catalogue</h2>
        <button onClick={() => setOpenAddPillar(true)} className="px-3 py-2 text-sm rounded-md" style={{ background: "var(--gsc-blue)", color: "white" }}><Plus className="w-4 h-4 inline mr-1" />Add Pillar</button></div>
      {loading ? <p className="text-sm text-gray-500"><Loader2 className="w-4 h-4 animate-spin inline mr-1" />Loading…</p> :
        !hasData ? <p className="text-sm text-gray-500 italic">No catalogue items.</p> :
          <div className="border rounded-md bg-white">
            <div className="grid grid-cols-12 text-sm font-medium border-b bg-[var(--gsc-beige)] text-[var(--gsc-gray)]"><div className="col-span-4 px-2 py-2">Entity</div><div className="col-span-5 py-2">Indicators</div><div className="col-span-3 py-2 text-right">Actions</div></div>
            {pillars.map(p => <div key={p.id} className="border-b">
              <div className="grid grid-cols-12 items-start text-sm px-2 py-2">
                <div className="col-span-4 flex gap-2">
                  <button onClick={() => toggle(p.id)}>{isOpen(p.id) ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}</button>
                  <div><div className="font-medium text-[var(--gsc-blue)]">{p.name}</div><div className="text-xs text-gray-500">{p.description}</div></div>
                </div>
                <div className="col-span-5"><Chips a={links[`pillar:${p.id}`]} /></div>
                <div className="col-span-3 flex justify-end gap-1">
                  <button onClick={() => { setLinkTarget({ type: "pillar", id: p.id, name: p.name }); setOpenLinkModal(true); }} title="Indicators"><BarChart2 className="w-4 h-4 text-[var(--gsc-green)]" /></button>
                  <button onClick={() => setEditPillar(p)}><Edit2 className="w-4 h-4 text-[var(--gsc-blue)]" /></button>
                  <button onClick={() => del("pillar_catalogue", p.id)}><Trash2 className="w-4 h-4 text-[var(--gsc-red)]" /></button>
                  <button onClick={() => setAddThemeFor(p)} className="px-2 border rounded text-xs"><Plus className="w-3 h-3 inline" /> Theme</button>
                </div>
              </div>
              {isOpen(p.id) && (themesByPillar[p.id] || []).map(t => <div key={t.id} className="border-t">
                <div className="grid grid-cols-12 items-start text-sm px-8 py-2">
                  <div className="col-span-4 flex gap-2">
                    <button onClick={() => toggle(t.id)}>{isOpen(t.id) ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}</button>
                    <div><div className="font-medium text-[var(--gsc-green)]">{t.name}</div><div className="text-xs text-gray-500">{t.description}</div></div>
                  </div>
                  <div className="col-span-5"><Chips a={links[`theme:${t.id}`]} /></div>
                  <div className="col-span-3 flex justify-end gap-1">
                    <button onClick={() => { setLinkTarget({ type: "theme", id: t.id, name: t.name }); setOpenLinkModal(true); }}><BarChart2 className="w-4 h-4 text-[var(--gsc-green)]" /></button>
                    <button onClick={() => setEditTheme(t)}><Edit2 className="w-4 h-4 text-[var(--gsc-blue)]" /></button>
                    <button onClick={() => del("theme_catalogue", t.id)}><Trash2 className="w-4 h-4 text-[var(--gsc-red)]" /></button>
                    <button onClick={() => setAddSubFor(t)} className="px-2 border rounded text-xs"><Plus className="w-3 h-3 inline" /> Sub</button>
                  </div>
                </div>
                {isOpen(t.id) && (subsByTheme[t.id] || []).map(s => <div key={s.id} className="grid grid-cols-12 px-16 py-2 border-t text-sm">
                  <div className="col-span-4 text-[var(--gsc-orange)]">{s.name}</div>
                  <div className="col-span-5"><Chips a={links[`subtheme:${s.id}`]} /></div>
                  <div className="col-span-3 flex justify-end gap-1">
                    <button onClick={() => { setLinkTarget({ type: "subtheme", id: s.id, name: s.name }); setOpenLinkModal(true); }}><BarChart2 className="w-4 h-4 text-[var(--gsc-green)]" /></button>
                    <button onClick={() => setEditSub(s)}><Edit2 className="w-4 h-4 text-[var(--gsc-blue)]" /></button>
                    <button onClick={() => del("subtheme_catalogue", s.id)}><Trash2 className="w-4 h-4 text-[var(--gsc-red)]" /></button>
                  </div></div>)}
              </div>)}
            </div>)}
          </div>}
      {openAddPillar && <AddPillarModal open onClose={() => setOpenAddPillar(false)} onSaved={load} />}
      {editPillar && <EditPillarModal open pillar={editPillar} onClose={() => setEditPillar(null)} onSaved={load} />}
      {addThemeFor && <AddThemeModal open pillar={addThemeFor} onClose={() => setAddThemeFor(null)} onSaved={load} />}
      {editTheme && <EditThemeModal open theme={editTheme} onClose={() => setEditTheme(null)} onSaved={load} />}
      {addSubFor && <AddSubthemeModal open theme={addSubFor} onClose={() => setAddSubFor(null)} onSaved={load} />}
      {editSub && <EditSubthemeModal open subtheme={editSub} onClose={() => setEditSub(null)} onSaved={load} />}
      {openLinkModal && linkTarget && <IndicatorLinkModal open onClose={() => setOpenLinkModal(false)} entity={linkTarget} onSaved={load} />}
    </div>
  );
}

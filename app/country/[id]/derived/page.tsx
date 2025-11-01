"use client";
import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { Eye, Edit3, Trash2, Plus, RefreshCw, ChevronUp, ChevronDown, Database, Loader2, Info } from "lucide-react";
import DerivedDatasetWizard from "@/components/country/wizard";
import type { CountryParams } from "@/app/country/types";

export default function DerivedDatasetsPage({ params }: { params: CountryParams }) {
  const countryIso = params.id;
  const [datasets, setDatasets] = useState<any[]>([]);
  const [sortField, setSortField] = useState("created_at");
  const [sortAsc, setSortAsc] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState<any | null>(null);
  const [unified, setUnified] = useState<any | null>(null);
  const [preview, setPreview] = useState<any[]>([]);
  const [loadingPrev, setLoadingPrev] = useState(false);
  const [valCount, setValCount] = useState<number | null>(null);
  const [targCount, setTargCount] = useState<number | null>(null);
  const [wizard, setWizard] = useState(false);
  const [edit, setEdit] = useState<any | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function load() {
    const { data } = await supabase.from("derived_dataset_metadata").select("*").eq("country_iso", countryIso).order(sortField, { ascending: sortAsc });
    setDatasets(data || []);
  }
  useEffect(() => { load(); }, [sortField, sortAsc, countryIso]);

  const toggleSort = (f: string) => { sortField === f ? setSortAsc(!sortAsc) : (setSortField(f), setSortAsc(true)); };
  const fmt = (s: string) => (s ? new Date(s).toLocaleDateString() : "—");
  const badge = (u: any) => u?.data_type === "categorical" ? "Categorical" : u?.data_type === "percentage" ? "Percentage" : "Numeric";
  const fix = (m: any) => m?.storage_model === "fixed" ? "Fixed" : "Parametric";
  const level = (m: any) => m?.target_level || m?.admin_level || "—";
  const healthPct = useMemo(() => (!valCount || !targCount) ? null : Math.round((valCount / targCount) * 100), [valCount, targCount]);

  async function getUnified(id: string) {
    const { data } = await supabase.from("unified_datasets").select("*").eq("dataset_id", id).maybeSingle();
    setUnified(data || null);
  }
  async function getHealth(id: string) {
    const { count } = await supabase.from("unified_dataset_values_mat").select("admin_pcode", { count: "exact", head: true }).eq("dataset_id", id);
    setValCount(count || 0);
    const lvl = selected?.target_level || selected?.admin_level;
    if (!lvl) return setTargCount(null);
    const { count: t } = await supabase.from("admin_units").select("admin_pcode", { count: "exact", head: true }).eq("country_iso", countryIso).eq("admin_level", lvl);
    setTargCount(t || 0);
  }
  async function getPreview(id: string) {
    setLoadingPrev(true);
    const { data } = await supabase.rpc("get_dataset_values", { p_dataset_id: id });
    setPreview((data || []).slice(0, 300));
    setLoadingPrev(false);
  }
  const selectRow = async (m: any) => { setSelected(m); await getUnified(m.id); await getPreview(m.id); await getHealth(m.id); };

  const mat = async (m: any) => { setBusy(m.id); const { error } = await supabase.rpc("materialize_derived_dataset", { p_dataset_id: m.id }); setBusy(null); if (error) return alert(error.message); load(); if (selected?.id === m.id) getPreview(m.id); };
  const demat = async (m: any) => { if (!confirm(`Dematerialize "${m.title}"?`)) return; setBusy(m.id); const { error } = await supabase.rpc("dematerialize_derived_dataset", { p_dataset_id: m.id }); setBusy(null); if (error) return alert(error.message); load(); if (selected?.id === m.id) getPreview(m.id); };
  const del = async (m: any) => { if (!confirm(`Delete "${m.title}"?`)) return; await supabase.from("derived_dataset_metadata").delete().eq("id", m.id); load(); if (selected?.id === m.id) setSelected(null); };
  const refresh = async () => { setRefreshing(true); await load(); if (selected) { await getUnified(selected.id); await getPreview(selected.id); await getHealth(selected.id); } setRefreshing(false); };

  return (
    <SidebarLayout headerProps={{
      title: `${countryIso} – Derived Datasets`, group: "country-config",
      breadcrumbs: <Breadcrumbs items={[
        { label: "Dashboard", href: "/" },
        { label: "Country Configuration", href: "/country" },
        { label: countryIso, href: `/country/${countryIso}` },
        { label: "Derived Datasets", href: "#" }]} />
    }}>
      <div className="p-6 space-y-5">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold">Derived Datasets</h2>
          <div className="flex gap-2">
            <button onClick={refresh} className="flex items-center gap-1 px-3 py-1.5 text-sm rounded bg-[#640811] text-white hover:opacity-90">
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />Refresh</button>
            <button onClick={() => { setEdit(null); setWizard(true); }}
              className="flex items-center gap-1 px-3 py-1.5 text-sm rounded bg-[#640811] text-white hover:opacity-90">
              <Plus className="w-4 h-4" />New</button>
          </div>
        </div>

        <div className="bg-white border rounded-md shadow text-sm overflow-hidden">
          <table className="min-w-full border-collapse">
            <thead className="bg-gray-50 border-b">
              <tr>{[["title","Title"],["description","Description"],["admin_level","Admin"],["created_at","Created"]].map(([f,l])=>
                <th key={f} onClick={()=>toggleSort(f)} className="px-3 py-2 text-left cursor-pointer">
                  <div className="flex items-center gap-1">{l}{sortField===f&&(sortAsc?<ChevronUp className="w-3 h-3"/>:<ChevronDown className="w-3 h-3"/>)}</div></th>)}
                <th className="px-3 py-2">Type</th><th className="px-3 py-2">Fixed/Param</th><th className="px-3 py-2 text-right">Actions</th></tr>
            </thead>
            <tbody>
              {datasets.length===0?<tr><td colSpan={8} className="text-center py-3 text-gray-500 italic">No derived datasets found.</td></tr>:
                datasets.map((d)=>(<tr key={d.id} className={`border-b hover:bg-gray-50 ${selected?.id===d.id?"bg-rose-50/40":""}`}>
                  <td className="px-3 py-2 text-[#640811] font-medium"><button onClick={()=>selectRow(d)}>{d.title}</button></td>
                  <td className="px-3 py-2 text-gray-600 truncate max-w-[360px]">{d.description||"—"}</td>
                  <td className="px-3 py-2">{level(d)}</td><td className="px-3 py-2">{fmt(d.created_at)}</td>
                  <td className="px-3 py-2"><span className="border rounded-full px-2 py-0.5 text-[11px]">{badge(unified&&selected?.id===d.id?unified:null)}</span></td>
                  <td className="px-3 py-2"><span className={`rounded-full px-2 py-0.5 text-[11px] border ${d.storage_model==="fixed"?"border-green-300 text-green-700":"border-amber-300 text-amber-700"}`}>{fix(d)}</span></td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex gap-2 justify-end">
                      <button onClick={()=>selectRow(d)}><Eye className="w-4 h-4"/></button>
                      <button onClick={()=>{setEdit(d);setWizard(true);}}><Edit3 className="w-4 h-4"/></button>
                      {d.storage_model==="fixed"?
                        <button onClick={()=>demat(d)} disabled={busy===d.id}>{busy===d.id?<Loader2 className="w-4 h-4 animate-spin"/>:<Database className="w-4 h-4 rotate-180 text-red-600"/>}</button>:
                        <button onClick={()=>mat(d)} disabled={busy===d.id}>{busy===d.id?<Loader2 className="w-4 h-4 animate-spin"/>:<Database className="w-4 h-4 text-green-600"/>}</button>}
                      <button onClick={()=>del(d)} className="text-red-600 hover:text-red-800"><Trash2 className="w-4 h-4"/></button>
                    </div></td></tr>))}
            </tbody>
          </table>
        </div>

        {selected && (
          <div className="bg-white border rounded-md shadow">
            <div className="px-4 py-3 border-b flex justify-between items-start">
              <div><div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-[#640811]">{selected.title}</h3>
                <span className="border rounded-full px-2 py-0.5 text-[11px]">{badge(unified)}</span>
                <span className="border rounded-full px-2 py-0.5 text-[11px]">{fix(selected)}</span></div>
                <p className="text-xs text-gray-600 mt-1">{selected.description||"—"}</p></div>
              <div className="flex items-center gap-4 text-xs text-gray-600">
                <div className="flex items-center gap-1"><Info className="w-3.5 h-3.5"/>Admin: <b>{level(selected)}</b></div>
                <div className="flex items-center gap-1"><Info className="w-3.5 h-3.5"/>Rows: <b>{valCount??"—"}</b></div>
                <div className="flex items-center gap-1"><Info className="w-3.5 h-3.5"/>Coverage: <b>{healthPct!==null?`${healthPct}% (${valCount}/{targCount})`:"—"}</b></div>
              </div></div>
            <div className="p-4">
              <div className="max-h-[420px] overflow-auto border rounded">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0"><tr>
                    <th className="px-2 py-1 text-left">Admin</th><th className="px-2 py-1 text-left">Value</th>
                    <th className="px-2 py-1 text-left">Category</th><th className="px-2 py-1 text-left">Label</th><th className="px-2 py-1 text-left">Type</th>
                  </tr></thead>
                  <tbody>
                    {loadingPrev?<tr><td colSpan={5} className="py-6 text-center text-gray-500"><Loader2 className="inline w-4 h-4 animate-spin mr-2"/>Loading…</td></tr>:
                      preview.length===0?<tr><td colSpan={5} className="py-6 text-center italic text-gray-500">No data found.</td></tr>:
                      preview.map((r,i)=><tr key={i} className="border-t hover:bg-gray-50">
                        <td className="px-2 py-1">{r.admin_pcode}</td><td className="px-2 py-1">{r.value??"—"}</td>
                        <td className="px-2 py-1">{r.category_code??"—"}</td><td className="px-2 py-1">{r.category_label??"—"}</td><td className="px-2 py-1">{r.dataset_type}</td></tr>)}
                  </tbody></table></div>
              <p className="text-[11px] text-gray-500 mt-2">Preview shows up to 300 rows via get_dataset_values(uuid).</p>
            </div></div>
        )}

        {wizard && <DerivedDatasetWizard open={wizard} onClose={()=>{setWizard(false);load();}} countryIso={countryIso} editDataset={edit} />}
      </div>
    </SidebarLayout>
  );
}

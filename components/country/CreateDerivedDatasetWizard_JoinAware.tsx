"use client";
import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/supabaseBrowser";

export default function CreateDerivedDatasetWizard_JoinAware({ open, onClose, countryIso }) {
  const sb = supabaseBrowser;
  const [title, setTitle] = useState(""), [desc, setDesc] = useState(""), [targetLevel, setTargetLevel] = useState("ADM3");
  const [method, setMethod] = useState("ratio"), [decimals, setDecimals] = useState(0);
  const [includeCore, setIncludeCore] = useState(true), [includeOther, setIncludeOther] = useState(true), [includeDerived, setIncludeDerived] = useState(true), [includeGIS, setIncludeGIS] = useState(true);
  const [datasets, setDatasets] = useState([]), [datasetA, setDatasetA] = useState(null), [datasetB, setDatasetB] = useState(null);
  const [useScalarB, setUseScalarB] = useState(false), [scalarB, setScalarB] = useState(1);
  const [colA, setColA] = useState("population"), [colB, setColB] = useState("population");
  const [peekA, setPeekA] = useState([]), [peekB, setPeekB] = useState([]), [preview, setPreview] = useState([]);
  const [categories, setCategories] = useState({}), [taxonomy, setTaxonomy] = useState({}), [saving, setSaving] = useState(false);
  const detectNumKey = (r) => Object.keys(r).find(k => typeof r[k] === "number") || "value";
  useEffect(() => { if (!open) return; (async () => {
    const all = [];
    if (includeCore) all.push({ id: "core-admin", title: "Administrative Boundaries [Core]", table: "admin_units", type: "Core" }, { id: "core-pop", title: "Population Data [Core]", table: "population_data", type: "Core" });
    if (includeGIS) { const { data } = await sb.from("view_gis_status").select("dataset_id,title,admin_level,year").eq("country_iso", countryIso); data?.forEach(g => all.push({ id: g.dataset_id, title: g.title, table: `gis_dataset_${g.dataset_id}`, type: "GIS", admin_level: g.admin_level, year: g.year })); }
    if (includeOther) { const { data } = await sb.from("dataset_metadata").select("id,title,admin_level,year").eq("country_iso", countryIso); data?.forEach(d => all.push({ id: d.id, title: d.title, table: `dataset_${d.id}`, type: "Other", admin_level: d.admin_level, year: d.year })); }
    if (includeDerived) { const { data } = await sb.from("view_derived_dataset_summary").select("derived_dataset_id,derived_title,admin_level,year").eq("country_iso", countryIso); data?.forEach(d => all.push({ id: d.derived_dataset_id, title: d.derived_title, table: `derived_${d.derived_dataset_id}`, type: "Derived", admin_level: d.admin_level, year: d.year })); }
    setDatasets(all);
  })(); }, [open, includeCore, includeOther, includeDerived, includeGIS, countryIso]);
  useEffect(() => { if (!open) return; (async () => { const { data } = await sb.from("taxonomy_terms").select("category,name"); const g = {}; data?.forEach(t => { if (!g[t.category]) g[t.category] = []; g[t.category].push(t.name); }); setCategories(g); })(); }, [open]);
  const peek = async (t, set) => { if (!t) return set([]); const { data } = await sb.from(t).select("*").limit(8); if (!data?.length) return set([]); const key = detectNumKey(data[0]); set(data.map(r => ({ pcode: r.pcode, name: r.name, value: r[key] }))); };
  const doPreview = async () => { if (!datasetA) return; const { data } = await sb.rpc("simulate_join_preview_autoaggregate", { p_table_a: datasetA.table, p_table_b: useScalarB ? null : datasetB?.table, p_country: countryIso, p_target_level: targetLevel, p_method: method, p_col_a: colA, p_col_b: colB, p_use_scalar_b: useScalarB, p_scalar_b_val: scalarB }); if (data) setPreview(data); };
  const save = async () => {
    if (!title || !datasetA) return alert("Please add a title and dataset A.");
    setSaving(true);
    const { error } = await sb.rpc("create_derived_dataset", { p_country_iso: countryIso, p_title: title, p_description: desc, p_admin_level: targetLevel, p_table_a: datasetA.table, p_table_b: useScalarB ? null : datasetB?.table, p_col_a: colA, p_col_b: useScalarB ? null : colB, p_use_scalar_b: useScalarB, p_scalar_b_val: useScalarB ? scalarB : null, p_method: method, p_decimals: decimals, p_taxonomy_categories: Object.keys(taxonomy), p_taxonomy_terms: Object.values(taxonomy).flat(), p_formula: `${method.toUpperCase()} of ${colA} and ${useScalarB ? scalarB : colB}` });
    if (error) return alert("Save failed: " + error.message);
    await sb.rpc("create_derived_dataset_record", { p_country: countryIso, p_title: title, p_inputs: JSON.stringify({ table_a: datasetA.table, table_b: datasetB?.table }), p_method: method, p_expression: `${method.toUpperCase()} of ${colA} and ${useScalarB ? scalarB : colB}`, p_target_level: targetLevel, p_year: new Date().getFullYear() });
    setSaving(false); onClose();
  };
  if (!open) return null;
  const filtered = datasets.filter(d => (includeCore && d.type === "Core") || (includeOther && d.type === "Other") || (includeDerived && d.type === "Derived") || (includeGIS && d.type === "GIS"));
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 text-[13px]">
      <div className="w-[92%] max-w-2xl rounded-xl border bg-white shadow-lg">
        <div className="flex justify-between px-4 py-3"><h2 className="font-semibold text-[#640811]">Create Derived Dataset</h2><button onClick={onClose}>✕</button></div>
        <div className="max-h-[70vh] overflow-y-auto px-4 pb-4">
          <div className="grid grid-cols-3 gap-2 mb-2">
            <input className="border rounded px-2 py-1" placeholder="Title" value={title} onChange={e => setTitle(e.target.value)} />
            <select className="border rounded px-2 py-1" value={targetLevel} onChange={e => setTargetLevel(e.target.value)}>{["ADM1","ADM2","ADM3","ADM4"].map(l=><option key={l}>{l}</option>)}</select>
            <input className="border rounded px-2 py-1" placeholder="Description" value={desc} onChange={e => setDesc(e.target.value)} />
          </div>
          <div className="flex flex-wrap gap-3 mb-2">{[{l:"Core",v:includeCore,s:setIncludeCore},{l:"Other",v:includeOther,s:setIncludeOther},{l:"Derived",v:includeDerived,s:setIncludeDerived},{l:"GIS",v:includeGIS,s:setIncludeGIS}].map(x=><label key={x.l} className="flex items-center gap-1"><input type="checkbox" checked={x.v} onChange={e=>x.s(e.target.checked)} />{x.l}</label>)}</div>
          <div className="grid grid-cols-2 gap-2 mb-2">
            <select className="border rounded px-2 py-1 w-full" value={datasetA?.id||""} onChange={e=>setDatasetA(filtered.find(x=>x.id===e.target.value)||null)}><option value="">Select Dataset A</option>{filtered.map(d=><option key={d.id} value={d.id}>{d.title}</option>)}</select>
            {!useScalarB?<select className="border rounded px-2 py-1 w-full" value={datasetB?.id||""} onChange={e=>setDatasetB(filtered.find(x=>x.id===e.target.value)||null)}><option value="">Select Dataset B</option>{filtered.map(d=><option key={d.id} value={d.id}>{d.title}</option>)}</select>:<input type="number" className="border rounded px-2 py-1 text-right" value={scalarB} onChange={e=>setScalarB(+e.target.value)} />}
          </div>
          <div className="flex items-center gap-2 mb-2">
            <select className="border rounded px-2 py-1" value={method} onChange={e=>setMethod(e.target.value)}>{["ratio","multiply","sum","difference"].map(m=><option key={m}>{m}</option>)}</select>
            <select className="border rounded px-2 py-1" value={decimals} onChange={e=>setDecimals(+e.target.value)}>{[0,1,2].map(n=><option key={n}>{n} decimals</option>)}</select>
            <label className="ml-auto text-xs flex items-center gap-1"><input type="checkbox" checked={useScalarB} onChange={e=>setUseScalarB(e.target.checked)} />Scalar B</label>
            <button onClick={doPreview} className="bg-[#0082cb] hover:bg-[#006fae] text-white px-3 py-1 rounded text-xs">Preview</button>
          </div>
          {preview.length>0&&<div className="max-h-[140px] overflow-y-auto border rounded mb-2"><table className="w-full text-[12px]"><thead className="bg-gray-50"><tr>{["Pcode","Name","A","B","Derived"].map(h=><th key={h} className="p-1 text-left">{h}</th>)}</tr></thead><tbody>{preview.map((r,i)=><tr key={i} className="border-t"><td className="p-1">{r.out_pcode}</td><td className="p-1">{r.place_name}</td><td className="p-1 text-right">{r.a}</td><td className="p-1 text-right">{r.b}</td><td className="p-1 text-right">{Number(r.derived)?.toFixed(decimals)}</td></tr>)}</tbody></table></div>}
          <h3 className="text-sm font-semibold mb-1">Assign Taxonomy</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[12px]">{Object.keys(categories).map(cat=><div key={cat}><label className="flex items-center gap-1 font-medium"><input type="checkbox" checked={!!taxonomy[cat]} onChange={e=>{const t={...taxonomy};e.target.checked?t[cat]=[]:delete t[cat];setTaxonomy(t);}} />{cat}</label>{taxonomy[cat]&&<div className="ml-4 mt-1">{categories[cat].map(t=><label key={t} className="flex items-center gap-1 text-[11px]"><input type="checkbox" checked={taxonomy[cat]?.includes(t)} onChange={e=>{const nt={...taxonomy};e.target.checked?nt[cat]=[...(nt[cat]||[]),t]:nt[cat]=nt[cat].filter(x=>x!==t);setTaxonomy(nt);}} />{t}</label>)}</div>}</div>)}</div>
        </div>
        <div className="flex justify-end gap-2 border-t px-4 py-2"><button onClick={onClose} className="border px-3 py-1 rounded text-xs">Cancel</button><button onClick={save} disabled={saving} className="bg-[#00b398] hover:bg-[#00907f] text-white px-3 py-1 rounded text-xs">{saving?"Saving…":"Save Derived"}</button></div>
      </div>
    </div>
  );
}

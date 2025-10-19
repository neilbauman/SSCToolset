"use client";
import { useEffect, useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";

type Dataset = { id: string; title: string; dataset_type: string; admin_level: string | null; record_count?: number | null };
type Method = "multiply" | "ratio" | "sum" | "difference";
type AggMode = "sum" | "mean" | "copy_down";

export default function CreateDerivedDatasetWizard_JoinAware({ open, onClose, countryIso, onCreated }: { open: boolean; onClose: () => void; countryIso: string; onCreated?: (id?: string) => void; }) {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [includeGIS, setIncludeGIS] = useState(true);
  const [a, setA] = useState(""), [b, setB] = useState(""), [c, setC] = useState("");
  const [aMeta, setAMeta] = useState<Dataset | null>(null), [bMeta, setBMeta] = useState<Dataset | null>(null), [cMeta, setCMeta] = useState<Dataset | null>(null);
  const [aLevel, setALevel] = useState("ADM3"), [bLevel, setBLevel] = useState("ADM3"), [cLevel, setCLevel] = useState("ADM3"), [target, setTarget] = useState("ADM3");
  const [method, setMethod] = useState<Method>("multiply"), [aggMode, setAggMode] = useState<AggMode>("sum");
  const [title, setTitle] = useState(""), [rows, setRows] = useState<any[]>([]), [warn, setWarn] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (!open) return; loadDatasets(); }, [open, includeGIS]);
  async function loadDatasets() {
    const all: Dataset[] = [];
    const { data: meta } = await supabase.from("dataset_metadata").select("id,title,dataset_type,admin_level,record_count,year").eq("country_iso", countryIso);
    if (meta) all.push(...meta);
    const { data: pop } = await supabase.from("population_datasets").select("id,title,is_active").eq("country_iso", countryIso);
    if (pop) all.push(...pop.map((d:any)=>({ id:d.id,title:d.title||"Population Dataset",dataset_type:"population",admin_level:"ADM3",record_count:null })));
    const { data: adm } = await supabase.from("admin_dataset_versions").select("id,title,is_active,year").eq("country_iso", countryIso);
    if (adm) all.push(...adm.map((d:any)=>({ id:d.id,title:d.title||"Admin Dataset",dataset_type:"admin",admin_level:"ADM0",record_count:null })));
    if (includeGIS) {
      const { data: gis } = await supabase.from("gis_datasets").select("id,title,is_active").eq("country_iso", countryIso);
      if (gis) all.push(...gis.map((d:any)=>({ id:d.id,title:d.title||"GIS Dataset",dataset_type:"gis",admin_level:null,record_count:null })));
    }
    setDatasets(all);
  }

  useEffect(() => { setAMeta(datasets.find(d=>d.id===a)||null); setBMeta(datasets.find(d=>d.id===b)||null); setCMeta(datasets.find(d=>d.id===c)||null); }, [a,b,c,datasets]);
  useEffect(() => {
    const levels=["ADM0","ADM1","ADM2","ADM3","ADM4","ADM5"];
    const idxA=levels.indexOf(aLevel),idxB=levels.indexOf(bLevel);
    const deeper=idxA>idxB?aLevel:bLevel; setTarget(deeper);
    if(aLevel!==bLevel)setWarn(`⚠️ Joining ${aLevel} with ${bLevel} may require aggregation.`); else setWarn(null);
  },[aLevel,bLevel]);

  async function previewJoin() {
    const { data }=await supabase.from("admin_units").select("pcode,name,level,parent_pcode").eq("country_iso",countryIso).eq("level",target).limit(10);
    setRows(data?.map(d=>({...d,a:"—",b:"—",derived:"—"}))||[]);
  }
  function simulateAggregation(base:string,higher:string,mode:AggMode){return mode==="sum"?`Σ(${base}->${higher})`:mode==="mean"?`μ(${base}->${higher})`:`↓(${higher}->${base})`;}

  async function handleCreate(){
    if(!aMeta||!bMeta)return; setLoading(true);
    try{
      const{data,error}=await supabase.rpc("create_simple_derived_dataset_v2",{p_country_iso:countryIso,p_dataset_a:aMeta.id,p_dataset_b:bMeta.id,p_title:title||`${aMeta.title} × ${bMeta.title}`,p_method:method,p_admin_level:target});
      if(error)throw error; onCreated?.(Array.isArray(data)?data[0]:data); onClose();
    }catch(e:any){alert(e.message);}finally{setLoading(false);}
  }
  if(!open)return null;

  return(<div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
  <div className="w-full max-w-5xl bg-white rounded-lg shadow-lg max-h-[90vh] overflow-hidden flex flex-col">
  <div className="p-5 border-b">
    <h2 className="text-2xl font-semibold">Create Derived Dataset</h2>
    <p className="text-xs text-gray-500">Step 1 Join → Step 2 Derivation</p>
  </div>

  <div className="p-5 overflow-y-auto space-y-5">
    <div className="flex items-center gap-2 text-xs">
      <input type="checkbox" checked={includeGIS} onChange={e=>setIncludeGIS(e.target.checked)} />
      <label>Include GIS datasets</label>
    </div>

    <h3 className="text-sm font-semibold text-gray-700">Step 1 Join Alignment</h3>
    {warn&&<div className="text-xs bg-yellow-100 text-yellow-800 border p-2 rounded">{warn}</div>}

    <div className="grid md:grid-cols-2 gap-4">
      {[["A",a,setA,aMeta,aLevel,setALevel],["B",b,setB,bMeta,bLevel,setBLevel]].map(([label,id,setId,meta,lvl,setLvl]:any)=>(
        <div key={label}>
          <label className="text-sm font-medium">Dataset {label}</label>
          <select value={id} onChange={e=>setId(e.target.value)} className="w-full border rounded px-2 py-1.5">
            <option value="">Select…</option>{datasets.map(d=><option key={d.id} value={d.id}>{d.title}</option>)}
          </select>
          {meta&&<div className="text-xs text-gray-600 mt-1">Type:{meta.dataset_type} · Level:{meta.admin_level} · Records:{meta.record_count}</div>}
          <label className="text-xs text-gray-700 mt-1 block">Admin Level</label>
          <select value={lvl} onChange={e=>setLvl(e.target.value)} className="w-full border rounded px-2 py-1 text-xs">
            {["ADM0","ADM1","ADM2","ADM3","ADM4","ADM5"].map(l=><option key={l}>{l}</option>)}
          </select>
        </div>
      ))}
    </div>

    <button onClick={previewJoin} className="text-blue-600 text-xs hover:underline">Preview Join</button>
    <div className="border rounded max-h-48 overflow-y-auto">{rows.length===0?
      <div className="p-2 text-sm text-gray-500">No preview</div>:
      <table className="min-w-full text-xs"><thead className="bg-gray-50 sticky top-0"><tr><th className="px-2 py-1 text-left">Name</th><th>PCode</th><th>A</th><th>B</th><th>Derived</th></tr></thead>
      <tbody>{rows.map((r,i)=><tr key={i} className="border-t"><td className="px-2 py-1">{r.name}</td><td>{r.pcode}</td><td>{r.a}</td><td>{r.b}</td><td>{r.derived}</td></tr>)}</tbody></table>}
    </div>

    <h3 className="text-sm font-semibold text-gray-700">Step 2 Derivation / Aggregation</h3>
    <div className="grid md:grid-cols-3 gap-4 items-end">
      <div>
        <label className="text-xs text-gray-700">Add Dataset C (optional)</label>
        <select value={c} onChange={e=>setC(e.target.value)} className="w-full border rounded px-2 py-1 text-xs">
          <option value="">None</option>{datasets.map(d=><option key={d.id} value={d.id}>{d.title}</option>)}
        </select>
      </div>
      {c&&<>
        <div>
          <label className="text-xs text-gray-700">Level (C)</label>
          <select value={cLevel} onChange={e=>setCLevel(e.target.value)} className="w-full border rounded px-2 py-1 text-xs">
            {["ADM0","ADM1","ADM2","ADM3","ADM4","ADM5"].map(l=><option key={l}>{l}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-700">Aggregation/Inference</label>
          <select value={aggMode} onChange={e=>setAggMode(e.target.value as AggMode)} className="w-full border rounded px-2 py-1 text-xs">
            <option value="sum">Aggregate (Sum)</option>
            <option value="mean">Aggregate (Mean)</option>
            <option value="copy_down">Infer (Copy Down)</option>
          </select>
        </div>
      </>}
    </div>
    {c&&<div className="text-xs text-gray-600 mt-1">Simulated rule: {simulateAggregation(target,cLevel,aggMode)}</div>}

    <div className="text-xs text-gray-600 border rounded p-2 bg-gray-50">
      Formula: <strong>{aMeta?.title||"A"}</strong> {method} <strong>{bMeta?.title||"B"}</strong>{c&&<> + <strong>{cMeta?.title}</strong> ({aggMode})</>}
      <br/>Target Level: <strong>{target}</strong>
    </div>

    <div className="flex gap-2 mt-2">
      {(["multiply","ratio","sum","difference"] as Method[]).map(m=>
        <button key={m} onClick={()=>setMethod(m)} className={`px-3 py-1 border rounded text-xs ${method===m?"bg-blue-600 text-white border-blue-600":""}`}>{m}</button>)}
    </div>
    <input value={title} onChange={e=>setTitle(e.target.value)} className="border rounded px-2 py-1 w-full mt-2 text-sm" placeholder="Derived Dataset Title"/>
  </div>

  <div className="p-4 border-t flex justify-end gap-2">
    <button onClick={onClose} className="border px-3 py-1.5 rounded">Cancel</button>
    <button onClick={handleCreate} disabled={loading||!aMeta||!bMeta} className="bg-blue-600 text-white px-3 py-1.5 rounded">{loading?"Creating…":"Create"}</button>
  </div>
  </div></div>);
}

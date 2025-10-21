"use client";
import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";

type Props = { open: boolean; onClose: () => void; countryIso: string };
type DatasetOption = { id: string; title: string; admin_level?: string; source: "core"|"other"|"derived"; table_name: string };
type TaxonomyMap = Record<string,string[]>;

export default function CreateDerivedDatasetWizard_JoinAware({ open,onClose,countryIso }:Props) {
  const [incCore,setIncCore]=useState(true),[incOther,setIncOther]=useState(true),[incDerived,setIncDerived]=useState(true);
  const [allDatasets,setAll]=useState<DatasetOption[]>([]);
  const datasets=useMemo(()=>allDatasets.filter(d=>(incCore&&d.source==="core")||(incOther&&d.source==="other")||(incDerived&&d.source==="derived")),[allDatasets,incCore,incOther,incDerived]);
  const [datasetA,setA]=useState<DatasetOption|null>(null),[datasetB,setB]=useState<DatasetOption|null>(null);
  const [colA,setColA]=useState("population"),[colB,setColB]=useState("population");
  const [useScalarB,setUseScalarB]=useState(true),[scalarB,setScalarB]=useState<number>(5.1);
  const [method,setMethod]=useState("ratio"),[decimals,setDecimals]=useState(0),[targetLevel,setTarget]=useState("ADM4");
  const [title,setTitle]=useState(""),[desc,setDesc]=useState("");
  const [previewRows,setPreview]=useState<any[]>([]),[peekRows,setPeek]=useState<any[]>([]),[peekTitle,setPeekTitle]=useState("");
  const [taxonomy,setTax]=useState<TaxonomyMap>({}),[catChecked,setCat]=useState<Record<string,boolean>>({}),[termChecked,setTerm]=useState<Record<string,Record<string,boolean>>>({});
  const [showPeek,setShowPeek]=useState(false),[showJoin,setShowJoin]=useState(false),[showTax,setShowTax]=useState(false);
  const sym=(m:string)=>({ratio:"÷",multiply:"×",sum:"+",difference:"−"}[m]||"?");

  useEffect(()=>{if(!open)return;(async()=>{
    const core:DatasetOption[]=[
      {id:"core-admin",title:"Administrative Boundaries",admin_level:"ADM4",source:"core",table_name:"admin_units"},
      {id:"core-pop",title:"Population Data",admin_level:"ADM4",source:"core",table_name:"population_data"},
      {id:"core-gis",title:"GIS Features",admin_level:"ADM4",source:"core",table_name:"gis_features"},
    ];
    const other=(await supabase.from("dataset_metadata").select("id,title,admin_level").eq("country_iso",countryIso).order("title")).data?.map((d:any)=>({
      id:d.id,title:d.title||"(Untitled)",admin_level:d.admin_level,source:"other" as const,table_name:`dataset_${d.id}`.toLowerCase()
    }))||[];
    const derived=(await supabase.from("view_derived_dataset_summary").select("derived_dataset_id,derived_title,admin_level").eq("country_iso",countryIso).order("derived_title")).data?.map((d:any)=>({
      id:d.derived_dataset_id,title:d.derived_title,admin_level:d.admin_level,source:"derived" as const,table_name:`derived_${d.derived_dataset_id}`
    }))||[];
    setAll([...core,...other,...derived]);
    const tax=(await supabase.from("taxonomy_terms").select("category,name")).data||[];
    const grouped:TaxonomyMap=tax.reduce((a:TaxonomyMap,t:any)=>{(a[t.category]||=[]).push(t.name);return a;},{} as any);
    setTax(grouped);const c:Record<string,boolean>={},t:Record<string,Record<string,boolean>>={};
    Object.keys(grouped).forEach(k=>{c[k]=false;t[k]={};grouped[k].forEach(n=>t[k][n]=false)});setCat(c);setTerm(t);
  })()},[open,countryIso]);

  async function doPeek(ds:DatasetOption|null,col:string){
    setPeek([]);setPeekTitle("");if(!ds)return;
    const {data,error}=await supabase.from(ds.table_name).select(`pcode,name,${col}`).limit(6);
    let rows:any[]=data??[];if(error||!rows.length){const fb=await supabase.from(ds.table_name).select("pcode,name,population").limit(6);rows=fb.data??[];}
    if(rows.length){setPeek(rows);setPeekTitle(`${ds.title} (${col})`);setShowPeek(true);}
  }
  async function previewJoin(){
    const {data,error}=await supabase.rpc("simulate_join_preview_autoaggregate",{p_table_a:datasetA?.table_name||null,p_table_b:useScalarB?null:(datasetB?.table_name||null),p_country:countryIso,p_target_level:targetLevel,p_method:method,p_col_a:colA,p_col_b:useScalarB?colA:colB,p_use_scalar_b:useScalarB,p_scalar_b_val:useScalarB?scalarB:null});
    if(error)return alert("Join preview failed: "+error.message);setPreview(data||[]);setShowJoin(true);
  }
  async function save(){
    const cats=Object.entries(catChecked).filter(([,v])=>v).map(([k])=>k);
    const terms=Object.entries(termChecked).flatMap(([c,m])=>Object.entries(m).filter(([,v])=>v).map(([n])=>`${c}:${n}`));
    const {error}=await supabase.from("derived_dataset_metadata").insert({
      country_iso:countryIso,title,description:desc,admin_level:targetLevel,
      table_a:datasetA?.table_name||null,table_b:useScalarB?null:datasetB?.table_name||null,
      col_a:colA,col_b:useScalarB?null:colB,use_scalar_b:useScalarB,scalar_b_val:useScalarB?scalarB:null,
      method,decimals,taxonomy_categories:cats,taxonomy_terms:terms,
      formula:`A.${colA} ${sym(method)} ${useScalarB?scalarB:`B.${colB}`} → ${targetLevel}`
    });
    if(error)return alert("Save failed: "+error.message);alert("✅ Saved.");onClose();
  }

  if(!open)return null;
  return(
  <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
  <div className="bg-white rounded w-[980px] max-h-[90vh] overflow-y-auto p-4 text-sm space-y-3">
    <div className="flex gap-2">
      <input className="border rounded p-2 flex-1" placeholder="Derived dataset title" value={title} onChange={e=>setTitle(e.target.value)}/>
      <select className="border rounded p-2" value={targetLevel} onChange={e=>setTarget(e.target.value)}>
        {["ADM4","ADM3","ADM2","ADM1"].map(x=><option key={x}>{x}</option>)}
      </select>
    </div>
    <input className="border rounded p-2 w-full" placeholder="Description" value={desc} onChange={e=>setDesc(e.target.value)}/>
    <div className="flex flex-wrap gap-6 text-xs">
      {[["Include Core",incCore,setIncCore],["Include Other",incOther,setIncOther],["Include Derived",incDerived,setIncDerived]].map(([l,v,fn]:any)=>
        <label key={l} className="flex items-center gap-2"><input type="checkbox" checked={v} onChange={e=>(fn as any)(e.target.checked)}/>{l}</label>
      )}
    </div>
    <div className="grid grid-cols-2 gap-3 items-end">
      {[["A",datasetA,setA,colA,setColA],["B",datasetB,setB,colB,setColB]].map(([lab,ds,setDs,col,setCol]:any,idx:number)=>
        <div key={lab as string} className="border rounded p-3">
          <div className="flex justify-between mb-1">
            <div className="font-semibold">Dataset {lab}</div>
            {idx===1&&<label className="text-xs flex items-center gap-2"><input type="checkbox" checked={useScalarB} onChange={e=>setUseScalarB(e.target.checked)}/>Use scalar</label>}
          </div>
          {idx===1&&useScalarB?
            <div className="flex gap-2"><input type="number" className="border rounded p-2 w-28" value={scalarB} onChange={e=>setScalarB(+e.target.value)}/><div className="text-xs text-gray-600 self-center">Scalar used as B</div></div>
          :<>
          <select className="border rounded p-2 w-full" value={ds?.id||""} onChange={e=>setDs(datasets.find(d=>d.id==e.target.value)||null)}>
            <option value="">Select dataset…</option>
            <optgroup label="Core Datasets">{datasets.filter(d=>d.source==="core").map(d=><option key={d.id} value={d.id}>{d.title}</option>)}</optgroup>
            <optgroup label="Other Datasets">{datasets.filter(d=>d.source==="other").map(d=><option key={d.id} value={d.id}>{d.title}</option>)}</optgroup>
            <optgroup label="Derived Datasets">{datasets.filter(d=>d.source==="derived").map(d=><option key={d.id} value={d.id}>{d.title}</option>)}</optgroup>
          </select>
          <div className="flex gap-2 mt-2"><input className="border rounded p-2 flex-1" value={col} onChange={e=>setCol(e.target.value)} placeholder={`Column for ${lab}`}/><button className="border rounded px-3" onClick={()=>doPeek(ds,col)}>peek</button></div>
          </>}
        </div>
      )}
    </div>
    <div className="flex flex-wrap items-center gap-3">
      <select className="border rounded p-2" value={method} onChange={e=>setMethod(e.target.value)}>{["multiply","ratio","sum","difference"].map(m=><option key={m}>{m}</option>)}</select>
      <div className="text-xs text-gray-600">Derived = A.{colA} {sym(method)} {useScalarB?scalarB:`B.${colB}`} → {targetLevel}</div>
      <label className="ml-auto text-xs flex items-center gap-2">Decimals<input type="number" min={0} max={6} className="border rounded p-1 w-14" value={decimals} onChange={e=>setDecimals(+e.target.value)}/></label>
      <button onClick={previewJoin} className="bg-blue-600 text-white px-3 py-1 rounded">Preview</button>
    </div>
    {/* join preview */}
    <div className="border rounded">
      <div onClick={()=>setShowJoin(s=>!s)} className="cursor-pointer bg-gray-100 p-2 font-semibold text-sm flex justify-between">Join Preview<span>{showJoin?"▲":"▼"}</span></div>
      {showJoin&&<div className="max-h-44 overflow-y-auto"><table className="w-full text-xs"><thead className="bg-gray-100"><tr><th className="p-1">pcode</th><th className="p-1">name</th><th className="p-1">A</th><th className="p-1">B</th><th className="p-1">Derived</th></tr></thead><tbody>{previewRows.map((r:any,i:number)=><tr key={i} className="odd:bg-gray-50"><td className="p-1">{r.out_pcode}</td><td className="p-1">{r.place_name}</td><td className="p-1 text-right">{r.a}</td><td className="p-1 text-right">{r.b}</td><td className="p-1 text-right">{typeof r.derived==="number"?r.derived.toFixed(decimals):r.derived}</td></tr>)}{!previewRows.length&&<tr><td className="p-2 text-center text-gray-500" colSpan={5}>No preview yet</td></tr>}</tbody></table></div>}
    </div>
    {/* peek */}
    <div className="border rounded">
      <div onClick={()=>setShowPeek(s=>!s)} className="cursor-pointer bg-gray-100 p-2 font-semibold text-sm flex justify-between">Dataset Peek<span>{showPeek?"▲":"▼"}</span></div>
      {showPeek&&<div className="max-h-32 overflow-y-auto"><div className="text-xs font-semibold px-2 py-1 bg-gray-50">{peekTitle}</div><table className="w-full text-xs"><thead className="bg-gray-100"><tr><th className="p-1">pcode</th><th className="p-1">name</th><th className="p-1">value</th></tr></thead><tbody>{peekRows.map((r:any,i:number)=><tr key={i} className="odd:bg-gray-50"><td className="p-1">{r.pcode}</td><td className="p-1">{r.name}</td><td className="p-1 text-right">{r.population??r.value??""}</td></tr>)}</tbody></table></div>}
    </div>
    {/* taxonomy */}
    <div className="border rounded">
      <div onClick={()=>setShowTax(s=>!s)} className="cursor-pointer bg-gray-100 p-2 font-semibold text-sm flex justify-between">Taxonomy<span>{showTax?"▲":"▼"}</span></div>
      {showTax&&<div className="grid grid-cols-4 gap-3 p-2">{Object.entries(taxonomy).map(([cat,terms])=>
        <div key={cat} className="border rounded p-2">
          <label className="font-semibold text-sm flex items-center gap-2"><input type="checkbox" checked={!!catChecked[cat]} onChange={e=>setCat(s=>({...s,[cat]:e.target.checked}))}/> {cat}</label>
          {catChecked[cat]&&<div className="mt-1 pl-3 space-y-1">{terms.map(t=>
            <label key={t} className="flex items-center gap-2 text-xs"><input type="checkbox" checked={!!termChecked[cat]?.[t]} onChange={e=>{const v=e.target.checked;setTerm(s=>{const n={...s};n[cat]={...(n[cat]||{}),[t]:v};return n;});}}/> {t}</label>
          )}</div>}
        </div>
      )}</div>}
    </div>
    <div className="flex justify-end gap-2"><button onClick={onClose} className="border rounded px-3 py-1">Cancel</button><button onClick={save} className="bg-green-600 text-white rounded px-3 py-1">Save</button></div>
  </div></div>);
}

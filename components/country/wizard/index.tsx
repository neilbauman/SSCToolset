"use client";
import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";

type Method = "ratio" | "multiply" | "sum" | "difference";
type Source = "other" | "derived";
type DatasetOption = { id: string; title: string; source: Source; defaultCol?: string | null };
type TaxonomyMap = Record<string, string[]>;
type EditPayload = { id:string; title:string; description?:string|null; admin_level:string; method:Method;
  use_scalar_b?:boolean|null; scalar_b_val?:number|null; table_a?:string|null; table_b?:string|null;
  col_a?:string|null; col_b?:string|null; decimals?:number|null; formula?:string|null;
  target_level?:string|null; taxonomy_categories?:string[]; taxonomy_terms?:string[];
  is_parametric?:boolean|null; normalize_percent?:boolean|null; };

export default function DerivedDatasetWizard({ open,onClose,countryIso,editDataset=null }:{
  open:boolean; onClose:()=>void; countryIso:string; editDataset?:EditPayload|null;
}) {
  const [datasets,setDatasets]=useState<DatasetOption[]>([]);
  const [datasetA,setDatasetA]=useState<DatasetOption|null>(null);
  const [datasetB,setDatasetB]=useState<DatasetOption|null>(null);
  const [colA,setColA]=useState(""),[colB,setColB]=useState("");
  const [method,setMethod]=useState<Method>("ratio");
  const [useScalarB,setUseScalarB]=useState(false);
  const [scalarB,setScalarB]=useState(1);
  const [title,setTitle]=useState(""),[desc,setDesc]=useState("");
  const [targetLevel,setTargetLevel]=useState("ADM3"),[decimals,setDecimals]=useState(2);
  const [isParametric,setIsParametric]=useState(true),[normalizePercent,setNormalizePercent]=useState(false);
  const [preview,setPreview]=useState<any[]>([]),[loadingPreview,setLoadingPreview]=useState(false);
  const [taxonomyMap,setTaxonomyMap]=useState<TaxonomyMap>({}),[taxonomy,setTaxonomy]=useState<Record<string,Set<string>>>({});
  const ACCENT="#640811";

  useEffect(()=>{ if(!open)return;(async()=>{
    const opts:DatasetOption[]=[];
    const {data:base}=await supabase.from("dataset_metadata").select("id,title,country_iso").eq("country_iso",countryIso);
    base?.forEach(d=>opts.push({id:d.id,title:d.title,source:"other",defaultCol:"value"}));
    const {data:drv}=await supabase.from("derived_dataset_metadata").select("id,title,country_iso").eq("country_iso",countryIso);
    drv?.forEach(d=>opts.push({id:d.id,title:d.title,source:"derived",defaultCol:"derived"}));
    setDatasets(opts.sort((a,b)=>a.title.localeCompare(b.title)));
  })();},[open,countryIso]);

  useEffect(()=>{ if(!open)return;(async()=>{
    const {data}=await supabase.from("taxonomy_terms").select("category,name"); if(!data)return;
    const g:TaxonomyMap={}; data.forEach((x:any)=>{ if(!g[x.category])g[x.category]=[]; g[x.category].push(x.name);});
    setTaxonomyMap(g);
  })();},[open]);

  useEffect(()=>{ if(!open)return;
    if(!editDataset){ setTitle("");setDesc("");setTargetLevel("ADM3");setMethod("ratio");setUseScalarB(false);
      setScalarB(1);setColA("");setColB("");setDecimals(2);setDatasetA(null);setDatasetB(null);setPreview([]);
      setTaxonomy({});setIsParametric(true);setNormalizePercent(false);return;}
    setTitle(editDataset.title||"");setDesc(editDataset.description||"");setTargetLevel(editDataset.target_level||editDataset.admin_level||"ADM3");
    setMethod((editDataset.method as Method)||"ratio");setUseScalarB(!!editDataset.use_scalar_b);
    setScalarB(editDataset.scalar_b_val??1);setColA(editDataset.col_a||"");setColB(editDataset.col_b||"");
    setDecimals(editDataset.decimals??2);setIsParametric(!!editDataset.is_parametric);setNormalizePercent(!!editDataset.normalize_percent);
    if(datasets.length){const a=datasets.find(d=>d.id===editDataset.table_a||d.title===editDataset.table_a)||null;
      const b=datasets.find(d=>d.id===editDataset.table_b||d.title===editDataset.table_b)||null;
      setDatasetA(a);setDatasetB(b);}
  },[open,editDataset,datasets]);

  useEffect(()=>{if(datasetA&&!colA)setColA(datasetA.defaultCol||"value");},[datasetA]);
  useEffect(()=>{if(datasetB&&!colB)setColB(datasetB.defaultCol||"value");},[datasetB]);
  const methodSymbol=useMemo(()=>({ratio:"÷",multiply:"×",sum:"+",difference:"−"}[method]),[method]);
  const formula=useMemo(()=>`A.${colA||"?"} ${methodSymbol} ${useScalarB?scalarB:`B.${colB||"?"}`}`,
    [methodSymbol,colA,colB,useScalarB,scalarB]);

  async function previewJoin(){
    if(!datasetA||(!datasetB&&!useScalarB))return alert("Select Dataset A and (Dataset B or scalar).");
    setLoadingPreview(true);
    const {data,error}=await supabase.rpc("simulate_join_preview_autoaggregate",{
      p_table_a:datasetA.id,p_table_b:useScalarB?null:datasetB?.id??null,p_col_a:colA||"value",
      p_col_b:useScalarB?null:colB||"value",p_country_iso:countryIso,p_method:method,p_target_level:targetLevel,
      p_use_scalar_b:useScalarB,p_scalar_b_val:useScalarB?scalarB:null,p_limit:50,p_normalize_percent:normalizePercent});
    setLoadingPreview(false); if(error){alert("Preview error: "+error.message);console.error(error);setPreview([]);return;}
    setPreview(data||[]);
  }

  async function saveDerived(){
    if(!datasetA||(!datasetB&&!useScalarB))return alert("Select Dataset A and (Dataset B or scalar).");
    const cats=Object.keys(taxonomy),terms=cats.flatMap(c=>Array.from(taxonomy[c]||[]));
    const {error}=await supabase.rpc("create_derived_dataset_v2",{
      p_country:countryIso,p_title:title||`Derived (${targetLevel})`,p_description:desc||null,p_admin_level:targetLevel,
      p_method:method,p_use_scalar_b:useScalarB,p_scalar_b_val:useScalarB?scalarB:null,p_table_a:datasetA.id,
      p_table_b:useScalarB?null:datasetB?.id??null,p_col_a:colA||"value",p_col_b:useScalarB?null:colB||"value",
      p_formula:formula,p_target_level:targetLevel,p_taxonomy_categories:cats,p_taxonomy_terms:terms,p_decimals:decimals});
    if(error){alert("Save failed: "+error.message);console.error(error);return;}
    alert("✅ Derived dataset saved.");onClose();
  }

  if(!open)return null;
  return(<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
    <div className="bg-white rounded-2xl p-5 w-[95%] max-w-6xl max-h-[90vh] overflow-y-auto text-sm">
      <h2 className="text-lg font-semibold mb-3">{editDataset?"Edit":"Create"} Derived Dataset</h2>
      <div className="flex gap-2 mb-3">
        <input className="border p-1 flex-1 rounded" placeholder="Title" value={title} onChange={e=>setTitle(e.target.value)}/>
        <input className="border p-1 flex-1 rounded" placeholder="Description" value={desc} onChange={e=>setDesc(e.target.value)}/>
        <select className="border p-1 rounded" value={targetLevel} onChange={e=>setTargetLevel(e.target.value)}>
          {["ADM0","ADM1","ADM2","ADM3","ADM4"].map(l=><option key={l}>{l}</option>)}</select>
      </div>
      <div className="flex gap-2 mb-3">
        {(["A","B"] as const).map((lbl,i)=>!useScalarB||lbl==="A"?(
          <select key={i} className="border p-1 rounded flex-1"
            value={(lbl==="A"?datasetA:datasetB)?.id||""}
            onChange={e=>{const d=datasets.find(x=>x.id===e.target.value)||null;lbl==="A"?setDatasetA(d):setDatasetB(d);
              if(d?.defaultCol)lbl==="A"?setColA(d.defaultCol):setColB(d.defaultCol);}}>
            <option value="">Select Dataset {lbl}</option>
            <optgroup label="Base datasets">{datasets.filter(d=>d.source==="other").map(d=><option key={d.id} value={d.id}>{d.title}</option>)}</optgroup>
            <optgroup label="Derived datasets">{datasets.filter(d=>d.source==="derived").map(d=><option key={d.id} value={d.id}>{d.title}</option>)}</optgroup>
          </select>):null)}
      </div>
      <div className="flex gap-2 mb-3">
        <input className="border p-1 rounded w-40" value={colA} onChange={e=>setColA(e.target.value)} placeholder="Column A"/>
        {!useScalarB&&<input className="border p-1 rounded w-40" value={colB} onChange={e=>setColB(e.target.value)} placeholder="Column B"/>}
        <label className="text-xs flex items-center gap-1 ml-auto"><input type="checkbox" checked={useScalarB} onChange={e=>setUseScalarB(e.target.checked)}/>Use Scalar B</label>
        {useScalarB&&<input type="number" className="border p-1 rounded w-24 text-right" value={scalarB} onChange={e=>setScalarB(parseFloat(e.target.value||"0"))}/>}
        <select className="border rounded text-xs p-1" value={decimals} onChange={e=>setDecimals(parseInt(e.target.value))}>{[0,1,2,3].map(d=><option key={d}>{d} dec</option>)}</select>
      </div>
      <div className="flex gap-2 mb-2">
        {(["ratio","multiply","sum","difference"] as const).map(m=>
          <button key={m} onClick={()=>setMethod(m)} className={`px-2 py-1 border rounded ${method===m?"text-white":""}`}
            style={{background:method===m?ACCENT:"transparent",borderColor:"#e5e7eb"}}>{m}</button>)}
        <label className="text-xs flex items-center gap-1 ml-3"><input type="checkbox" checked={isParametric} onChange={e=>setIsParametric(e.target.checked)}/>Parametric</label>
        <label className="text-xs flex items-center gap-1 ml-3"><input type="checkbox" checked={normalizePercent} onChange={e=>setNormalizePercent(e.target.checked)}/>Normalize %</label>
        <button onClick={previewJoin} className="ml-auto px-3 py-1 text-white rounded" style={{background:ACCENT}}>
          {loadingPreview?"Loading...":"Preview"}</button>
      </div>
      <p className="text-xs italic mb-2">Derived = {formula}</p>
      <div className="max-h-64 overflow-y-auto border rounded text-xs mb-4">
        <table className="w-full">
          <thead className="bg-gray-100"><tr>{preview[0]?Object.keys(preview[0]):["join_key","place_name","a","b","derived"]}.map((k:string)=>
            <th key={k} className="p-1 text-left">{k}</th>)</tr></thead>
          <tbody>{preview.length===0?
            <tr><td colSpan={6} className="text-center italic text-gray-500 py-2">No preview data</td></tr>:
            preview.map((r,i)=><tr key={i} className="border-t">{Object.entries(r).map(([k,v],j)=><td key={j} className="p-1">{v??"—"}</td>)}</tr>)}
          </tbody>
        </table>
      </div>
      <h3 className="text-sm font-semibold mb-2">Assign Taxonomy</h3>
      <div className="grid grid-cols-3 gap-2 mb-4">{Object.keys(taxonomyMap).map(cat=>{
        const chk=!!taxonomy[cat];
        return(<div key={cat} className="border rounded p-2">
          <label className="flex items-center gap-1 text-xs font-medium"><input type="checkbox" checked={chk}
            onChange={e=>setTaxonomy(p=>{const n={...p};if(e.target.checked)n[cat]=new Set();else delete n[cat];return n;})}/> {cat}</label>
          {chk&&<div className="ml-3 mt-1 grid">{taxonomyMap[cat].map(t=>
            <label key={t} className="flex items-center gap-1 text-xs"><input type="checkbox"
              checked={!!taxonomy[cat]?.has(t)} onChange={e=>setTaxonomy(p=>{const n={...p};if(!n[cat])n[cat]=new Set();
                if(e.target.checked)n[cat]!.add(t);else n[cat]!.delete(t);return n;})}/> {t}</label>)}</div>}
        </div>);})}</div>
      <div className="flex justify-end gap-2"><button onClick={onClose} className="px-3 py-1 border rounded">Cancel</button>
        <button onClick={saveDerived} className="px-3 py-1 text-white rounded" style={{background:ACCENT}}>Save</button></div>
    </div></div>);
}

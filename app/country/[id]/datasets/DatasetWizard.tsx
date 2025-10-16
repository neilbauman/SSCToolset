"use client";
import { useState, useEffect } from "react";
import Papa from "papaparse";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { ChevronLeft, ChevronRight, Upload, Loader2, AlertTriangle, CheckCircle2, Search, Plus, Tag } from "lucide-react";
import TaxonomyPicker from "@/app/configuration/taxonomy/TaxonomyPicker";
import CreateIndicatorInlineModal from "@/components/country/CreateIndicatorInlineModal";

type Props={countryIso:string;onClose:()=>void;onSaved:()=>void};
const F="w-full border rounded-md px-3 py-2 text-sm outline-none focus:ring-2 ring-[color:var(--gsc-red)]",L="block text-xs font-medium text-[color:var(--gsc-gray)] mb-1",
B="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm",P=`${B} bg-[color:var(--gsc-red)] text-white hover:opacity-90 disabled:opacity-50`,S=`${B} border hover:bg-gray-50`;

export default function DatasetWizard({countryIso,onClose,onSaved}:Props){
const[step,setStep]=useState(1),[busy,setBusy]=useState(false),[error,setError]=useState<string|null>(null);
const[title,setTitle]=useState(""),[desc,setDesc]=useState(""),[source,setSource]=useState(""),[sourceUrl,setSourceUrl]=useState(""),[year,setYear]=useState<number|''>(""),
[datasetType,setDatasetType]=useState<"gradient"|"categorical">("gradient"),[dataFormat,setDataFormat]=useState<"numeric"|"percentage"|"text">("numeric"),
[adminLevel,setAdminLevel]=useState("ADM2"),[nationalValue,setNationalValue]=useState("");
const[file,setFile]=useState<File|null>(null),[headers,setHeaders]=useState<string[]>([]),[rows,setRows]=useState<any[]>([]),
[joinColumn,setJoinColumn]=useState(""),[nameColumn,setNameColumn]=useState(""),[categoryCols,setCategoryCols]=useState<string[]>([]),
[categoryMap,setCategoryMap]=useState<{code:string;label:string}[]>([]);
const[taxonomyIds,setTaxonomyIds]=useState<string[]>([]),[indicatorQuery,setIndicatorQuery]=useState(""),[indicatorList,setIndicatorList]=useState<any[]>([]),
[indicatorId,setIndicatorId]=useState<string|null>(null),[createIndicatorOpen,setCreateIndicatorOpen]=useState(false);
const next=()=>setStep(s=>Math.min(s+1,5)),prev=()=>setStep(s=>Math.max(s-1,1));

async function parseCSV(f:File){return new Promise<{headers:string[];rows:any[]}>((res,rej)=>Papa.parse(f,{header:true,dynamicTyping:true,skipEmptyLines:true,
 complete:r=>res({headers:r.meta.fields??Object.keys(r.data[0]??{}),rows:r.data.slice(0,300)}),error:rej}));}

async function handleFile(e:any){const f=e.target.files?.[0];if(!f)return;setFile(f);const{headers,rows}=await parseCSV(f);setHeaders(headers);setRows(rows);
 if(headers.find(h=>h.toLowerCase().includes("code")))setJoinColumn(headers.find(h=>h.toLowerCase().includes("code"))!);
 if(headers.find(h=>h.toLowerCase().includes("name")||h.toLowerCase().includes("muni")))setNameColumn(headers.find(h=>h.toLowerCase().includes("name")||h.toLowerCase().includes("muni"))!);}

function detectCategories(){if(!categoryCols.length)return;setCategoryMap(categoryCols.map(c=>({code:c,label:c})));}

async function searchIndicators(){const{data}=await supabase.from("indicator_catalogue").select("id,name,data_type,description").order("name");
setIndicatorList((data??[]).filter(i=>i.name.toLowerCase().includes(indicatorQuery.toLowerCase())));}
useEffect(()=>{if(step===4)searchIndicators()},[step]);

async function saveAll(){setBusy(true);setError(null);
try{
 const{data:meta,error:mErr}=await supabase.from("dataset_metadata").insert({
  title,description:desc,source,source_url:sourceUrl,year:year===""?null:Number(year),admin_level:adminLevel,
  data_type:datasetType,data_format:dataFormat,country_iso:countryIso,indicator_id:indicatorId??null}).select().single();
 if(mErr)throw mErr;const id=meta.id;
 if(indicatorId)await supabase.from("catalogue_indicator_links").insert({dataset_id:id,indicator_id:indicatorId});

 // ADM0 shortcut
 if(adminLevel==="ADM0"&&nationalValue.trim()){
   await supabase.from("dataset_values").insert([{dataset_id:id,admin_pcode:"ADM0",admin_level:"ADM0",
     value:dataFormat==="text"?null:Number(nationalValue.replace("%","")),text_value:dataFormat==="text"?nationalValue:null}]);
   setStep(5);onSaved();return;}

 // ADM1+ data
 if(datasetType==="gradient"){
   const d:any[]=[];
   rows.forEach(r=>{
     if(categoryCols.length){
       categoryCols.forEach(c=>{
         d.push({dataset_id:id,admin_pcode:String(r[joinColumn]??"").trim(),admin_level:adminLevel,category_label:c,value:Number(r[c]??0)});
       });
     }else{
       const fallbackCol=headers.find(h=>h!==joinColumn&&h!==nameColumn);
       if(fallbackCol) d.push({dataset_id:id,admin_pcode:String(r[joinColumn]??"").trim(),admin_level:adminLevel,value:Number(r[fallbackCol]??0)});
     }
   });
   if(d.length)await supabase.from("dataset_values").insert(d);
 }else{
   detectCategories();
   const maps=categoryMap.map(m=>({dataset_id:id,code:m.code,label:m.label,score:null}));
   if(maps.length)await supabase.from("dataset_category_maps").insert(maps);
 }
 setStep(5);onSaved();
}catch(e:any){setError(e.message||"Save failed.")}finally{setBusy(false)}}

const canNext=!!title&&!!datasetType&&!!dataFormat&&!!adminLevel,canSave=rows.length>0||(adminLevel==="ADM0"&&!!nationalValue.trim());

return(<div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm">
<div className="bg-white rounded-lg shadow-lg w-full max-w-5xl mx-4 max-h-[90vh] overflow-hidden flex flex-col">
<div className="flex items-center justify-between border-b px-5 py-3"><h3 className="text-lg font-semibold text-[color:var(--gsc-gray)]">Add Dataset</h3>
<button onClick={onClose} className="text-gray-600 hover:text-gray-800">✕</button></div>
<div className="p-5 space-y-4 overflow-y-auto">{error&&<div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2"><AlertTriangle className="w-4 h-4"/>{error}</div>}
<div className="text-xs text-gray-500">Step {step}/5</div>

{/* Step1 */}
{step===1&&(<section className="space-y-3">
 <div><label className={L}>Title *</label><input className={F} value={title} onChange={e=>setTitle(e.target.value)}/></div>
 <div><label className={L}>Description</label><textarea className={F} rows={3} value={desc} onChange={e=>setDesc(e.target.value)}/></div>
 <div className="grid md:grid-cols-2 gap-3"><div><label className={L}>Source</label><input className={F} value={source} onChange={e=>setSource(e.target.value)}/></div>
 <div><label className={L}>Source URL</label><input className={F} value={sourceUrl} onChange={e=>setSourceUrl(e.target.value)}/></div></div>
 <div className="grid md:grid-cols-3 gap-3"><div><label className={L}>Type</label><select className={F} value={datasetType} onChange={e=>setDatasetType(e.target.value as any)}>
 <option value="gradient">Gradient</option><option value="categorical">Categorical</option></select></div>
 <div><label className={L}>Format</label><select className={F} value={dataFormat} onChange={e=>setDataFormat(e.target.value as any)}>
 <option value="numeric">Numeric</option><option value="percentage">Percentage</option><option value="text">Text</option></select></div>
 <div><label className={L}>Admin Level</label><select className={F} value={adminLevel} onChange={e=>setAdminLevel(e.target.value)}>{["ADM0","ADM1","ADM2","ADM3","ADM4","ADM5"].map(a=><option key={a}>{a}</option>)}</select></div></div>
 {adminLevel==="ADM0"&&<div><label className={L}>National Value</label><input className={F} value={nationalValue} onChange={e=>setNationalValue(e.target.value)}/></div>}
 <div><label className={L}>Year</label><input type="number" className={F} value={year} onChange={e=>setYear(e.target.value?Number(e.target.value):"")}/></div>
</section>)}

{/* Step2 */}
{step===2&&adminLevel!=="ADM0"&&(<section className="space-y-3">
 <div><label className={L}>Upload CSV</label><input type="file" accept=".csv" className="text-sm" onChange={handleFile}/></div>
 {headers.length>0&&(<div className="grid md:grid-cols-2 gap-3">
  <div><label className={L}>Admin PCode Column</label><select className={F} value={joinColumn} onChange={e=>setJoinColumn(e.target.value)}>{headers.map(h=><option key={h}>{h}</option>)}</select></div>
  <div><label className={L}>Admin Name Column (optional)</label><select className={F} value={nameColumn} onChange={e=>setNameColumn(e.target.value)}><option value="">None</option>{headers.map(h=><option key={h}>{h}</option>)}</select></div>
 </div>)}
 {rows.length>0&&(<div className="border rounded p-2 max-h-60 overflow-auto text-xs"><table className="min-w-full">
  <thead><tr>{headers.map(h=><th key={h} className="text-left px-2 py-1 border-b">{h}</th>)}</tr></thead>
  <tbody>{rows.slice(0,10).map((r,i)=><tr key={i} className="odd:bg-gray-50">{headers.map(h=><td key={h} className="px-2 py-1 border-b">{String(r[h]??"")}</td>)}</tr>)}</tbody></table></div>)}
</section>)}

{/* Step3 */}
{step===3&&(<section className="space-y-3">
 <label className={L}>Select Category/Data Columns</label>
 <select multiple className={`${F} h-40`} value={categoryCols} onChange={e=>setCategoryCols([...e.target.selectedOptions].map(o=>o.value))}>
 {headers.filter(h=>h!==joinColumn&&h!==nameColumn).map(h=><option key={h}>{h}</option>)}</select>
 <button className={S} onClick={detectCategories}>Confirm Selection</button>
 {categoryMap.length>0&&<div className="border rounded p-2 text-xs"><p className="font-medium mb-1">Categories:</p>{categoryMap.map(c=><div key={c.code}>{c.label}</div>)}</div>}
</section>)}

{/* Step4 */}
{step===4&&(<section className="space-y-4">
 <div><label className={L}>Taxonomy</label><TaxonomyPicker selectedIds={taxonomyIds} onChange={setTaxonomyIds}/></div>
 <div className="grid md:grid-cols-3 gap-3"><div className="md:col-span-2"><label className={L}>Indicator</label>
  <div className="flex items-center gap-2"><input className={F} placeholder="Search..." value={indicatorQuery} onChange={e=>setIndicatorQuery(e.target.value)} onKeyDown={e=>e.key==="Enter"&&searchIndicators()}/>
   <button className={S} onClick={searchIndicators}><Search className="w-4 h-4"/></button></div>
  <div className="mt-2 max-h-48 overflow-auto border rounded">{indicatorList.map(it=>
   <div key={it.id} onClick={()=>setIndicatorId(it.id)} className={`px-3 py-2 text-sm cursor-pointer hover:bg-gray-50 ${indicatorId===it.id?"bg-gray-100":""}`}>
    <div className="flex justify-between"><div>{it.name}</div><span className="text-[11px] bg-gray-100 px-2 rounded">{it.data_type}</span></div>
    {it.description&&<div className="text-xs text-gray-500">{it.description}</div>}</div>)}</div></div>
  <div className="flex items-end"><button className={S} onClick={()=>setCreateIndicatorOpen(true)}><Plus className="w-4 h-4"/>New</button></div></div>
 <p className="text-[11px] text-gray-500 flex items-center gap-1"><Tag className="w-4 h-4"/>Link or create an indicator.</p>
 <CreateIndicatorInlineModal open={createIndicatorOpen} onClose={()=>setCreateIndicatorOpen(false)} taxonomyDefault={taxonomyIds} onCreated={id=>{setIndicatorId(id);setCreateIndicatorOpen(false);}}/>
</section>)}

{step===5&&<div className="text-center text-green-700 bg-green-50 border border-green-200 rounded px-3 py-2 flex items-center gap-2 justify-center"><CheckCircle2 className="w-4 h-4"/>Dataset saved.</div>}
</div>
<div className="flex items-center justify-between border-t px-5 py-3 bg-gray-50">
<button className={S} onClick={step===1?onClose:prev}><ChevronLeft className="w-4 h-4"/>{step===1?"Cancel":"Back"}</button>
{step<4&&<button className={P} onClick={next} disabled={!canNext}>Next<ChevronRight className="w-4 h-4"/></button>}
{step===4&&<button className={P} onClick={saveAll} disabled={busy||!canSave}>{busy?<Loader2 className="w-4 h-4 animate-spin"/>:<Upload className="w-4 h-4"/>}Save</button>}
</div></div></div>);
}

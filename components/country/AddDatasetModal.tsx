"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Papa from "papaparse";
import { X, Search, Upload, AlertCircle, CheckCircle2, Info, Plus } from "lucide-react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";

type Props={open:boolean;countryIso:string;onClose:()=>void;onCreated?:()=>void;};
type Indicator={id:string;code:string;name:string;theme:string|null;data_type:"numeric"|"percentage"|"categorical"|null;};
const GSC_BTN="inline-flex items-center gap-2 px-3 py-2 rounded-md text-white bg-[color:var(--gsc-red)] hover:opacity-90 disabled:opacity-50";
const FIELD="w-full border rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[color:var(--gsc-red)] focus:border-[color:var(--gsc-red)]";
const LABEL="block text-sm font-medium text-[color:var(--gsc-gray)] mb-1";

export default function AddDatasetModal({open,onClose,countryIso,onCreated}:Props){
 const[file,setFile]=useState<File|null>(null),[busy,setBusy]=useState(false),[msg,setMsg]=useState<{type:"ok"|"err";text:string}|null>(null);
 const[indicators,setIndicators]=useState<Indicator[]>([]),[themes,setThemes]=useState<string[]>([]),[search,setSearch]=useState(""),[themeFilter,setThemeFilter]=useState("All");
 const[title,setTitle]=useState(""),[description,setDescription]=useState(""),[year,setYear]=useState<number|"">(""),[unit,setUnit]=useState(""),[adminLevel,setAdminLevel]=useState("ADM0");
 const[dataType,setDataType]=useState<"numeric"|"percentage"|"categorical">("numeric"),[uploadType,setUploadType]=useState<"gradient"|"categorical">("gradient");
 const[indicatorId,setIndicatorId]=useState<string|null>(null),[sourceName,setSourceName]=useState(""),[sourceUrl,setSourceUrl]=useState(""),[adminOptions,setAdminOptions]=useState([{key:"ADM0",label:"ADM0 (National)"}]);
 const fileRef=useRef<HTMLInputElement|null>(null);

 useEffect(()=>{if(!open)return;(async()=>{const{data}=await supabase.from("indicator_catalogue").select("id,code,name,theme,data_type").order("name");setIndicators(data||[]);setThemes(Array.from(new Set((data||[]).map(d=>d.theme).filter(Boolean))) as string[]);})();},[open]);

 useEffect(()=>{if(!open)return;(async()=>{try{const{data:v}=await supabase.from("admin_dataset_versions").select("id").eq("country_iso",countryIso).eq("is_active",true).maybeSingle();if(v?.id){const{data:lvls}=await supabase.from("admin_units").select("level").eq("dataset_version_id",v.id);const nums=Array.from(new Set((lvls||[]).map(r=>parseInt(String(r.level).replace("ADM",""),10)))).filter(Number.isFinite).sort((a,b)=>a-b);setAdminOptions([{key:"ADM0",label:"ADM0 (National)"},...nums.map(n=>({key:`ADM${n}`,label:`ADM${n}`}))]);}}catch{setAdminOptions([{key:"ADM0",label:"ADM0 (National)"}]);}})();},[open,countryIso]);

 const filtered=useMemo(()=>indicators.filter(i=>(themeFilter==="All"||(i.theme||"")===themeFilter)&&(!search||`${i.name} ${i.code}`.toLowerCase().includes(search.toLowerCase()))),[indicators,search,themeFilter]);
 const reset=()=>{setTitle("");setDescription("");setYear("");setUnit("");setAdminLevel("ADM0");setDataType("numeric");setUploadType("gradient");setSourceName("");setSourceUrl("");setIndicatorId(null);setFile(null);if(fileRef.current)fileRef.current.value="";setMsg(null);};
 const handleClose=()=>{if(busy)return;reset();onClose();};

 async function handleCreate(){
  if(!title.trim())return setMsg({type:"err",text:"Title required"});if(!file)return setMsg({type:"err",text:"No CSV selected"});setBusy(true);
  let metaId:string|null=null;
  try{
   const src=sourceName||sourceUrl?{name:sourceName||null,url:sourceUrl||null}:null;
   const ins={title,description:description||null,year:year===""?null:Number(year),unit:unit||null,admin_level:adminLevel,country_iso:countryIso,indicator_id:indicatorId,upload_type:uploadType,source:src?JSON.stringify(src):null};
   const{data,error}=await supabase.from("dataset_metadata").insert(ins).select("id").single();if(error)throw error;metaId=data?.id;
  }catch(e:any){setBusy(false);return setMsg({type:"err",text:`Meta save fail: ${e.message}`});}

  try{
   const parsed=Papa.parse(await file.text(),{header:true,skipEmptyLines:true});
   if(parsed.errors?.length)throw new Error(parsed.errors[0].message);
   const rows=(parsed.data as any[]).map(r=>({p:(r.pcode||r.PCode||r.admin_pcode||"").trim(),v:r.value??r.Value??"",u:r.unit??"",n:r.notes??""}));
   let ok=0,skip=0,payload:any[]=[];
   for(const r of rows){if(!r.p){skip++;continue;}let val:number|null=null;if(r.v===""||r.v==null){skip++;continue;}const n=Number(String(r.v).replace("%",""));if(Number.isFinite(n))val=n;else{skip++;continue;}ok++;payload.push({dataset_id:metaId!,admin_pcode:r.p,value:val,unit:r.u||null,notes:r.n||null});}
   for(let i=0;i<payload.length;i+=800){const{error}=await supabase.from("dataset_values").insert(payload.slice(i,i+800));if(error)throw error;}
   setBusy(false);setMsg({type:"ok",text:`Upload complete: ${ok} rows${skip?`; ${skip} skipped`:``}`});onCreated&&onCreated();
  }catch(e:any){setBusy(false);setMsg({type:"err",text:`Upload fail: ${e.message}`});}
 }

 return (
  <div className={`fixed inset-0 z-50 ${open?"":"pointer-events-none"}`}>
   <div className={`absolute inset-0 bg-black/40 ${open?"opacity-100":"opacity-0"}`} onClick={handleClose}/>
   <div className={`absolute left-1/2 top-1/2 w-full max-w-3xl -translate-x-1/2 -translate-y-1/2 rounded-lg bg-white shadow-lg ${open?"opacity-100":"opacity-0"}`}>
    <div className="flex justify-between border-b px-5 py-3">
     <h3 className="text-lg font-semibold text-[color:var(--gsc-gray)]">Add New Dataset</h3>
     <button onClick={handleClose}><X className="w-5 h-5"/></button>
    </div>

    <div className="p-5 grid grid-cols-1 lg:grid-cols-3 gap-4">
     {/* LEFT */}
     <div className="border rounded-lg p-3">
      <label className={LABEL}>Link to Indicator</label>
      <div className="flex gap-2 mb-2">
       <div className="relative flex-1">
        <Search className="w-4 h-4 text-gray-400 absolute left-2 top-2.5"/>
        <input className={`${FIELD} pl-8`} placeholder="Search..." value={search} onChange={e=>setSearch(e.target.value)}/>
       </div>
       <select className={FIELD} value={themeFilter} onChange={e=>setThemeFilter(e.target.value)}>
        <option>All</option>{themes.map(t=><option key={t}>{t}</option>)}
       </select>
      </div>
      <div className="border rounded max-h-56 overflow-auto">
       {filtered.map(i=>
        <button key={i.id} onClick={()=>setIndicatorId(indicatorId===i.id?null:i.id)}
         className={`w-full text-left px-3 py-2 border-b hover:bg-gray-50 ${indicatorId===i.id?"bg-green-50":""}`}>
         <div className="font-medium">{i.name}</div>
         <div className="text-xs text-gray-500">{i.theme||"—"} {i.data_type?`• ${i.data_type}`:""}</div>
        </button>
       )}
       {!filtered.length&&<div className="p-3 text-sm text-gray-500">No results</div>}
      </div>
      <button disabled className="mt-2 text-xs text-[color:var(--gsc-blue)] flex items-center gap-1 opacity-60"><Plus className="w-3 h-3"/>Add Indicator (soon)</button>
      <div className="mt-4">
       <label className={LABEL}>CSV File</label>
       <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={e=>setFile(e.target.files?.[0]||null)} className={FIELD}/>
       <p className="mt-1 text-xs text-gray-500">Columns: pcode,value,(unit,notes)</p>
      </div>
     </div>

     {/* RIGHT */}
     <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="md:col-span-2"><label className={LABEL}>Title *</label><input className={FIELD} value={title} onChange={e=>setTitle(e.target.value)}/></div>
      <div className="md:col-span-2"><label className={LABEL}>Description</label><textarea className={`${FIELD} min-h-[60px]`} value={description} onChange={e=>setDescription(e.target.value)}/></div>
      <div><label className={LABEL}>Year</label><input className={FIELD} type="number" value={year} onChange={e=>setYear(e.target.value===""?"":Number(e.target.value))}/></div>
      <div><label className={LABEL}>Unit</label><input className={FIELD} value={unit} onChange={e=>setUnit(e.target.value)}/></div>
      <div><label className={LABEL}>Admin Level</label><select className={FIELD} value={adminLevel} onChange={e=>setAdminLevel(e.target.value)}>{adminOptions.map(o=><option key={o.key} value={o.key}>{o.label}</option>)}</select></div>
      <div><label className={LABEL}>Dataset Type</label><select className={FIELD} value={uploadType} onChange={e=>setUploadType(e.target.value as any)}><option value="gradient">Gradient</option><option value="categorical">Categorical</option></select></div>
      <div><label className={LABEL}>Data Type</label><select className={FIELD} value={dataType} onChange={e=>setDataType(e.target.value as any)}><option value="numeric">Numeric</option><option value="percentage">Percentage</option><option value="categorical" disabled>Categorical (soon)</option></select></div>
      <div><label className={LABEL}>Source Name</label><input className={FIELD} value={sourceName} onChange={e=>setSourceName(e.target.value)}/></div>
      <div className="md:col-span-2"><label className={LABEL}>Source URL</label><input className={FIELD} value={sourceUrl} onChange={e=>setSourceUrl(e.target.value)}/></div>
     </div>
    </div>

    <div className="flex items-center justify-between border-t px-5 py-3">
     <div className="text-sm text-gray-600 flex items-center gap-2"><Info className="w-4 h-4 text-gray-400"/>Large CSVs insert in chunks</div>
     <div className="flex gap-2">
      <button onClick={handleClose} className="px-3 py-2 border rounded-md">Cancel</button>
      <button onClick={handleCreate} disabled={busy} className={GSC_BTN}><Upload className="w-4 h-4"/>{busy?"Uploading...":"Upload Dataset"}</button>
     </div>
    </div>

    {msg&&(
     <div className={`mx-5 mb-4 mt-2 rounded-md border px-3 py-2 text-sm flex items-center gap-2 ${msg.type==="ok"?"border-green-300 bg-green-50 text-green-800":"border-red-300 bg-red-50 text-red-800"}`}>
      {msg.type==="ok"?<CheckCircle2 className="w-4 h-4"/>:<AlertCircle className="w-4 h-4"/>}<span>{msg.text}</span>
     </div>
    )}
   </div>
  </div>
 );
}

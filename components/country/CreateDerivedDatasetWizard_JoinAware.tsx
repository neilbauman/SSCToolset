"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { Loader2, AlertTriangle, X } from "lucide-react";

const Btn = ({ children, onClick, variant="default", size="md", disabled=false, className="", type="button" }:any)=>(
  <button type={type} disabled={disabled} onClick={onClick}
    className={`rounded ${size==="sm"?"text-xs px-2 py-0.5":"text-sm px-3 py-1"} font-medium transition-colors ${disabled?"opacity-50 cursor-not-allowed":"cursor-pointer"} ${
      variant==="default"?"bg-blue-600 text-white hover:bg-blue-700":variant==="outline"?"border border-gray-300 text-gray-700 hover:bg-gray-50":"text-blue-600 underline hover:text-blue-800"} ${className}`}>{children}</button>
);

type M="multiply"|"ratio"|"sum"|"difference";
export default function CreateDerivedDatasetWizard_JoinAware({open,countryIso,onClose,onCreated}:{open:boolean;countryIso:string;onClose:()=>void;onCreated:()=>void;}){
  if(!open) return null;
  const ref=useRef<HTMLDivElement|null>(null);
  useEffect(()=>{const f=(e:KeyboardEvent)=>e.key==="Escape"&&onClose();window.addEventListener("keydown",f);return()=>window.removeEventListener("keydown",f);},[onClose]);

  const [d,setD]=useState<any[]>([]),[a,setA]=useState<any|null>(null),[b,setB]=useState<any|null>(null),
        [fa,setFa]=useState("pcode"),[fb,setFb]=useState("pcode"),[lvl,setLvl]=useState("ADM4"),[m,setM]=useState<M>("multiply"),
        [rows,setRows]=useState<any[]>([]),[load,setLoad]=useState(false),[show,setShow]=useState(false),
        [core,setCore]=useState(true),[oth,setOth]=useState(true),[der,setDer]=useState(true),[gis,setGis]=useState(true),
        [msg,setMsg]=useState(""),[title,setTitle]=useState(""),[ind,setInd]=useState(""),[notes,setNotes]=useState("");

  useEffect(()=>{let c=false;(async()=>{
    const arr:any[]=[];
    if(core){arr.push({id:"core-admin",title:"Administrative Boundaries",admin_level:"ADM4",dataset_type:"admin",source:"core",table_name:"admin_units"},
                      {id:"core-pop",title:"Population Data",admin_level:"ADM4",dataset_type:"population",source:"core",table_name:"population_data"});
      if(gis)arr.push({id:"core-gis",title:"GIS Features",admin_level:"ADM4",dataset_type:"gis",source:"core",table_name:"gis_features"});}
    if(oth){const {data}=await supabase.from("dataset_metadata").select("id,title,admin_level,dataset_type,country_iso").eq("country_iso",countryIso);if(data)arr.push(...data.map((x:any)=>({...x,source:"other",table_name:(x.title||`dataset_${x.id}`).replace(/\s+/g,"_").toLowerCase()})));} 
    if(der){const {data}=await supabase.from("view_derived_dataset_summary").select("derived_dataset_id,derived_title,admin_level").eq("country_iso",countryIso);
      if(data)arr.push(...data.map((x:any)=>({id:x.derived_dataset_id,title:x.derived_title,admin_level:x.admin_level,dataset_type:"derived",source:"derived",table_name:`derived_${x.derived_dataset_id}`})));}
    if(!c)setD(arr);
  })();return()=>{c=true}},[countryIso,core,oth,der,gis]);

  useEffect(()=>{if(!a||!b)return;const h=["ADM0","ADM1","ADM2","ADM3","ADM4"],ia=h.indexOf(a.admin_level||""),ib=h.indexOf(b.admin_level||"");if(ia<0||ib<0)return;
    const deep=ia>ib?a.admin_level:b.admin_level,high=ia>ib?b.admin_level:a.admin_level;setLvl(deep??"ADM4");
    setMsg(deep!==high&&deep&&high?`Aggregating ${deep} → ${high} may require summarization.`:"");
  },[a,b]);

  const prev=async()=>{if(!a||!b)return;setLoad(true);setShow(false);
    const {data,error}=await supabase.rpc("simulate_join_preview_aggregate",{table_a:a.table_name,table_b:b.table_name,field_a:fa,field_b:fb,p_country:countryIso,target_level:lvl,method:m});
    if(error)return console.error(error),setLoad(false);setRows(data||[]);setShow(true);setLoad(false);
  };

  const g={core:d.filter(x=>x.source==="core"),other:d.filter(x=>x.source==="other"),derived:d.filter(x=>x.source==="derived")};
  const click=(e:any)=>e.target===ref.current&&onClose();

  return(<div ref={ref} onClick={click} className="fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center p-4">
    <div className="w-full max-w-5xl bg-white rounded-xl shadow-xl overflow-hidden">
      <div className="flex justify-between px-4 py-3 border-b"><div><h2 className="text-lg font-semibold">Create Derived Dataset</h2><p className="text-xs text-gray-600">Step 1 Join → Step 2 Derive</p></div>
        <button onClick={onClose} className="p-1 hover:bg-gray-100"><X className="w-5 h-5"/></button></div>
      <div className="px-4 py-4 max-h-[78vh] overflow-y-auto">
        <div className="flex flex-wrap gap-4 mb-3 text-sm">{[
          ["Include Core",core,setCore],["Include Other",oth,setOth],["Include Derived",der,setDer],["Include GIS",gis,setGis]
        ].map(([l,c,s]:any,i:number)=><label key={i} className="flex items-center space-x-1"><input type="checkbox" checked={c} onChange={(e)=>s(e.target.checked)}/><span>{l}</span></label>)}</div>
        {msg&&<div className="flex items-start gap-2 bg-yellow-50 border border-yellow-300 text-xs p-2 mb-3 rounded text-yellow-700"><AlertTriangle className="w-4 h-4"/><span>{msg}</span></div>}
        <div className="grid md:grid-cols-2 gap-4 mb-4">{[
          ["Dataset A",a,setA,fa,setFa],["Dataset B",b,setB,fb,setFb]
        ].map(([l,ds,sd,f,sf]:any,i:number)=><div key={i} className="border rounded-lg p-3"><label className="text-xs font-semibold">{l}</label>
          <select className="w-full border rounded p-2 text-sm mt-1" value={ds?.id||""} onChange={(e)=>sd(d.find(x=>x.id===e.target.value)||null)}>
            <option value="">Select dataset…</option>
            {["core","other","derived"].map(k=><optgroup key={k} label={`${k[0].toUpperCase()+k.slice(1)} Datasets`}>
              {g[k as "core"|"other"|"derived"].map((x:any)=><option key={x.id} value={x.id}>{x.title}{x.admin_level?` (${x.admin_level})`:""}</option>)}</optgroup>)}
          </select>
          <div className="flex items-center gap-2 mt-2"><span className="text-xs">Join Field</span>
            <select value={f} onChange={(e)=>sf(e.target.value)} className="border rounded px-2 py-1 text-xs"><option value="pcode">pcode</option><option value="admin_pcode">admin_pcode</option><option value="id">id</option></select></div>
        </div>)}</div>
        <div className="flex items-center gap-2 mb-2"><Btn variant="outline" size="sm" onClick={prev} disabled={load||!a||!b}>{load?<><Loader2 className="w-3 h-3 animate-spin mr-1"/>Preview…</>:"Preview join"}</Btn>
          <div className="text-xs text-gray-600">Target: <b>{lvl}</b></div></div>
        {show&&<div className="mt-2 border rounded bg-gray-50">
          <div className="max-h-[30vh] overflow-y-auto bg-white rounded border">
            <table className="min-w-full text-xs"><thead className="sticky top-0 bg-gray-100 text-gray-600"><tr>
              {["PCode","Name","A","B","Derived"].map(h=><th key={h} className={`px-1 py-[2px] border ${["A","B","Derived"].includes(h)?"text-right":"text-left"}`}>{h}</th>)}</tr></thead>
              <tbody>{rows.slice(0,150).map((r,i)=><tr key={i} className="border-b hover:bg-gray-50">
                <td className="px-1 py-[2px]">{r.pcode}</td><td className="px-1 py-[2px]">{r.name}</td>
                <td className="px-1 py-[2px] text-right">{r.a??"—"}</td><td className="px-1 py-[2px] text-right">{r.b??"—"}</td>
                <td className="px-1 py-[2px] text-right font-medium">{r.derived??"—"}</td></tr>)}</tbody></table></div>
          <p className="text-[10px] text-gray-500 mt-1">Showing ≤ 150 rows.</p></div>}
        <h3 className="text-sm font-semibold mt-4 mb-2">Step 2 Derivation / Aggregation</h3>
        <div className="text-xs mb-2">Formula: <b>{a?.title||"A"} {m} {b?.title||"B"} → {lvl}</b></div>
        <div className="flex flex-wrap gap-2 mb-3">{(["multiply","ratio","sum","difference"] as M[]).map(x=><Btn key={x} size="sm" variant={m===x?"default":"outline"} onClick={()=>setM(x)}>{x}</Btn>)}</div>
        <div className="border-t pt-3 mt-4 text-sm"><h4 className="font-semibold mb-2">Result Metadata / Indicator Link</h4>
          <div className="grid md:grid-cols-2 gap-3"><div><label className="text-xs text-gray-600">Title</label>
            <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="e.g. Population Density 2025" className="w-full border rounded p-2 text-sm"/></div>
            <div><label className="text-xs text-gray-600">Indicator Match</label>
              <input value={ind} onChange={e=>setInd(e.target.value)} placeholder="Optional indicator ref" className="w-full border rounded p-2 text-sm"/></div>
            <div className="md:col-span-2"><label className="text-xs text-gray-600">Notes</label>
              <textarea value={notes} onChange={e=>setNotes(e.target.value)} className="w-full border rounded p-2 text-sm" rows={2}/></div></div></div>
      </div>
      <div className="px-4 py-3 border-t flex justify-end gap-2"><Btn variant="outline" onClick={onClose}>Cancel</Btn><Btn onClick={()=>{onCreated();onClose();}}>Create</Btn></div>
    </div></div>);
}

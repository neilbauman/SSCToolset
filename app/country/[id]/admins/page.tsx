"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { Layers, Database, Upload, CheckCircle2, Download, Edit3, Trash2 } from "lucide-react";
import DatasetHealth from "@/components/country/DatasetHealth";
import ConfirmDeleteModal from "@/components/country/ConfirmDeleteModal";
import UploadAdminUnitsModal from "@/components/country/UploadAdminUnitsModal";
import type { CountryParams } from "@/app/country/types";

type Country={iso_code:string;name:string};
type AdminVersion={id:string;country_iso:string|null;title:string;year:number|null;dataset_date:string|null;source:string|null;is_active:boolean;created_at:string;notes:string|null;};
type AdminUnit={id:string;pcode:string;name:string;level:string;parent_pcode:string|null;};
const levels=["ADM1","ADM2","ADM3","ADM4","ADM5"];

const SOURCE_CELL=({value}:{value:string|null})=>{
 if(!value)return<span>—</span>;
 try{const j=JSON.parse(value);if(j?.name)return j.url?<a href={j.url} target="_blank" className="text-blue-700 hover:underline">{j.name}</a>:<span>{j.name}</span>}catch{}
 return/^https?:\/\//i.test(value)?<a href={value} target="_blank" className="text-blue-700 hover:underline">{value}</a>:<span>{value}</span>;
};

export default function AdminsPage({params}:{params:CountryParams}){
 const {id:countryIso}=params;
 const[country,setCountry]=useState<Country|null>(null);
 const[versions,setVersions]=useState<AdminVersion[]>([]);
 const[selectedVersion,setSelectedVersion]=useState<AdminVersion|null>(null);
 const[units,setUnits]=useState<AdminUnit[]>([]);
 const[totalUnits,setTotalUnits]=useState(0);
 const[viewMode,setViewMode]=useState<"table"|"tree">("table");
 const[expanded,setExpanded]=useState(new Set<string>());
 const[levelToggles,setLevelToggles]=useState<string[]>(["ADM1"]);
 const[openUpload,setOpenUpload]=useState(false);
 const[openDelete,setOpenDelete]=useState<AdminVersion|null>(null);
 const[editingVersion,setEditingVersion]=useState<AdminVersion|null>(null);
 const[loadingMsg,setLoadingMsg]=useState("");const[progress,setProgress]=useState(0);const isFetchingRef=useRef(false);

 useEffect(()=>{(async()=>{const{data}=await supabase.from("countries").select("iso_code,name").eq("iso_code",countryIso).maybeSingle();if(data)setCountry(data as Country)})()},[countryIso]);
 const loadVersions=async()=>{const{data,error}=await supabase.from("admin_dataset_versions").select("*").eq("country_iso",countryIso).order("created_at",{ascending:false});if(error)return console.error(error);const list=data??[];setVersions(list);setSelectedVersion(list.find(v=>v.is_active)||list[0]||null)};
 useEffect(()=>{loadVersions()},[countryIso]);

 useEffect(()=>{const f=async()=>{if(!selectedVersion||isFetchingRef.current)return;isFetchingRef.current=true;setUnits([]);setProgress(0);const head=await supabase.from("admin_units").select("id",{count:"exact",head:true}).eq("dataset_version_id",selectedVersion.id);const total=head.count??0;setTotalUnits(total);if(total===0)return setProgress(100);const page=5000,pages=Math.ceil(total/page);const all:AdminUnit[]=[];for(let i=0;i<pages;i++){const{data,error}=await supabase.from("admin_units").select("id,pcode,name,level,parent_pcode").eq("dataset_version_id",selectedVersion.id).order("pcode",{ascending:true}).range(i*page,Math.min(total-1,(i+1)*page-1));if(error)throw error;all.push(...data as AdminUnit[]);setProgress(Math.round(((i+1)/pages)*100));}
 setUnits(all);setLoadingMsg("");setProgress(0);isFetchingRef.current=false;};f()},[selectedVersion]);

 const buildChains=(rows:AdminUnit[])=>{
  const byP=Object.fromEntries(rows.map(r=>[r.pcode,r]));const byPar:Record<string,AdminUnit[]>={};
  for(const r of rows)if(r.parent_pcode)(byPar[r.parent_pcode]=byPar[r.parent_pcode]||[]).push(r);
  const chains:any[]=[];const t=(n:AdminUnit,c:AdminUnit[])=>{const ch=byPar[n.pcode]||[];if(!ch.length)chains.push([...c,n]);else ch.forEach(x=>t(x,[...c,n]))};
  rows.filter(r=>!r.parent_pcode).forEach(r=>t(r,[]));return chains;
 };
 const chains=useMemo(()=>buildChains(units),[units]);

 const toggleLevel=(lvl:string)=>setLevelToggles(p=>p.includes(lvl)?p.filter(l=>l!==lvl):[...p,lvl].sort());
 const headerProps={title:`${country?.name??countryIso} – Administrative Boundaries`,group:"country-config" as const,description:"Manage hierarchical administrative units and dataset versions for this country.",breadcrumbs:<Breadcrumbs items={[{label:"Dashboard",href:"/dashboard"},{label:"Country Configuration",href:"/country"},{label:country?.name??countryIso,href:`/country/${countryIso}`},{label:"Admins"}]} />};

 return(
 <SidebarLayout headerProps={headerProps}>
  {loadingMsg&&<div className="mb-3"><div className="h-1.5 bg-gray-200 rounded"><div className="h-1.5 bg-[color:var(--gsc-red)] rounded transition-all"style={{width:`${progress}%`}}/></div><p className="text-xs mt-1 text-gray-600">{loadingMsg}</p></div>}

  <div className="border rounded-lg p-4 shadow-sm mb-6">
   <div className="flex justify-between items-center mb-3">
    <h2 className="text-lg font-semibold flex items-center gap-2"><Database className="w-5 h-5 text-green-600"/>Dataset Versions</h2>
    <div className="flex gap-2"><button onClick={()=>{const h="ADM1 Name,ADM1 PCode,ADM2 Name,ADM2 PCode,ADM3 Name,ADM3 PCode,ADM4 Name,ADM4 PCode,ADM5 Name,ADM5 PCode\n";const b=new Blob([h],{type:"text/csv"});const a=document.createElement("a");a.href=URL.createObjectURL(b);a.download="admin_units_template.csv";a.click();}}className="flex items-center text-sm text-blue-700 border px-3 py-1 rounded hover:bg-blue-50"><Download className="w-4 h-4 mr-1"/>Template</button>
     <button onClick={()=>setOpenUpload(true)}className="flex items-center text-sm text-white bg-[color:var(--gsc-red)] px-3 py-1 rounded hover:opacity-90"><Upload className="w-4 h-4 mr-1"/>Upload</button></div>
   </div>
   <table className="w-full text-sm border rounded">
    <thead className="bg-gray-100"><tr><th>Title</th><th>Year</th><th>Date</th><th>Source</th><th>Status</th><th></th></tr></thead>
    <tbody>{versions.map(v=><tr key={v.id}className={`hover:bg-gray-50 ${v.is_active?"bg-green-50":""}`}><td onClick={()=>setSelectedVersion(v)}className="border px-2 py-1 cursor-pointer">{v.title}</td><td className="border px-2">{v.year??"—"}</td><td className="border px-2">{v.dataset_date??"—"}</td><td className="border px-2"><SOURCE_CELL value={v.source}/></td><td className="border px-2">{v.is_active?<span className="text-green-700 flex items-center gap-1"><CheckCircle2 className="w-4 h-4"/>Active</span>:"—"}</td>
     <td className="border px-2"><div className="flex justify-end gap-2">{!v.is_active&&<button onClick={async()=>{await supabase.from("admin_dataset_versions").update({is_active:false}).eq("country_iso",countryIso);await supabase.from("admin_dataset_versions").update({is_active:true}).eq("id",v.id);loadVersions();}}className="text-blue-600 text-xs hover:underline">Set Active</button>}
      <button onClick={()=>setEditingVersion(v)}className="text-gray-600 text-xs hover:underline flex items-center"><Edit3 className="w-4 h-4 mr-1"/>Edit</button>
      <button onClick={()=>setOpenDelete(v)}className="text-[color:var(--gsc-red)] text-xs hover:underline flex items-center"><Trash2 className="w-4 h-4 mr-1"/>Delete</button></div></td></tr>)}</tbody>
   </table>
  </div>

  <div className="flex justify-between mb-3">
   <div className="border rounded-lg p-3 bg-white shadow-sm flex items-center gap-3">
    <span className="font-semibold text-sm">Admin Levels</span>
    {levels.map(l=><label key={l}className="flex items-center gap-1 text-sm"><input type="checkbox"checked={levelToggles.includes(l)}onChange={()=>toggleLevel(l)}/>{l}</label>)}
   </div>
   <DatasetHealth totalUnits={totalUnits}/>
  </div>

  <div className="flex justify-between items-center mb-2">
   <h2 className="text-lg font-semibold flex items-center gap-2"><Layers className="w-5 h-5 text-blue-600"/>Administrative Units</h2>
   <div className="flex gap-2">
    <button className={`px-3 py-1 text-sm border rounded ${viewMode==="table"?"bg-blue-50 border-blue-400":""}`}onClick={()=>setViewMode("table")}>Table</button>
    <button className={`px-3 py-1 text-sm border rounded ${viewMode==="tree"?"bg-blue-50 border-blue-400":""}`}onClick={()=>setViewMode("tree")}>Tree</button>
   </div>
  </div>

  {viewMode==="table"?(
   <div className="overflow-x-auto border rounded">
    <table className="w-full text-sm">
     <thead className="bg-gray-100"><tr>{levelToggles.map(l=><th key={l}className="px-2 py-1 text-left">{l}</th>)}</tr></thead>
     <tbody>
 {chains.map((ch: AdminUnit[], i: number) => (
  <tr key={i}>
   {levelToggles.map((l: string) => {
     const u: AdminUnit | undefined = ch.find((x: AdminUnit) => x.level === l);
     return (
       <td key={l} className="px-2 py-1">
         {u?.name ?? "—"}
       </td>
     );
   })}
  </tr>
 ))}
</tbody>
    </table>
   </div>
  ):<div className="border rounded-lg p-3 bg-white shadow-sm text-sm italic text-gray-500">Tree prototype TBD</div>}

  {openUpload&&<UploadAdminUnitsModal open={openUpload}onClose={()=>setOpenUpload(false)}countryIso={countryIso}onUploaded={loadVersions}/>}
  {openDelete&&<ConfirmDeleteModal open message={`Delete "${openDelete.title}" and related units?`}onClose={()=>setOpenDelete(null)}onConfirm={async()=>{const ids=(await supabase.from("admin_units").select("id").eq("dataset_version_id",openDelete.id)).data?.map(x=>x.id)||[];if(ids.length)await supabase.from("admin_units").delete().in("id",ids);await supabase.from("admin_dataset_versions").delete().eq("id",openDelete.id);setOpenDelete(null);loadVersions();}}/>}
 </SidebarLayout>);
}

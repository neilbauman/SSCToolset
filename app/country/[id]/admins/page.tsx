"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { Layers, Database, Upload, ChevronDown, ChevronRight, Edit3, Trash2, CheckCircle2, Download } from "lucide-react";
import DatasetHealth from "@/components/country/DatasetHealth";
import ConfirmDeleteModal from "@/components/country/ConfirmDeleteModal";
import UploadAdminUnitsModal from "@/components/country/UploadAdminUnitsModal";
import type { CountryParams } from "@/app/country/types";

type Country = { iso_code: string; name: string };
type AdminVersion = { id: string; country_iso: string | null; title: string; year: number | null; dataset_date: string | null; source: string | null; is_active: boolean; created_at: string; notes: string | null };
type AdminUnit = { id: string; pcode: string; name: string; level: string; parent_pcode: string | null };
type TreeNode = AdminUnit & { children: TreeNode[] };
type Row = Record<string, string>;

const SOURCE_CELL = ({ value }: { value: string | null }) => {
  if (!value) return <span>—</span>;
  try {
    const p = JSON.parse(value);
    if (p?.name) return p.url ? <a href={p.url} target="_blank" rel="noreferrer" className="text-blue-700 hover:underline">{p.name}</a> : <span>{p.name}</span>;
  } catch {}
  return <span>{value}</span>;
};

const buildTree = (rows: AdminUnit[]): TreeNode[] => {
  const map: Record<string, TreeNode> = {}; const roots: TreeNode[] = [];
  rows.forEach(r => map[r.pcode] = { ...r, children: [] });
  rows.forEach(r => r.parent_pcode && map[r.parent_pcode] ? map[r.parent_pcode].children.push(map[r.pcode]) : roots.push(map[r.pcode]));
  const sort = (n: TreeNode[]) => { n.sort((a,b)=>a.pcode.localeCompare(b.pcode)); n.forEach(c=>sort(c.children)); }; sort(roots);
  return roots;
};

const flattenHierarchy = (nodes: TreeNode[]): Row[] => {
  const out: Row[] = []; const dfs = (n: TreeNode, p: Row) => { const next = { ...p, [n.level]: n.name }; n.children.length ? n.children.forEach(c => dfs(c,next)) : out.push(next); };
  nodes.forEach(n => dfs(n, {})); return out;
};

export default function AdminsPage({ params }: { params: CountryParams }) {
  const { id: countryIso } = params;
  const [country,setCountry]=useState<Country|null>(null),[versions,setVersions]=useState<AdminVersion[]>([]),[selectedVersion,setSelectedVersion]=useState<AdminVersion|null>(null);
  const [units,setUnits]=useState<AdminUnit[]>([]),[total,setTotal]=useState(0),[view,setView]=useState<"table"|"tree">("table"),[expanded,setExpanded]=useState(new Set<string>());
  const [openUpload,setOpenUpload]=useState(false),[openDelete,setOpenDelete]=useState<AdminVersion|null>(null),[edit,setEdit]=useState<AdminVersion|null>(null);
  const [progress,setProgress]=useState(0);const ref=useRef(false);
  const levels=["ADM1","ADM2","ADM3","ADM4","ADM5"];const [selLvls,setSelLvls]=useState(["ADM1"]);
  const toggleLvl=(lvl:string)=>{const i=levels.indexOf(lvl);setSelLvls(p=>p.includes(lvl)?levels.slice(0,i):levels.slice(0,i+1));};

  useEffect(()=>{(async()=>{const {data}=await supabase.from("countries").select("iso_code,name").eq("iso_code",countryIso).maybeSingle();if(data)setCountry(data as Country);})();},[countryIso]);
  const loadVersions=async()=>{const {data}=await supabase.from("admin_dataset_versions").select("*").eq("country_iso",countryIso).order("created_at",{ascending:false});const l=data??[];setVersions(l);setSelectedVersion(l.find(v=>v.is_active)||l[0]||null);};
  useEffect(()=>{loadVersions();},[countryIso]);

  useEffect(()=>{const f=async()=>{if(!selectedVersion||ref.current)return;ref.current=true;const {count}=await supabase.from("admin_units").select("id",{count:"exact",head:true}).eq("dataset_version_id",selectedVersion.id);setTotal(count??0);
    const ps=5000,pages=Math.ceil((count??0)/ps),all:AdminUnit[]=[];for(let i=0;i<pages;i++){const {data}=await supabase.from("admin_units").select("id,pcode,name,level,parent_pcode").eq("dataset_version_id",selectedVersion.id).order("pcode",{ascending:true}).range(i*ps,Math.min((i+1)*ps-1,(count??0)-1));if(data)all.push(...data);setProgress(Math.round(((i+1)/pages)*100));}
    setUnits(all);ref.current=false;};f();},[selectedVersion]);

  const tree=useMemo(()=>buildTree(units),[units]);
  const limited=useMemo(()=>{const m=selLvls.length;const lim=(n:TreeNode[],d=1):TreeNode[]=>d>m?[]:n.map(x=>({...x,children:lim(x.children,d+1)}));return lim(tree);},[tree,selLvls]);
  const rows=useMemo(()=>{const r=flattenHierarchy(tree),seen=new Set<string>(),u:Row[]=[];for(const x of r){const k=selLvls.map(l=>x[l]??"").join("|");if(!seen.has(k)){seen.add(k);const o:Row={};selLvls.forEach(l=>o[l]=x[l]??"—");u.push(o);}}return u;},[tree,selLvls]);

  const delVer=async(id:string)=>{await supabase.from("admin_units").delete().eq("dataset_version_id",id);await supabase.from("admin_dataset_versions").delete().eq("id",id);setOpenDelete(null);loadVersions();};
  const actVer=async(v:AdminVersion)=>{await supabase.from("admin_dataset_versions").update({is_active:false}).eq("country_iso",countryIso);await supabase.from("admin_dataset_versions").update({is_active:true}).eq("id",v.id);loadVersions();};
  const saveEdit=async(p:Partial<AdminVersion>)=>{if(!edit)return;await supabase.from("admin_dataset_versions").update(p).eq("id",edit.id);setEdit(null);loadVersions();};

  const headerProps={title:`${country?.name??countryIso} – Administrative Boundaries`,group:"country-config" as const,description:"Manage hierarchical administrative units and dataset versions for this country.",breadcrumbs:<Breadcrumbs items={[{label:"Dashboard",href:"/dashboard"},{label:"Country Configuration",href:"/country"},{label:country?.name??countryIso,href:`/country/${countryIso}`},{label:"Admins"}]} />};

  return <SidebarLayout headerProps={headerProps}>
    {progress>0&&<div className="mb-3"><div className="h-1.5 w-full bg-gray-200 rounded"><div className="h-1.5 bg-[color:var(--gsc-red)] rounded transition-all" style={{width:`${progress}%`}}/></div></div>}
    <div className="border rounded-lg p-4 shadow-sm mb-6"><div className="flex justify-between items-center mb-3"><h2 className="text-lg font-semibold flex items-center gap-2"><Database className="w-5 h-5 text-green-600"/>Dataset Versions</h2><div className="flex gap-2"><button onClick={()=>{const h=["ADM1 Name","ADM1 PCode","ADM2 Name","ADM2 PCode","ADM3 Name","ADM3 PCode","ADM4 Name","ADM4 PCode","ADM5 Name","ADM5 PCode"].join(",");const b=new Blob([`${h}\n`],{type:"text/csv"});const u=URL.createObjectURL(b);const a=document.createElement("a");a.href=u;a.download="admin_units_template.csv";a.click();URL.revokeObjectURL(u);}} className="flex items-center text-sm text-blue-700 border px-3 py-1 rounded hover:bg-blue-50"><Download className="w-4 h-4 mr-1"/>Template</button><button onClick={()=>setOpenUpload(true)} className="flex items-center text-sm text-white bg-[color:var(--gsc-red)] px-3 py-1 rounded hover:opacity-90"><Upload className="w-4 h-4 mr-1"/>Upload Dataset</button></div></div>
    {versions.length?<table className="w-full text-sm border rounded"><thead className="bg-gray-100"><tr><th>Title</th><th>Year</th><th>Date</th><th>Source</th><th>Status</th><th className="text-right">Actions</th></tr></thead><tbody>{versions.map(v=><tr key={v.id} className={`hover:bg-gray-50 ${v.is_active?"bg-green-50":""}`}><td onClick={()=>setSelectedVersion(v)} className={`border px-2 py-1 cursor-pointer ${selectedVersion?.id===v.id?"font-semibold":""}`}>{v.title}</td><td className="border px-2 py-1">{v.year??"—"}</td><td className="border px-2 py-1">{v.dataset_date??"—"}</td><td className="border px-2 py-1"><SOURCE_CELL value={v.source}/></td><td className="border px-2 py-1">{v.is_active?<span className="text-green-700 flex items-center gap-1"><CheckCircle2 className="w-4 h-4"/>Active</span>:"—"}</td><td className="border px-2 py-1 text-right flex gap-2 justify-end">{!v.is_active&&<button onClick={()=>actVer(v)} className="text-blue-600 text-xs hover:underline">Set Active</button>}<button onClick={()=>setEdit(v)} className="text-gray-700 text-xs hover:underline flex items-center"><Edit3 className="w-4 h-4 mr-1"/>Edit</button><button onClick={()=>setOpenDelete(v)} className="text-[color:var(--gsc-red)] text-xs hover:underline flex items-center"><Trash2 className="w-4 h-4 mr-1"/>Delete</button></td></tr>)}</tbody></table>:<p className="italic text-gray-500">No dataset versions uploaded yet.</p>}</div>
    <div className="flex justify-between items-start mb-4 gap-4"><div className="border rounded-lg p-3 shadow-sm bg-white"><h3 className="font-semibold text-sm mb-2">Admin Levels</h3><div className="flex gap-3 flex-wrap">{levels.map(l=><label key={l} className="flex items-center gap-1 text-sm"><input type="checkbox" checked={selLvls.includes(l)} onChange={()=>toggleLvl(l)}/>{l}</label>)}</div></div><DatasetHealth totalUnits={total}/></div>
    <div className="flex justify-between items-center mb-3"><h2 className="text-lg font-semibold flex items-center gap-2"><Layers className="w-5 h-5 text-blue-600"/>Administrative Units</h2><div className="flex gap-2"><button className={`px-3 py-1 text-sm border rounded ${view==="table"?"bg-blue-50 border-blue-400":""}`} onClick={()=>setView("table")}>Table</button><button className={`px-3 py-1 text-sm border rounded ${view==="tree"?"bg-blue-50 border-blue-400":""}`} onClick={()=>setView("tree")}>Tree</button></div></div>
    {view==="table"?<div className="overflow-x-auto border rounded"><table className="w-full text-sm"><thead className="bg-gray-100"><tr>{selLvls.map(l=><th key={l} className="px-2 py-1 text-left">{l}</th>)}</tr></thead><tbody>{rows.map((r,i)=><tr key={i} className="hover:bg-gray-50">{selLvls.map(l=><td key={l} className="border px-2 py-1">{r[l]??"—"}</td>)}</tr>)}</tbody></table></div>:
    <div className="border rounded-lg p-3 bg-white shadow-sm">{limited.length?limited.map(root=>{const render=(n:TreeNode,d=0):JSX.Element=><div key={n.pcode} style={{marginLeft:d*16}} className="py-0.5"><div className="flex items-center gap-1">{n.children.length?<button onClick={()=>{const next=new Set(expanded);next.has(n.pcode)?next.delete(n.pcode):next.add(n.pcode);setExpanded(next);}}>{expanded.has(n.pcode)?<ChevronDown className="w-4 h-4"/>:<ChevronRight className="w-4 h-4"/>}</button>:<span className="w-4 h-4"/>}<span className="font-medium">{n.name}</span><span className="text-gray-500 text-xs ml-1">{n.pcode}</span></div>{expanded.has(n.pcode)&&n.children.map(c=>render(c,d+1))}</div>;return render(root);}):<p className="italic text-gray-500">No admin units found.</p>}</div>}
    {openUpload&&<UploadAdminUnitsModal open={openUpload} onClose={()=>setOpenUpload(false)} countryIso={countryIso} onUploaded={loadVersions}/>}
    {openDelete&&<ConfirmDeleteModal open={!!openDelete} message={`This will remove "${openDelete.title}" and all related units.`} onClose={()=>setOpenDelete(null)} onConfirm={()=>delVer(openDelete.id)}/>}
    {edit&&<div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"><div className="bg-white rounded-lg shadow-lg p-5 w-full max-w-md"><h3 className="text-lg font-semibold mb-3">Edit Version</h3><div className="space-y-2">{["title","year","dataset_date","source","notes"].map(f=><label key={f} className="block text-sm capitalize">{f}<input type="text" value={(edit as any)[f]??""} onChange={e=>setEdit({...edit,[f]:e.target.value||null})} className="border rounded w-full px-2 py-1 mt-1 text-sm"/></label>)}</div><div className="flex justify-end gap-2 mt-4"><button onClick={()=>setEdit(null)} className="px-3 py-1 text-sm border rounded">Cancel</button><button onClick={()=>saveEdit(edit)} className="px-3 py-1 text-sm bg-[color:var(--gsc-green)] text-white rounded">Save</button></div></div></div>}
  </SidebarLayout>;
}

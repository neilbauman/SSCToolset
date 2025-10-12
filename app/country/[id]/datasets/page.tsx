"use client";

import { useEffect, useState } from "react";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { Eye, Pencil, Trash2, Loader2, Download } from "lucide-react";
import AddDatasetModal from "@/components/country/AddDatasetModal";
import EditDatasetModal from "@/components/country/EditDatasetModal";
import TemplateDownloadModal from "@/components/country/TemplateDownloadModal";
import ConfirmDeleteModal from "@/components/country/ConfirmDeleteModal";
import type { CountryParams } from "@/app/country/types";

type Meta = {
  id: string; title: string; indicator_id: string | null;
  dataset_type: string | null; data_type: string | null;
  admin_level: string | null; unit: string | null;
  source_name: string | null; source_url: string | null;
  description: string | null;
};
type Row = { admin_name: string | null; admin_pcode: string; value: number | null };

export default function CountryDatasetsPage({ params }: { params: CountryParams }) {
  const iso = params.id;
  const [country, setCountry] = useState(iso);
  const [datasets, setDatasets] = useState<Meta[]>([]);
  const [inds, setInds] = useState<Record<string, string>>({});
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [openAdd, setOpenAdd] = useState(false);
  const [openTpl, setOpenTpl] = useState(false);
  const [openEdit, setOpenEdit] = useState<Meta | null>(null);
  const [del, setDel] = useState<Meta | null>(null);

  useEffect(() => { (async () => {
    const c = await supabase.from("countries").select("name").eq("iso_code", iso).maybeSingle();
    if (c.data?.name) setCountry(c.data.name);
  })(); }, [iso]);

  const loadAll = async () => {
    const { data } = await supabase.from("dataset_metadata").select("*").eq("country_iso", iso).order("created_at",{ascending:false});
    setDatasets(data || []);
    const ids = (data||[]).map(d=>d.indicator_id).filter(Boolean);
    if(ids.length){
      const i = await supabase.from("indicator_catalogue").select("id,name").in("id",ids);
      const map:Record<string,string>={};(i.data||[]).forEach(v=>map[v.id]=v.name);setInds(map);
    }
  };
  useEffect(()=>{loadAll();},[iso]);

  const startPreview = async (d:Meta)=>{
    setPreviewId(d.id===previewId?null:d.id); if(d.id===previewId)return;
    setLoading(true);
    const q=await supabase.from("dataset_values")
      .select("admin_pcode,value,admin_units(name)")
      .eq("dataset_id",d.id).limit(200);
    const r=(q.data||[]).map((x:any)=>({admin_name:x.admin_units?.name||null,admin_pcode:x.admin_pcode,value:x.value}));
    setRows(r);setLoading(false);
  };

  const delDataset=async(id:string)=>{await supabase.from("dataset_values").delete().eq("dataset_id",id);
    await supabase.from("dataset_metadata").delete().eq("id",id);setDel(null);loadAll();};

  const src=(d:Meta)=>d.source_name?(<a className="text-blue-600 hover:underline" href={d.source_url||"#"} target="_blank">{d.source_name}</a>):"—";

  const headerProps={title:`${country} – Other Datasets`,group:"country-config" as const,
    description:"Upload and manage datasets such as national statistics or gradient indicators.",
    breadcrumbs:<Breadcrumbs items={[{label:"Dashboard",href:"/dashboard"},{label:"Country Configuration",href:"/country"},{label:country,href:`/country/${iso}`},{label:"Other Datasets"}]}/>};

  return(<SidebarLayout headerProps={headerProps}>
    <div className="flex justify-between items-center mb-4">
      <h2 className="text-lg font-semibold text-[color:var(--gsc-gray)]">Country Datasets</h2>
      <div className="flex gap-2">
        <button onClick={()=>setOpenTpl(true)} className="inline-flex items-center gap-2 px-3 py-2 rounded-md text-white bg-[color:var(--gsc-blue)] hover:opacity-90"><Download className="w-4 h-4"/>Template</button>
        <button onClick={()=>setOpenAdd(true)} className="inline-flex items-center gap-2 px-3 py-2 rounded-md text-white bg-[color:var(--gsc-red)] hover:opacity-90">+ Add Dataset</button>
      </div>
    </div>

    <div className="border rounded-lg p-3 shadow-sm bg-white">
      <table className="w-full text-sm">
        <thead className="bg-gray-100"><tr>
          <th className="px-2 py-1 text-left">Title</th>
          <th className="px-2 py-1 text-left">Indicator</th>
          <th className="px-2 py-1 text-left">Type</th>
          <th className="px-2 py-1 text-left">Admin Level</th>
          <th className="px-2 py-1 text-left">Data Type</th>
          <th className="px-2 py-1 text-left">Source</th>
          <th className="px-2 py-1 text-right">Actions</th>
        </tr></thead>
        <tbody>
          {datasets.map(d=>(
            <tr key={d.id} onClick={()=>startPreview(d)}
              className={`border-b last:border-b-0 hover:bg-gray-50 cursor-pointer ${previewId===d.id?"font-semibold bg-gray-50":""}`}>
              <td className="px-2 py-1">{d.title}{d.unit?<span className="text-xs text-gray-500 ml-1">({d.unit})</span>:null}</td>
              <td className="px-2 py-1">{inds[d.indicator_id||""]||"—"}</td>
              <td className="px-2 py-1 capitalize">{d.dataset_type||"—"}</td>
              <td className="px-2 py-1">{d.admin_level||"—"}</td>
              <td className="px-2 py-1">{d.data_type||"—"}</td>
              <td className="px-2 py-1">{src(d)}</td>
              <td className="px-2 py-1 text-right">
                <button className="p-1 hover:bg-gray-100 rounded" title="Edit" onClick={e=>{e.stopPropagation();setOpenEdit(d);}}><Pencil className="w-4 h-4"/></button>
                <button className="p-1 hover:bg-gray-100 rounded text-[color:var(--gsc-red)]" title="Delete" onClick={e=>{e.stopPropagation();setDel(d);}}><Trash2 className="w-4 h-4"/></button>
              </td>
            </tr>))}
          {!datasets.length&&<tr><td colSpan={7} className="py-6 text-center text-gray-500">No datasets yet.</td></tr>}
        </tbody>
      </table>
    </div>

    {previewId&&(
      <div className="mt-4 border rounded-lg bg-white shadow-sm">
        <div className="flex justify-between items-center px-4 py-2 border-b">
          <div className="font-semibold">Dataset Preview — {datasets.find(x=>x.id===previewId)?.title}</div>
          <button className="text-sm underline" onClick={()=>setPreviewId(null)}>Close</button>
        </div>
        {loading?
          <div className="p-4 flex items-center gap-2 text-sm text-gray-500"><Loader2 className="w-4 h-4 animate-spin"/>Loading…</div>:
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-100"><tr>
                <th className="px-2 py-1 text-left">Admin Name</th>
                <th className="px-2 py-1 text-left">Admin PCode</th>
                <th className="px-2 py-1 text-left">Value</th>
              </tr></thead>
              <tbody>
                {rows.map((r,i)=>(
                  <tr key={i} className="border-b last:border-b-0">
                    <td className="px-2 py-1">{r.admin_name||"—"}</td>
                    <td className="px-2 py-1">{r.admin_pcode}</td>
                    <td className="px-2 py-1">{r.value??"—"}</td>
                  </tr>
                ))}
                {!rows.length&&<tr><td colSpan={3} className="py-6 text-center text-gray-500">No rows.</td></tr>}
              </tbody>
            </table>
          </div>}
      </div>
    )}

    {openAdd&&<AddDatasetModal open={openAdd} countryIso={iso} onClose={()=>setOpenAdd(false)} onCreated={loadAll}/>}
    {openTpl&&<TemplateDownloadModal open={openTpl} onClose={()=>setOpenTpl(false)} countryIso={iso}/>}
    {openEdit&&<EditDatasetModal open={!!openEdit} dataset={openEdit} onClose={()=>setOpenEdit(null)} onSave={loadAll}/>}
    {del&&<ConfirmDeleteModal open={!!del} message={`Delete dataset "${del.title}"?`} onClose={()=>setDel(null)} onConfirm={()=>delDataset(del.id)}/>}
  </SidebarLayout>);
}

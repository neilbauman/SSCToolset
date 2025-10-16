"use client";
import { useState,useEffect } from "react";
import SidebarLayout from "@/components/layout/SidebarLayout";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { Plus,Edit3,Trash2 } from "lucide-react";
import DatasetWizard from "./DatasetWizard";
import type { CountryParams } from "@/app/country/types";

export default function CountryDatasetsPage({params}:{params:CountryParams;}){
const[countryName,setCountryName]=useState(""),[datasets,setDatasets]=useState<any[]>([]),
[preview,setPreview]=useState<any[]>([]),[selectedId,setSelectedId]=useState<string|null>(null),
[wizardOpen,setWizardOpen]=useState(false),[loading,setLoading]=useState(false);

async function loadCountry(){
 const{data}=await supabase.from("countries").select("name").eq("iso_code",params.id).single();
 setCountryName(data?.name||params.id);
}

async function loadDatasets(){
 const{data,error}=await supabase
  .from("dataset_metadata")
  .select(`
    id,title,year,admin_level,data_type,data_format,indicator_id,
    indicator_catalogue (
      name,status,
      indicator_taxonomy_links (
        taxonomy_terms(category,name)
      )
    )
  `)
  .eq("country_iso",params.id)
  .order("title");
 if(error)console.error(error);
 const formatted=(data||[]).map(d=>{
   const indicator=(Array.isArray(d.indicator_catalogue)?d.indicator_catalogue[0]:d.indicator_catalogue)||{};
   const links=indicator.indicator_taxonomy_links||[];
   const link=Array.isArray(links)?links[0]:links;
   const term=link?.taxonomy_terms?.name||null;
   const cat=link?.taxonomy_terms?.category||null;
   return{
     id:d.id,title:d.title,year:d.year,admin_level:d.admin_level,
     data_type:d.data_type,data_format:d.data_format,
     indicator_name:indicator.name||"-",
     taxonomy_category:cat,taxonomy_term:term
   };
 });
 setDatasets(formatted);
}

async function loadPreview(id:string){
 setLoading(true);setPreview([]);
 try{
   let{data,error}=await supabase.from("dataset_values")
     .select("admin_pcode,admin_level,category_label,value")
     .eq("dataset_id",id).order("admin_pcode");
   if(error)throw error;
   if(!data?.length){
     const{data:cat}=await supabase.from("dataset_values_cat")
       .select("admin_pcode,admin_level,category_label,value")
       .eq("dataset_id",id).order("admin_pcode");
     setPreview(cat||[]);
   }else setPreview(data);
 }catch(e){console.error(e);setPreview([]);}finally{setLoading(false);}
}

useEffect(()=>{loadCountry();loadDatasets();},[params.id]);
const headerProps={title:"Datasets",group:"country-config",
 description:"Reusable country datasets and linked indicators.",
 trailing:(<button onClick={()=>setWizardOpen(true)} className="bg-[color:var(--gsc-red)] text-white rounded-md px-3 py-2 text-sm flex items-center gap-2 hover:opacity-90"><Plus className="w-4 h-4"/>Add Dataset</button>)};

return(<SidebarLayout headerProps={headerProps}>
<div className="p-4 md:p-6 space-y-4">
<div className="border rounded-md overflow-hidden">
<table className="min-w-full text-sm">
<thead className="bg-[color:var(--gsc-beige)] text-[color:var(--gsc-gray)]">
<tr><th className="px-3 py-2 text-left">Title</th><th>Year</th><th>Admin</th><th>Type</th><th>Format</th><th>Indicator</th><th>Taxonomy Category</th><th>Taxonomy Term(s)</th><th className="w-28">Actions</th></tr>
</thead>
<tbody>
{datasets.map(d=><tr key={d.id} onClick={()=>{setSelectedId(d.id);loadPreview(d.id);}}
className={`cursor-pointer ${selectedId===d.id?"bg-[color:var(--gsc-beige)] font-semibold":""}`}>
<td className="px-3 py-2">{d.title}</td><td>{d.year||"-"}</td><td>{d.admin_level}</td><td>{d.data_type}</td><td>{d.data_format}</td>
<td>{d.indicator_name}</td><td>{d.taxonomy_category||"-"}</td><td>{d.taxonomy_term||"-"}</td>
<td className="flex gap-2 justify-center">
<button className="p-1 border rounded hover:bg-gray-50"><Edit3 className="w-4 h-4 text-gray-600"/></button>
<button className="p-1 border rounded hover:bg-gray-50"><Trash2 className="w-4 h-4 text-[color:var(--gsc-red)]"/></button></td></tr>)}
</tbody></table></div>

{selectedId&&(<div className="border rounded-md mt-4">
<div className="px-3 py-2 font-medium bg-[color:var(--gsc-beige)] text-[color:var(--gsc-gray)]">Data Preview — {datasets.find(x=>x.id===selectedId)?.title}</div>
<div className="p-3 text-xs overflow-auto">
{loading?<div>Loading...</div>:preview.length===0?<div>No rows to display.</div>:
(<table className="min-w-full"><thead><tr><th className="text-left px-2 py-1 border-b">Admin PCode</th><th className="text-left px-2 py-1 border-b">Admin Level</th><th className="text-left px-2 py-1 border-b">Category</th><th className="text-left px-2 py-1 border-b">Value</th></tr></thead>
<tbody>{preview.map((r,i)=><tr key={i}><td className="px-2 py-1 border-b">{r.admin_pcode}</td><td className="px-2 py-1 border-b">{r.admin_level||"-"}</td><td className="px-2 py-1 border-b">{r.category_label||"-"}</td><td className="px-2 py-1 border-b">{r.value??"-"}</td></tr>)}</tbody></table>)}
</div></div>)}
{wizardOpen&&<DatasetWizard countryIso={params.id} onClose={()=>setWizardOpen(false)} onSaved={()=>{setWizardOpen(false);loadDatasets();}}/>}
</div></SidebarLayout>);
}

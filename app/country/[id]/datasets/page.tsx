"use client";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import SidebarLayout from "@/components/layout/SidebarLayout";
import { Loader2, Pencil, Trash2, ChevronUp, ChevronDown } from "lucide-react";

type DatasetRow={id:string;title:string;year:number|null;admin_level:string|null;data_type:"gradient"|"categorical"|"text";data_format:"numeric"|"percentage"|"text";indicator_id:string|null;indicator_name:string|null;created_at?:string};
type Term={id:string;name:string;category:string|null;sort_order?:number|null};

const TH="text-left text-xs font-medium text-gray-600 px-3 py-2 border-b select-none";
const TD="px-3 py-2 border-b text-sm";
const BTN="inline-flex items-center gap-2 rounded px-2 py-1 text-sm border hover:bg-gray-50";
const CARD="rounded border bg-white shadow-sm";
const ROW_SEL="bg-[color:var(--gsc-beige)] font-semibold";

export default function CountryDatasetsPage(){
  const params=useParams<{id:string}>(); const countryIso=params?.id??"";
  const[loading,setLoading]=useState(true); const[err,setErr]=useState<string|null>(null);
  const[datasets,setDatasets]=useState<DatasetRow[]>([]); const[selectedId,setSelectedId]=useState<string|null>(null);
  const[taxByIndicator,setTaxByIndicator]=useState<Record<string,Term[]>>({});
  const[dataLoading,setDataLoading]=useState(false); const[dataPreview,setDataPreview]=useState<any[]>([]);
  const[sortKey,setSortKey]=useState<string>("created_at"); const[sortAsc,setSortAsc]=useState(false);
  const headerProps={title:"Datasets",group:"country-config" as const,description:"Reusable country datasets and linked indicators."};

  async function loadDatasets(){
    setLoading(true); setErr(null);
    try{
      const{data,error}=await supabase.from("dataset_metadata")
        .select("id,title,year,admin_level,data_type,data_format,indicator_id,created_at,indicator_catalogue(name)")
        .eq("country_iso",countryIso).order("created_at",{ascending:false});
      if(error) throw error;
      const rows:DatasetRow[]=(data??[]).map((r:any)=>({id:r.id,title:r.title,year:r.year??null,admin_level:r.admin_level??null,
        data_type:(r.data_type??"gradient") as any,data_format:(r.data_format??"numeric") as any,
        indicator_id:r.indicator_id??null,indicator_name:r.indicator_catalogue?.name??null,created_at:r.created_at}));
      setDatasets(rows);

      const indIds=Array.from(new Set(rows.map(r=>r.indicator_id).filter(Boolean))) as string[];
      if(indIds.length){
        const{data:links}=await supabase.from("indicator_taxonomy_links").select("indicator_id,taxonomy_id").in("indicator_id",indIds);
        const termIds=Array.from(new Set((links??[]).map((l:any)=>l.taxonomy_id)));
        let termMap:Record<string,Term>={};
        if(termIds.length){
          const{data:terms}=await supabase.from("taxonomy_terms").select("id,name,category,sort_order").in("id",termIds).order("sort_order",{ascending:true});
          for(const t of terms??[]) termMap[t.id]=t as Term;
        }
        const grouped:Record<string,Term[]>={};
        (links??[]).forEach((l:any)=>{const t=termMap[l.taxonomy_id]; if(!t) return; (grouped[l.indicator_id]??=[]).push(t);});
        Object.keys(grouped).forEach(k=> grouped[k].sort((a,b)=>(a.sort_order??0)-(b.sort_order??0)||(a.name??"").localeCompare(b.name??"")));
        setTaxByIndicator(grouped);
      } else setTaxByIndicator({});

      if(!selectedId && rows.length) setSelectedId(rows[0].id);
    }catch(e:any){ setErr(e.message??"Failed to load datasets."); }
    finally{ setLoading(false); }
  }

  async function loadPreview(ds:DatasetRow){
    setDataLoading(true); setDataPreview([]); setErr(null);
    try{
      let rows:any[]=[];
      // Prefer view if present (and has rows)
      try{
        const {data, error}=await supabase.from("view_dataset_values_with_names").select("*").eq("dataset_id",ds.id).limit(100);
        if(error) throw error; if(data?.length) rows=data;
      }catch(_e){/* ignore if view missing */}
      // Fallback to base tables
      if(!rows.length){
        if(ds.data_type==="categorical"){
          const {data,error}=await supabase.from("dataset_values_cat")
            .select("admin_pcode,admin_level,category_code,category_label") // <- only columns guaranteed
            .eq("dataset_id",ds.id).limit(100);
          if(error) throw error;
          rows=data??[];
          // if still empty, look in dataset_values (wizard now writes categorical there too)
          if(!rows.length){
            const {data:dv, error:err2}=await supabase.from("dataset_values")
              .select("admin_pcode,admin_level,category_label,value")
              .eq("dataset_id",ds.id).limit(100);
            if(err2) throw err2; rows=dv??[];
          }
        }else{
          const {data,error}=await supabase.from("dataset_values")
            .select("admin_pcode,admin_level,value,text_value,unit,category_label")
            .eq("dataset_id",ds.id).limit(100);
          if(error) throw error; rows=data??[];
        }
      }
      if(rows.length && "dataset_id" in rows[0]) rows=rows.map(({dataset_id,...r}:any)=>r);
      setDataPreview(rows);
    }catch(e:any){ setErr(e.message??"Failed to load dataset preview."); }
    finally{ setDataLoading(false); }
  }

  useEffect(()=>{ if(countryIso) loadDatasets(); },[countryIso]);
  useEffect(()=>{ const ds=datasets.find(d=>d.id===selectedId); if(ds) loadPreview(ds); },[selectedId,datasets]);

  function derivedCat(d:DatasetRow){const t=d.indicator_id?(taxByIndicator[d.indicator_id]??[]):[];return t[0]?.category??"";}
  function derivedTerms(d:DatasetRow){const t=d.indicator_id?(taxByIndicator[d.indicator_id]??[]):[];return t.map(x=>x.name).join(", ");}
  function setSort(k:string){ if(sortKey===k) setSortAsc(!sortAsc); else{ setSortKey(k); setSortAsc(true);} }
  const sortedDatasets=useMemo(()=>{ const arr=[...datasets];
    arr.sort((a,b)=>{const k=sortKey;
      const va=k==="__cat"?derivedCat(a):k==="__terms"?derivedTerms(a):(a as any)[k];
      const vb=k==="__cat"?derivedCat(b):k==="__terms"?derivedTerms(b):(b as any)[k];
      if(va==null&&vb==null)return 0;if(va==null)return 1;if(vb==null)return-1;
      if(typeof va==="number"&&typeof vb==="number")return sortAsc?va-vb:vb-va;
      const sa=String(va).toLowerCase(),sb=String(vb).toLowerCase();return sortAsc?sa.localeCompare(sb):sb.localeCompare(sa);});
    return arr;},[datasets,sortKey,sortAsc,taxByIndicator]);

  async function onDelete(id:string){
    const ds=datasets.find(d=>d.id===id); if(!ds) return;
    if(!confirm(`Delete dataset "${ds.title}"? This will remove its rows.`)) return;
    try{ setLoading(true);
      const {error}=await supabase.from("dataset_metadata").delete().eq("id",id);
      if(error) throw error;
      setDatasets(p=>p.filter(x=>x.id!==id)); if(selectedId===id) setSelectedId(null);
    }catch(e:any){ alert(e.message??"Delete failed."); } finally{ setLoading(false); }
  }
  const onEdit=(id:string)=>alert("Edit dataset (open wizard in edit mode)");

  return(
    <SidebarLayout headerProps={headerProps}>
      <div className="p-4 md:p-6 space-y-6">
        {err&&<div className="text-sm text-red-700 bg-red-50 border border-red-200 px-3 py-2 rounded">{err}</div>}

        <div className={CARD}>
          <div className="px-3 py-2 border-b flex items-center justify-between">
            <div className="text-sm font-medium">Datasets</div>
            {loading&&<div className="text-xs text-gray-500 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin"/>Loading…</div>}
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr>
                  {[
                    ["title","Title"],["year","Year"],["admin_level","Admin"],
                    ["data_type","Type"],["data_format","Format"],["indicator_name","Indicator"],
                    ["__cat","Taxonomy Category"],["__terms","Taxonomy Term(s)"],
                  ].map(([k,l])=>(
                    <th key={k} className={TH} onClick={()=>setSort(k)}>
                      <div className="flex items-center gap-1"><span>{l}</span>{(sortKey===k)?(sortAsc?<ChevronUp className="w-3 h-3"/>:<ChevronDown className="w-3 h-3"/>):null}</div>
                    </th>
                  ))}
                  <th className={TH}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedDatasets.map(d=>{
                  const cat=derivedCat(d), names=derivedTerms(d), isSel=d.id===selectedId;
                  return(
                    <tr key={d.id} className={`hover:bg-[color:var(--gsc-light-gray)] cursor-pointer ${isSel?ROW_SEL:""}`} onClick={()=>setSelectedId(d.id)}>
                      <td className={TD}>{d.title}</td><td className={TD}>{d.year??"-"}</td>
                      <td className={TD}>{d.admin_level??"-"}</td><td className={TD}>{d.data_type}</td><td className={TD}>{d.data_format}</td>
                      <td className={TD}>{d.indicator_name??"—"}</td><td className={TD}>{cat||"—"}</td><td className={TD}>{names||"—"}</td>
                      <td className={TD}><div className="flex items-center gap-2">
                        <button className={BTN} onClick={e=>{e.stopPropagation();onEdit(d.id);}}><Pencil className="w-4 h-4"/>Edit</button>
                        <button className={`${BTN} text-[color:var(--gsc-red)]`} onClick={e=>{e.stopPropagation();onDelete(d.id);}}><Trash2 className="w-4 h-4"/>Delete</button>
                      </div></td>
                    </tr>
                  );
                })}
                {!loading&&sortedDatasets.length===0&&<tr><td className="px-3 py-6 text-sm text-gray-500" colSpan={10}>No datasets yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        <div className={CARD}>
          <div className="px-3 py-2 border-b flex items-center justify-between">
            <div className="text-sm font-medium">Data Preview{selectedId?` — ${datasets.find(d=>d.id===selectedId)?.title}`:""}</div>
            {dataLoading&&<div className="text-xs text-gray-500 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin"/>Loading…</div>}
          </div>
          {!selectedId?(
            <div className="p-4 text-sm text-gray-500">Select a dataset above to preview its rows.</div>
          ):(
            <div className="p-3 overflow-x-auto">
              {dataPreview.length===0?(
                <div className="text-sm text-gray-500">No rows to display.</div>
              ):(
                <table className="min-w-full">
                  <thead><tr>{Object.keys(dataPreview[0]).map(k=><th key={k} className={TH}>{k}</th>)}</tr></thead>
                  <tbody>{dataPreview.map((r,i)=><tr key={i} className="odd:bg-gray-50">{Object.keys(dataPreview[0]).map(k=><td key={k} className={TD}>{String(r[k]??"")}</td>)}</tr>)}</tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </div>
    </SidebarLayout>
  );
}

"use client";
import { useState, useEffect } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { Search, Plus, Tag } from "lucide-react";
import TaxonomyPicker from "@/app/configuration/taxonomy/TaxonomyPicker";
import CreateIndicatorInlineModal from "@/components/country/CreateIndicatorInlineModal";

const F="w-full border rounded-md px-3 py-2 text-sm outline-none focus:ring-2 ring-[color:var(--gsc-red)]";
const S="inline-flex items-center gap-2 border rounded-md px-3 py-2 text-sm hover:bg-gray-50";
const L="block text-xs font-medium text-[color:var(--gsc-gray)] mb-1";

export default function Step4Indicator({
  taxonomyIds,setTaxonomyIds,indicatorId,setIndicatorId
}:{taxonomyIds:string[];setTaxonomyIds:any;indicatorId:string|null;setIndicatorId:any;}){

const[groups,setGroups]=useState<string[]>([]);
const[terms,setTerms]=useState<any[]>([]);
const[selectedGroup,setSelectedGroup]=useState("");
const[selectedTerm,setSelectedTerm]=useState("");
const[indicatorQuery,setIndicatorQuery]=useState("");
const[indicatorList,setIndicatorList]=useState<any[]>([]);
const[createIndicatorOpen,setCreateIndicatorOpen]=useState(false);

async function loadTaxonomy(){
  const{data}=await supabase.from("taxonomy_terms")
    .select("id,name,category,sort_order")
    .order("sort_order",{ascending:true});
  setTerms(data??[]);
  setGroups([...new Set((data??[]).map(t=>t.category))]);
}

async function searchIndicators(){
  let q=supabase.from("indicator_catalogue")
    .select("id,name,description,status")
    .order("name");
  if(selectedTerm){
    const link=await supabase.from("indicator_taxonomy_links")
      .select("indicator_id").eq("taxonomy_id",selectedTerm);
    const ids=(link.data??[]).map(l=>l.indicator_id);
    if(ids.length)q=q.in("id",ids);
  }
  const{data}=await q;
  setIndicatorList((data??[]).filter(i=>i.name.toLowerCase().includes(indicatorQuery.toLowerCase())));
}

useEffect(()=>{loadTaxonomy();},[]);
useEffect(()=>{searchIndicators();},[selectedTerm]);

return(<section className="space-y-4">
  <div className="flex flex-wrap gap-3">
    <div>
      <label className={L}>Filter by Group</label>
      <select className={F} value={selectedGroup} onChange={e=>{
        setSelectedGroup(e.target.value);setSelectedTerm("");
      }}>
        <option value="">All</option>
        {groups.map(g=><option key={g}>{g}</option>)}
      </select>
    </div>
    <div>
      <label className={L}>Filter by Term</label>
      <select className={F} value={selectedTerm} onChange={e=>setSelectedTerm(e.target.value)}>
        <option value="">All</option>
        {terms.filter(t=>!selectedGroup||t.category===selectedGroup)
          .map(t=><option key={t.id} value={t.id}>{t.name}</option>)}
      </select>
    </div>
  </div>

  <div><label className={L}>Taxonomy Picker</label>
    <TaxonomyPicker selectedIds={taxonomyIds} onChange={setTaxonomyIds}/></div>

  <div className="grid md:grid-cols-3 gap-3">
    <div className="md:col-span-2">
      <label className={L}>Indicator</label>
      <div className="flex items-center gap-2">
        <input className={F} placeholder="Search..." value={indicatorQuery}
          onChange={e=>setIndicatorQuery(e.target.value)}
          onKeyDown={e=>e.key==="Enter"&&searchIndicators()}/>
        <button className={S} onClick={searchIndicators}><Search className="w-4 h-4"/></button>
      </div>
      <div className="mt-2 max-h-48 overflow-auto border rounded">
        {indicatorList.map(it=><div key={it.id}
          onClick={()=>setIndicatorId(it.id)}
          className={`px-3 py-2 text-sm cursor-pointer hover:bg-gray-50 ${indicatorId===it.id?"bg-gray-100":""}`}>
          <div className="flex justify-between">
            <div>{it.name}</div>
            <span className={`text-[11px] px-2 rounded ${it.status==="proposed"?"bg-yellow-100 text-yellow-800":"bg-gray-100"}`}>{it.status}</span>
          </div>
          {it.description&&<div className="text-xs text-gray-500">{it.description}</div>}
        </div>)}
      </div>
    </div>
    <div className="flex items-end">
      <button className={S} onClick={()=>setCreateIndicatorOpen(true)}>
        <Plus className="w-4 h-4"/> New
      </button>
    </div>
  </div>

  <p className="text-[11px] text-gray-500 flex items-center gap-1">
    <Tag className="w-4 h-4"/>Link or create an indicator (new ones are proposed for admin review).
  </p>

  <CreateIndicatorInlineModal
    open={createIndicatorOpen}
    onClose={()=>setCreateIndicatorOpen(false)}
    taxonomyDefault={taxonomyIds}
    onCreated={async id=>{
      await supabase.from("indicator_catalogue").update({status:"proposed"}).eq("id",id);
      await Promise.all(taxonomyIds.map(t=>
        supabase.from("indicator_taxonomy_links").insert({indicator_id:id,taxonomy_id:t})
      ));
      setIndicatorId(id);
      setCreateIndicatorOpen(false);
    }}
  />
</section>);
}

"use client";
import { useEffect, useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { WizardMeta } from "@/components/country/AddDatasetModal";

export default function Step3Indicator({
  meta, setMeta, onBack, onNext
}:{ meta:WizardMeta; setMeta:(m:WizardMeta)=>void; onBack:()=>void; onNext:()=>void }){
  const [indicators,setIndicators]=useState<{id:string;name:string}[]>([]);
  const [q,setQ]=useState(""); const [tax,setTax]=useState<{category:string|null;term:string|null}>({category:null,term:null});

  useEffect(()=>{(async()=>{
    const { data } = await supabase.from("indicator_catalogue").select("id,name").order("name");
    setIndicators(data||[]);
  })()},[]);

  useEffect(()=>{(async()=>{
    if(!meta.indicator_id){ setTax({category:null,term:null}); return; }
    const { data: link } = await supabase.from("indicator_taxonomy_links").select("taxonomy_id").eq("indicator_id", meta.indicator_id).limit(1);
    const tid=link?.[0]?.taxonomy_id; if(!tid){ setTax({category:null,term:null}); return; }
    const { data: t } = await supabase.from("taxonomy_terms").select("category,name").eq("id", tid).maybeSingle();
    setTax({category:(t as any)?.category??null, term:(t as any)?.name??null});
  })()},[meta.indicator_id]);

  return (
    <div className="space-y-4">
      <div className="grid md:grid-cols-2 gap-3">
        <label className="text-sm md:col-span-2">Search Indicators
          <input className="border rounded p-2 w-full" value={q} onChange={e=>setQ(e.target.value)} placeholder="Type to filter…"/>
        </label>
        <label className="text-sm md:col-span-2">Indicator
          <select className="border rounded p-2 w-full" value={meta.indicator_id||""} onChange={e=>setMeta({...meta,indicator_id:e.target.value})}>
            <option value="">(none)</option>
            {indicators.filter(i=>i.name.toLowerCase().includes(q.toLowerCase())).slice(0,300).map(i=><option key={i.id} value={i.id}>{i.name}</option>)}
          </select>
        </label>
      </div>

      <div className="text-xs text-gray-600">
        Taxonomy: <span className="font-medium">{tax.category??"—"}</span>{tax.term?<> • {tax.term}</>:null}
      </div>

      <div className="flex justify-between">
        <button onClick={onBack} className="px-3 py-2 rounded border">Back</button>
        <button onClick={onNext} className="px-4 py-2 rounded text-white" style={{background:"var(--gsc-blue)"}}>Continue</button>
      </div>
    </div>
  );
}

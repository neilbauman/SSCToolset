"use client";
import { useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { WizardMeta, Parsed } from "@/components/country/AddDatasetModal";
import { saveDataset, GradientRow, CategoricalRow, CategoryMapItem, DatasetType } from "@/lib/datasets/saveDataset";
import { CheckCircle2 } from "lucide-react";

export default function Step4Save({
  countryIso, datasetId, meta, adm0Value, parsed, joinCol, valueCol, catCols, onBack, onDone
}:{
  countryIso:string; datasetId:string; meta:WizardMeta; adm0Value:string;
  parsed:Parsed; joinCol:string; valueCol:string; catCols:string[];
  onBack:()=>void; onDone:()=>void;
}){
  const [saving,setSaving]=useState(false); const [ok,setOk]=useState(false); const [err,setErr]=useState("");

  async function doSave(){
    try{
      setSaving(true); setErr("");
      // Ensure metadata exists (if not already created in step1)
      if(!datasetId){
        const { data, error } = await supabase.from("dataset_metadata").insert({
          country_iso: countryIso, title: meta.title.trim()||"Untitled dataset",
          dataset_type: meta.dataset_type||"adm0", data_format: meta.data_format,
          admin_level: meta.admin_level, join_field: meta.join_field||"admin_pcode",
          indicator_id: meta.indicator_id||null, year: meta.year?Number(meta.year):null,
          unit: meta.unit||null, source_name: meta.source_name||null, source_url: meta.source_url||null,
          created_at: new Date().toISOString()
        }).select("id").single();
        if(error) throw error;
        (meta as any)._id=data.id;
      }

      const id = datasetId || (meta as any)._id;
      const base:any = {
        id, title: meta.title, country_iso: countryIso,
        admin_level: meta.admin_level, dataset_type: meta.dataset_type as DatasetType,
        data_format: meta.data_format, year: meta.year?+meta.year:null, unit: meta.unit||null,
        join_field: meta.join_field||"admin_pcode", indicator_id: meta.indicator_id||null,
        source_name: meta.source_name||null, source_url: meta.source_url||null
      };

      if(meta.admin_level==="ADM0" && !parsed.rows.length){
        await saveDataset(base, [{ admin_pcode:"ADM0", admin_level:"ADM0", value:+adm0Value, unit:meta.unit||null }]);
      } else if(meta.dataset_type==="gradient"){
        const rows:GradientRow[] = parsed.rows.map(r=>({
          admin_pcode: r[joinCol], admin_level: meta.admin_level,
          value: +((r[valueCol]??"").replace(/,/g,"")), unit: meta.unit||null
        })).filter(r=>r.admin_pcode && !isNaN(r.value));
        await saveDataset(base, rows);
      } else if(meta.dataset_type==="categorical"){
        const map:CategoryMapItem[] = catCols.map(c=>({ code:c, label:c, score:null }));
        const rows:CategoricalRow[] = [];
        catCols.forEach(c => parsed.rows.forEach(r => rows.push({
          admin_pcode: r[joinCol], admin_level: meta.admin_level,
          category_code: c, category_label: c, category_score: null
        })));
        await saveDataset(base, rows, map);
      }

      setOk(true);
      setTimeout(()=>onDone(), 700);
    }catch(e:any){ setErr(e.message||"Save failed"); } finally{ setSaving(false); }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border p-3 bg-white">
        <div className="font-medium mb-1">{meta.title||"Untitled dataset"}</div>
        <div className="text-sm text-gray-600">
          {meta.dataset_type||"adm0"} • {meta.admin_level} • {meta.data_format} {meta.unit?`(${meta.unit})`:""}
          {meta.year?` • ${meta.year}`:""} {meta.source_name?` • ${meta.source_name}`:""}
        </div>
      </div>

      {err && <div className="rounded border p-2 text-red-700 bg-red-50">{err}</div>}
      {ok && <div className="rounded border p-2 text-green-700 bg-green-50 flex items-center gap-2"><CheckCircle2 className="h-4 w-4"/>Saved!</div>}

      <div className="flex justify-between">
        <button onClick={onBack} className="px-3 py-2 rounded border">Back</button>
        <button onClick={doSave} disabled={saving} className="px-4 py-2 rounded text-white"
          style={{background:"var(--gsc-green)"}}>{saving?"Saving…":"Save Dataset"}</button>
      </div>
    </div>
  );
}

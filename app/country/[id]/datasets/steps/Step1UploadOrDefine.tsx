"use client";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { WizardMeta, Parsed } from "@/components/country/AddDatasetModal";

export default function Step1UploadOrDefine({
  countryIso, file, setFile, parseCsv, parsed, setParsed,
  meta, setMeta, datasetId, setDatasetId,
  adm0Value, setAdm0Value, onNext
}:{
  countryIso:string;
  file:File|null; setFile:(f:File|null)=>void;
  parseCsv:(f:File)=>Promise<Parsed>; parsed:Parsed; setParsed:(p:Parsed)=>void;
  meta:WizardMeta; setMeta:(m:WizardMeta)=>void;
  datasetId:string; setDatasetId:(id:string)=>void;
  adm0Value:string; setAdm0Value:(v:string)=>void;
  onNext:()=>void;
}){
  async function onFile(e:React.ChangeEvent<HTMLInputElement>){
    const f=e.target.files?.[0]||null; setFile(f);
    if(!f) return; const p=await parseCsv(f); setParsed(p);
    if(!meta.title) setMeta({...meta,title:f.name.replace(/\.(csv|xlsx)$/i,"")});
    if(meta.admin_level==="ADM0") setMeta({...meta, admin_level: "ADM0"}); // keep ADM0 default
    // infer type if >1 row
    if(p.rows.length>1) setMeta(m=>({...m, dataset_type: m.dataset_type||"gradient"} as any));
  }

  async function ensureDatasetId(){
    if(datasetId) return datasetId;
    const payload={
      country_iso:countryIso, title:meta.title.trim()||"Untitled dataset",
      dataset_type: meta.dataset_type || (file ? "gradient" : "adm0"),
      data_format: meta.data_format, admin_level: meta.admin_level,
      join_field: meta.join_field||"admin_pcode",
      indicator_id: meta.indicator_id||null,
      year: meta.year?Number(meta.year):null, unit: meta.unit||null,
      source_name: meta.source_name||null, source_url: meta.source_url||null,
      created_at: new Date().toISOString()
    };
    const { data, error } = await supabase.from("dataset_metadata").insert(payload).select("id").single();
    if(error) throw error; setDatasetId(data.id); return data.id;
  }

  async function next(){
    // ADM0 path (no file)
    if(!file && meta.admin_level==="ADM0"){
      if(adm0Value==="") { alert("Enter a national value"); return; }
      if(!meta.title.trim()) { alert("Title is required"); return; }
    } else {
      if(!file){ alert("Upload a CSV or set Admin Level = ADM0 to define a single value."); return; }
    }
    await ensureDatasetId();
    onNext();
  }

  return (
    <div className="space-y-4">
      <div className="grid md:grid-cols-2 gap-3">
        <label className="text-sm">Upload CSV
          <input type="file" accept=".csv" onChange={onFile} className="block mt-1"/>
        </label>
        <label className="text-sm">Title
          <input className="border rounded p-2 w-full" value={meta.title} onChange={e=>setMeta({...meta,title:e.target.value})}/>
        </label>

        <label className="text-sm">Admin Level
          <select className="border rounded p-2 w-full" value={meta.admin_level} onChange={e=>setMeta({...meta,admin_level:e.target.value as any})}>
            {["ADM0","ADM1","ADM2","ADM3","ADM4","ADM5"].map(a=><option key={a}>{a}</option>)}
          </select>
        </label>
        <label className="text-sm">Data Format
          <select className="border rounded p-2 w-full" value={meta.data_format} onChange={e=>setMeta({...meta,data_format:e.target.value as any})}>
            {["numeric","percentage","text"].map(a=><option key={a}>{a}</option>)}
          </select>
        </label>

        {/* ADM0 single value path */}
        {(!file && meta.admin_level==="ADM0") && (
          <label className="text-sm col-span-2">National (ADM0) Value
            <input className="border rounded p-2 w-full" value={adm0Value} onChange={e=>setAdm0Value(e.target.value)} placeholder="e.g., 5.1"/>
          </label>
        )}

        {/* Dataset type only relevant when a file is present or ADM>0 */}
        {(file || meta.admin_level!=="ADM0") && (
          <label className="text-sm">Dataset Type
            <select className="border rounded p-2 w-full" value={meta.dataset_type||""} onChange={e=>setMeta({...meta,dataset_type:e.target.value as any})}>
              <option value="">Select…</option>
              <option value="gradient">gradient</option>
              <option value="categorical">categorical</option>
              <option value="adm0">adm0</option>
            </select>
          </label>
        )}

        <label className="text-sm">Source Name
          <input className="border rounded p-2 w-full" value={meta.source_name||""} onChange={e=>setMeta({...meta,source_name:e.target.value})}/>
        </label>
        <label className="text-sm">Source URL
          <input className="border rounded p-2 w-full" value={meta.source_url||""} onChange={e=>setMeta({...meta,source_url:e.target.value})}/>
        </label>
        <label className="text-sm">Year
          <input className="border rounded p-2 w-full" value={meta.year||""} onChange={e=>setMeta({...meta,year:e.target.value})}/>
        </label>
        <label className="text-sm">Unit
          <input className="border rounded p-2 w-full" value={meta.unit||""} onChange={e=>setMeta({...meta,unit:e.target.value})}/>
        </label>
      </div>

      {file && parsed.headers.length>0 && (
        <div className="text-xs text-gray-600">Parsed {parsed.rows.length} rows, {parsed.headers.length} columns.</div>
      )}

      <div className="flex justify-end">
        <button onClick={next} className="px-4 py-2 rounded text-white" style={{background:"var(--gsc-blue)"}}>Continue</button>
      </div>
    </div>
  );
}

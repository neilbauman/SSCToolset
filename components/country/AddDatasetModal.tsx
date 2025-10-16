"use client";
import * as Dialog from "@radix-ui/react-dialog";
import { useMemo, useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";

type DatasetType = "adm0" | "gradient" | "categorical";
type Parsed = { headers: string[]; rows: Record<string,string>[] };

const parseCsv = async (f: File): Promise<Parsed> => {
  const t = (await f.text()).replace(/\r/g,"");
  const lines = t.split("\n").filter(Boolean);
  const headers = (lines[0]||"").split(",").map(s=>s.trim());
  const rows = lines.slice(1).map(r=>{
    const cells=r.split(",");
    return Object.fromEntries(headers.map((h,i)=>[h,(cells[i]??"").trim()]));
  });
  return { headers, rows };
};

export default function AddDatasetModal({
  open, onOpenChange, countryIso
}: { open:boolean; onOpenChange:(v:boolean)=>void; countryIso:string }) {

  const [saving,setSaving]=useState(false);
  const [file,setFile]=useState<File|null>(null);
  const [parsed,setParsed]=useState<Parsed>({headers:[],rows:[]});
  const [datasetId,setDatasetId]=useState<string>("");

  const [title,setTitle]=useState("");
  const [adminLevel,setAdminLevel]=useState<"ADM0"|"ADM1"|"ADM2"|"ADM3"|"ADM4"|"ADM5">("ADM0");
  const [dataFormat,setDataFormat]=useState<"numeric"|"percentage"|"text">("numeric");
  const [datasetType,setDatasetType]=useState<DatasetType|"">("");
  const [joinField,setJoinField]=useState("admin_pcode");
  const [year,setYear]=useState(""); const [unit,setUnit]=useState("");
  const [sourceName,setSourceName]=useState(""); const [sourceUrl,setSourceUrl]=useState("");
  const [adm0Value,setAdm0Value]=useState("");

  const canSave = useMemo(()=>{
    if(!title.trim()) return false;
    if(!countryIso) return false;
    if(file){ return !!datasetType && !!adminLevel && !!dataFormat; }
    if(adminLevel==="ADM0"){ return adm0Value!==""; }
    return false;
  },[title,countryIso,file,datasetType,adminLevel,dataFormat,adm0Value]);

  async function onFile(e:React.ChangeEvent<HTMLInputElement>){
    const f=e.target.files?.[0]||null; setFile(f);
    if(!f) return;
    const p=await parseCsv(f); setParsed(p);
    if(!title) setTitle(f.name.replace(/\.(csv|xlsx)$/i,""));
    // best-effort default type from the presence of rows
    if(!datasetType) setDatasetType(p.rows.length>1?"gradient":"adm0");
  }

  function resetAll(){
    setSaving(false); setFile(null); setParsed({headers:[],rows:[]}); setDatasetId("");
    setTitle(""); setAdminLevel("ADM0"); setDataFormat("numeric"); setDatasetType("");
    setJoinField("admin_pcode"); setYear(""); setUnit(""); setSourceName(""); setSourceUrl(""); setAdm0Value("");
  }

  async function ensureMetadataId(){
    if(datasetId) return datasetId;
    const payload={
      country_iso:countryIso, title:title.trim(),
      dataset_type: (file ? (datasetType||"gradient") : "adm0"),
      data_format: dataFormat, admin_level: adminLevel, join_field: joinField,
      year: year?Number(year):null, unit: unit||null,
      source_name: sourceName||null, source_url: sourceUrl||null,
      created_at: new Date().toISOString()
    };
    const { data, error } = await supabase.from("dataset_metadata").insert(payload).select("id").single();
    if(error) throw error;
    setDatasetId(data.id);
    return data.id;
  }

  async function save(){
    try{
      if(!canSave) return;
      setSaving(true);

      const id = await ensureMetadataId();

      // ADM0 no-file path: one numeric/text/percentage value at national level
      if(!file && adminLevel==="ADM0"){
        const valueNum = Number(String(adm0Value).replace(/,/g,""));
        const v = isNaN(valueNum) ? null : valueNum;
        const row = { dataset_id: id, admin_pcode: "ADM0", value: v, unit: unit||null, admin_level: "ADM0" };
        const { error } = await supabase.from("dataset_values").insert(row);
        if(error) throw error;
      }

      // file path: we only persist metadata now; actual mapping/saving of rows comes in the next step after build is green
      onOpenChange(false);
      resetAll();
    }catch(e:any){
      alert(e.message||"Save failed");
    }finally{
      setSaving(false);
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={(v)=>{ onOpenChange(v); if(!v) resetAll(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-4xl -translate-x-1/2 -translate-y-1/2 rounded-xl bg-[var(--gsc-beige)] p-6 shadow-lg focus:outline-none border"
          style={{borderColor:"var(--gsc-light-gray)"}}>
          <Dialog.Title className="text-lg font-semibold mb-2">
            <span className="px-2 py-1 rounded text-white" style={{background:"var(--gsc-red)"}}>Add Dataset</span>
          </Dialog.Title>
          <div className="text-sm mb-4 text-[var(--gsc-gray)]">Step 1/4 • Upload or Define</div>

          <div className="grid md:grid-cols-2 gap-3">
            <label className="text-sm">Upload CSV
              <input type="file" accept=".csv" onChange={onFile} className="block mt-1"/>
              {file && <div className="text-xs text-gray-600 mt-1">{parsed.rows.length} rows, {parsed.headers.length} cols parsed</div>}
            </label>
            <label className="text-sm">Title
              <input className="border rounded p-2 w-full" value={title} onChange={e=>setTitle(e.target.value)} />
            </label>

            <label className="text-sm">Admin Level
              <select className="border rounded p-2 w-full" value={adminLevel} onChange={e=>setAdminLevel(e.target.value as any)}>
                {["ADM0","ADM1","ADM2","ADM3","ADM4","ADM5"].map(a=><option key={a}>{a}</option>)}
              </select>
            </label>
            <label className="text-sm">Data Format
              <select className="border rounded p-2 w-full" value={dataFormat} onChange={e=>setDataFormat(e.target.value as any)}>
                {["numeric","percentage","text"].map(a=><option key={a}>{a}</option>)}
              </select>
            </label>

            {/* Only show dataset type when a file exists or Adm>0 */}
            {(file || adminLevel!=="ADM0") && (
              <label className="text-sm">Dataset Type
                <select className="border rounded p-2 w-full" value={datasetType} onChange={e=>setDatasetType(e.target.value as any)}>
                  <option value="">Select…</option>
                  <option value="gradient">gradient</option>
                  <option value="categorical">categorical</option>
                  <option value="adm0">adm0</option>
                </select>
              </label>
            )}

            {/* ADM0 single value path if no file */}
            {(!file && adminLevel==="ADM0") && (
              <label className="text-sm">National (ADM0) Value
                <input className="border rounded p-2 w-full" value={adm0Value} onChange={e=>setAdm0Value(e.target.value)} placeholder="e.g., 5.1"/>
              </label>
            )}

            <label className="text-sm">Source Name
              <input className="border rounded p-2 w-full" value={sourceName} onChange={e=>setSourceName(e.target.value)} />
            </label>
            <label className="text-sm">Source URL
              <input className="border rounded p-2 w-full" value={sourceUrl} onChange={e=>setSourceUrl(e.target.value)} />
            </label>
            <label className="text-sm">Year
              <input className="border rounded p-2 w-full" value={year} onChange={e=>setYear(e.target.value)} />
            </label>
            <label className="text-sm">Unit
              <input className="border rounded p-2 w-full" value={unit} onChange={e=>setUnit(e.target.value)} />
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-5">
            <Dialog.Close asChild>
              <button className="px-3 py-2 rounded border">Cancel</button>
            </Dialog.Close>
            <button disabled={!canSave || saving} onClick={save} className="px-4 py-2 rounded text-white"
              style={{background:"var(--gsc-blue)"}}>
              {saving?"Saving…":"Save & Continue"}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

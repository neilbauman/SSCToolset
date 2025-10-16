"use client";
import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import Step1 from "@/app/country/[id]/datasets/steps/Step1UploadOrDefine";
import Step2 from "@/app/country/[id]/datasets/steps/Step2Preview";
import Step3 from "@/app/country/[id]/datasets/steps/Step3Indicator";
import Step4 from "@/app/country/[id]/datasets/steps/Step4Save";
import { DatasetType } from "@/lib/datasets/saveDataset";

export type WizardMeta = {
  title: string; dataset_type: DatasetType | ""; data_format: "numeric"|"percentage"|"text";
  admin_level: "ADM0"|"ADM1"|"ADM2"|"ADM3"|"ADM4"|"ADM5";
  join_field: string; year?: string; unit?: string; source_name?: string; source_url?: string;
  indicator_id?: string;
};
export type Parsed = { headers: string[]; rows: Record<string,string>[] };

const parseCsv = async (f: File): Promise<Parsed> => {
  const t = (await f.text()).replace(/\r/g,""); const lines=t.split("\n").filter(Boolean);
  const headers = lines[0].split(",").map(s=>s.trim());
  const rows = lines.slice(1).map(r=>{ const c=r.split(","); return Object.fromEntries(headers.map((h,i)=>[h,(c[i]??"").trim()])); });
  return { headers, rows };
};

export default function AddDatasetModal({
  open, onOpenChange, countryIso
}: { open:boolean; onOpenChange:(v:boolean)=>void; countryIso:string }) {

  const [step,setStep]=useState(1);
  const [file,setFile]=useState<File|null>(null);
  const [parsed,setParsed]=useState<Parsed>({headers:[],rows:[]});
  const [datasetId,setDatasetId]=useState<string>("");
  const [meta,setMeta]=useState<WizardMeta>({
    title:"", dataset_type:"" as any, data_format:"numeric", admin_level:"ADM0",
    join_field:"admin_pcode", year:"", unit:"", source_name:"", source_url:"", indicator_id:""
  });
  const [joinCol,setJoinCol]=useState("admin_pcode");
  const [valueCol,setValueCol]=useState("");       // gradient
  const [catCols,setCatCols]=useState<string[]>([]); // categorical
  const [adm0Value,setAdm0Value]=useState<string>("");

  const canNext = useMemo(()=> {
    if(step===1){
      if(file){ return !!meta.title && !!meta.admin_level && !!meta.data_format; }
      // ADM0 no file
      return meta.admin_level==="ADM0" && !!meta.data_format && !!meta.title && adm0Value!==""; 
    }
    if(step===2){
      if(meta.dataset_type==="gradient") return !!joinCol && !!valueCol;
      if(meta.dataset_type==="categorical") return !!joinCol && catCols.length>0;
      return meta.dataset_type==="adm0";
    }
    if(step===3){ return true; } // indicator optional
    return true;
  },[step,file,meta,joinCol,valueCol,catCols,adm0Value]);

  function reset(){ setStep(1); setFile(null); setParsed({headers:[],rows:[]}); setDatasetId(""); setMeta(m=>({...m,title:"",indicator_id:""})); setJoinCol("admin_pcode"); setValueCol(""); setCatCols([]); setAdm0Value(""); }

  return (
    <Dialog open={open} onOpenChange={(v)=>{ onOpenChange(v); if(!v) reset(); }}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>
            <span className="px-2 py-1 rounded text-white" style={{background:"var(--gsc-red)"}}>Dataset Wizard</span>
          </DialogTitle>
          <div className="mt-2 text-sm">
            <span className="font-medium" style={{color:"var(--gsc-blue)"}}>Step {step}/4</span> • {["Upload or Define","Preview & Map","Indicator & Taxonomy","Save"][step-1]}
          </div>
        </DialogHeader>

        <div className="bg-[var(--gsc-beige)] rounded-xl p-3">
          {step===1 && (
            <Step1
              countryIso={countryIso}
              file={file} setFile={setFile} parseCsv={parseCsv} parsed={parsed} setParsed={setParsed}
              meta={meta} setMeta={setMeta}
              datasetId={datasetId} setDatasetId={setDatasetId}
              adm0Value={adm0Value} setAdm0Value={setAdm0Value}
              onNext={()=>setStep(2)}
            />
          )}

          {step===2 && (
            <Step2
              parsed={parsed}
              meta={meta} setMeta={setMeta}
              joinCol={joinCol} setJoinCol={setJoinCol}
              valueCol={valueCol} setValueCol={setValueCol}
              catCols={catCols} setCatCols={setCatCols}
              onBack={()=>setStep(1)} onNext={()=>setStep(3)}
            />
          )}

          {step===3 && (
            <Step3
              meta={meta} setMeta={setMeta}
              onBack={()=>setStep(2)} onNext={()=>setStep(4)}
            />
          )}

          {step===4 && (
            <Step4
              countryIso={countryIso}
              datasetId={datasetId}
              meta={meta}
              adm0Value={adm0Value}
              parsed={parsed}
              joinCol={joinCol}
              valueCol={valueCol}
              catCols={catCols}
              onBack={()=>setStep(3)}
              onDone={()=>onOpenChange(false)}
            />
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          {step>1 && <button onClick={()=>setStep(step-1)} className="px-3 py-2 rounded border">Back</button>}
          <button disabled={!canNext || step>=4} onClick={()=>setStep(step+1)} className="px-4 py-2 rounded text-white"
            style={{background: canNext && step<4 ? "var(--gsc-blue)" : "var(--gsc-light-gray)"}}>Next</button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

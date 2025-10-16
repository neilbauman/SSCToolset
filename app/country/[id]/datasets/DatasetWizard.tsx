"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { ArrowLeft, ArrowRight, Upload, CheckCircle2, FileSpreadsheet } from "lucide-react";
import { saveDataset, DatasetType, MetaInput, GradientRow, Adm0Row, CategoricalRow, CategoryMapItem } from "@/lib/datasets/saveDataset";

type Parsed = { headers: string[]; rows: Record<string,string>[] };
const parseCsv=(t:string):Parsed=>{const l=t.replace(/\r/g,"").split("\n").filter(Boolean);if(!l.length)return{headers:[],rows:[]};const h=l[0].split(",").map(s=>s.trim());return{headers:h,rows:l.slice(1).map(x=>{const p=x.split(",");const o:Record<string,string>={};h.forEach((k,i)=>o[k]=(p[i]??"").trim());return o;})}};
const parseFile=async(f:File)=>f.name.endsWith(".csv")?parseCsv(await f.text()):(()=>{throw new Error("CSV only unless XLSX installed");})();

function Step({title,back,next,disable,children}:{title:string;back?:()=>void;next?:()=>void;disable?:boolean;children:any}){return(<div className="space-y-4"><h2 className="text-lg font-semibold">{title}</h2><div className="rounded-xl border p-4">{children}</div><div className="flex justify-between"><button onClick={back} disabled={!back} className="border px-3 py-1 rounded-xl"><ArrowLeft className="h-4 w-4"/>Back</button><button onClick={next} disabled={disable} className="bg-black text-white px-3 py-1 rounded-xl"><ArrowRight className="h-4 w-4"/>Next</button></div></div>)}

export default function DatasetWizard(){
  const p = useParams(); const raw = (p?.id ?? "") as string | string[];
  const iso = (Array.isArray(raw) ? raw[0] : raw)?.toUpperCase() || "";

  const [type,setType]=useState<DatasetType>("gradient"),[title,setTitle]=useState(""),[admLevel,setAdm]=useState("ADM3"),[year,setYear]=useState(""),[unit,setUnit]=useState("");
  const [file,setFile]=useState<File|null>(null),[parsed,setParsed]=useState<Parsed>({headers:[],rows:[]});
  const [join,setJoin]=useState(""),[valCol,setVal]=useState(""),[cats,setCats]=useState<string[]>([]),[map,setMap]=useState<CategoryMapItem[]>([]);
  const [adm0,setAdm0]=useState(""),[err,setErr]=useState(""),[step,setStep]=useState(0),[loading,setLoading]=useState(false);
  const steps=useMemo(()=>type==="adm0"?["Meta","ADM0","Save"]:type==="categorical"?["Meta","Upload","Scores","Save"]:["Meta","Upload","Save"],[type]);
  useEffect(()=>{if(type!=="categorical")return;setMap(cats.map(c=>({code:c,label:c,score:null})))},[cats,type]);
  const onFile=async(f:File)=>setParsed(await parseFile(f));

  if (!iso) {
    return (
      <SidebarLayout headerProps={{
        title:"Loading country…", group:"country-config", description:"Waiting for route params.", tool:"Dataset Wizard",
        breadcrumbs:<Breadcrumbs items={[{label:"Countries",href:"/country"},{label:"Datasets"}]} />
      }}>
        <div className="rounded-xl border p-3 text-sm text-gray-600">Country ID missing in route.</div>
      </SidebarLayout>
    );
  }

  const next=async()=>{try{
    if(steps[step]==="Save"){
      setLoading(true);
      const meta:MetaInput={title,country_iso:iso,admin_level:admLevel,data_type:type==="categorical"?"categorical":"numeric",data_format:"numeric",dataset_type:type,year:year?+year:null,unit};
      if(type==="adm0"){await saveDataset(meta,[{admin_pcode:"ADM0",admin_level:"ADM0",value:+adm0,unit}]);}
      if(type==="gradient"){const rows:GradientRow[]=parsed.rows.map(r=>({admin_pcode:r[join],admin_level:admLevel,value:+(r[valCol]?.replace?.(/,/g,"")??r[valCol])})).filter(r=>r.admin_pcode&&!isNaN(r.value));await saveDataset(meta,rows);}
      if(type==="categorical"){const rows:CategoricalRow[]=[];cats.forEach(c=>parsed.rows.forEach(r=>rows.push({admin_pcode:r[join],admin_level:admLevel,category_code:c,category_label:c,category_score:map.find(m=>m.label===c)?.score??null})));await saveDataset(meta,rows,map);}
      window.location.href=`/country/${iso}/datasets`;return;
    }
    setStep(s=>s+1);
  }catch(e:any){setErr(e.message)}finally{setLoading(false)}}

  return(
    <SidebarLayout headerProps={{
      title:`${iso} – Add Dataset`, group:"country-config",
      description:"Upload or create datasets (ADM0, Gradient, Categorical).", tool:"Dataset Wizard",
      breadcrumbs:<Breadcrumbs items={[{label:"Countries",href:"/country"},{label:iso,href:`/country/${iso}`},{label:"Datasets",href:`/country/${iso}/datasets`},{label:"Add"}]} />
    }}>
      <div className="space-y-4">
        <div className="border p-2 rounded-xl text-sm flex items-center gap-2"><FileSpreadsheet className="h-4 w-4"/>Step {step+1}/{steps.length}: {steps[step]}</div>
        {err&&<div className="bg-red-50 text-red-700 border p-2 rounded">{err}</div>}

        {steps[step]==="Meta"&&<Step title="Dataset details" next={next} disable={!title}>
          <div className="grid gap-3 md:grid-cols-2">
            <input className="border p-2 rounded" placeholder="Title" value={title} onChange={e=>setTitle(e.target.value)}/>
            <select className="border p-2 rounded" value={type} onChange={e=>setType(e.target.value as DatasetType)}>
              <option value="adm0">ADM0</option><option value="gradient">Gradient</option><option value="categorical">Categorical</option>
            </select>
            <select className="border p-2 rounded" value={admLevel} onChange={e=>setAdm(e.target.value)}>{["ADM0","ADM1","ADM2","ADM3"].map(x=><option key={x}>{x}</option>)}</select>
            <input className="border p-2 rounded" placeholder="Year" value={year} onChange={e=>setYear(e.target.value)}/>
            <input className="border p-2 rounded md:col-span-2" placeholder="Unit (optional)" value={unit} onChange={e=>setUnit(e.target.value)}/>
          </div>
        </Step>}

        {steps[step]==="ADM0"&&<Step title="ADM0 value" back={()=>setStep(s=>s-1)} next={next}>
          <input className="border p-2 rounded w-full" placeholder="Numeric value" value={adm0} onChange={e=>setAdm0(e.target.value)}/>
        </Step>}

        {steps[step]==="Upload"&&<Step title="Upload file & map" back={()=>setStep(s=>s-1)} next={next}>
          <input type="file" accept=".csv" onChange={e=>e.target.files&&setFile(e.target.files[0]) || undefined}/>
          {file && <div className="text-xs text-gray-500 mt-1">Selected: {file.name}</div>}
          {file && <button className="mt-2 border px-3 py-1 rounded" onClick={async()=>setParsed(await parseFile(file))}><Upload className="h-4 w-4 inline mr-1"/>Parse file</button>}
          {parsed.headers.length>0&&<>
            <select className="border p-2 rounded w-full mt-2" value={join} onChange={e=>setJoin(e.target.value)}>
              <option value="">Join (admin_pcode)</option>{parsed.headers.map(h=><option key={h}>{h}</option>)}
            </select>
            {type==="gradient"&&<select className="border p-2 rounded w-full mt-2" value={valCol} onChange={e=>setVal(e.target.value)}>
              <option value="">Value column</option>{parsed.headers.map(h=><option key={h}>{h}</option>)}
            </select>}
            {type==="categorical"&&<div className="mt-2 border rounded p-2 grid gap-1">
              {parsed.headers.map(h=><label key={h} className="flex items-center gap-2">
                <input type="checkbox" checked={cats.includes(h)} onChange={e=>setCats(p=>e.target.checked?[...p,h]:p.filter(x=>x!==h))}/>{h}
              </label>)}
            </div>}
          </>}
        </Step>}

        {steps[step]==="Scores"&&<Step title="Category scores" back={()=>setStep(s=>s-1)} next={next}>
          {map.map((m,i)=><div key={m.label} className="flex justify-between items-center gap-2 text-sm">
            <span>{m.label}</span>
            <input className="border p-1 rounded w-20" value={m.score??""} onChange={e=>{const v=e.target.value;setMap(prev=>prev.map((x,j)=>j===i?{...x,score:v?+v:null}:x));}}/>
          </div>)}
        </Step>}

        {steps[step]==="Save"&&<div className="border p-4 rounded-xl space-y-2">
          <CheckCircle2 className="text-green-600 h-5 w-5 inline"/> Ready to save.
          <button onClick={next} disabled={loading} className="bg-black text-white px-4 py-2 rounded-xl">{loading?"Saving...":"Save"}</button>
        </div>}
      </div>
    </SidebarLayout>
  );
}

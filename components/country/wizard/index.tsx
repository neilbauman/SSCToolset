"use client";
import {useEffect,useMemo,useState} from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";

// ---- Loose types to prevent TS friction in prod builds ----
type Source = "core"|"gis"|"other"|"derived";
type Method = "ratio"|"multiply"|"sum"|"difference";
type DatasetOption={id:string;title:string;source:Source;table:string;defaultCol?:string|null;adminLevel?:string|null};
type TaxoMap=Record<string,string[]>;
type Props={open:boolean;onClose:()=>void;countryIso:string;editDataset?:any|null};

const ACCENT="#640811";

// Heuristics to guess % columns
const looksPercent=(s?:string|null)=>!!s&&/[%(rate|pct)]/i.test(s);
const isoVariants=(iso:string)=>[iso,iso.toUpperCase(),iso.toLowerCase()];

export default function DerivedDatasetWizard({open,onClose,countryIso,editDataset=null}:Props){
  // Datasets
  const [datasets,setDatasets]=useState<DatasetOption[]>([]);
  const [datasetA,setDatasetA]=useState<DatasetOption|null>(null);
  const [datasetB,setDatasetB]=useState<DatasetOption|null>(null);

  // Columns / method
  const [colA,setColA]=useState("");
  const [colB,setColB]=useState("");
  const [method,setMethod]=useState<Method>("multiply");

  // Fixed vs Parametric + scalar + normalize
  const [isParametric,setIsParametric]=useState(true);
  const [useScalarB,setUseScalarB]=useState(false);
  const [scalarB,setScalarB]=useState<number>(1);
  const [normalizePct,setNormalizePct]=useState<boolean>(true);

  // Metadata
  const [title,setTitle]=useState("");
  const [desc,setDesc]=useState("");
  const [targetLevel,setTargetLevel]=useState("ADM3");
  const [decimals,setDecimals]=useState(2);

  // Preview
  const [preview,setPreview]=useState<any[]>([]);
  const [loadingPreview,setLoadingPreview]=useState(false);

  // Taxonomy
  const [taxMap,setTaxMap]=useState<TaxoMap>({});
  const [taxSel,setTaxSel]=useState<Record<string,Set<string>>>({}); // {category: Set<term>}

  // ---- Load dataset options (categorized) ----
  useEffect(()=>{ if(!open) return;(async()=>{
    const base:DatasetOption[]=[
      {id:"core-pop",title:"Population [core]",source:"core",table:"population_data",defaultCol:"population",adminLevel:null},
      {id:"core-gis",title:"GIS Features [core]",source:"gis",table:"gis_features",defaultCol:"area_sqkm",adminLevel:null},
    ];
    const isoSet=isoVariants(countryIso);

    // Other (raw) datasets from dataset_metadata
    const {data:others} = await supabase.from("dataset_metadata")
      .select("id,title,default_numeric_column,admin_level,country_iso")
      .in("country_iso",isoSet);
    others?.forEach((d:any)=>{
      base.push({
        id:d.id,
        title:d.title,
        source:"other",
        table:`dataset_${d.id}`,
        defaultCol:d.default_numeric_column||"value",
        adminLevel:d.admin_level||null
      });
    });

    // Derived datasets from derived_dataset_metadata
    const {data:derived}=await supabase.from("derived_dataset_metadata")
      .select("id,title,admin_level,country_iso")
      .in("country_iso",isoSet);
    derived?.forEach((d:any)=>{
      base.push({
        id:d.id,
        title:`${d.title} [derived]`,
        source:"derived",
        table:`derived_${d.id}`,
        defaultCol:"derived",
        adminLevel:d.admin_level||null
      });
    });

    setDatasets(base);
  })();},[open,countryIso]);

  // ---- Load taxonomy (categories -> terms) ----
  useEffect(()=>{ if(!open) return;(async()=>{
    // Prefer taxonomy_terms if present; fallback to taxonomy_categories with children
    const {data} = await supabase.from("taxonomy_terms").select("category,name").order("category");
    if(data && data.length){
      const grouped:TaxoMap={};
      data.forEach(({category,name}:{category:string;name:string})=>{
        if(!grouped[category]) grouped[category]=[];
        grouped[category].push(name);
      });
      setTaxMap(grouped);
      return;
    }
    // Fallback: try categories table (name as category; no terms)
    const {data:cats}=await supabase.from("taxonomy_categories").select("name");
    if(cats?.length){
      const grouped:TaxoMap={}; cats.forEach((c:any)=>{grouped[c.name]=[]});
      setTaxMap(grouped);
    }
  })();},[open]);

  // ---- Edit hydration (load params + taxonomy from DB) ----
  useEffect(()=>{ if(!open) return;
    (async()=>{
      if(!editDataset){
        // Reset to clean slate
        setTitle("");setDesc("");
        setTargetLevel("ADM3");
        setMethod("multiply");
        setUseScalarB(false);setScalarB(1);
        setNormalizePct(true);
        setIsParametric(true);
        setColA("");setColB("");setDecimals(2);
        setDatasetA(null);setDatasetB(null);
        setPreview([]);setTaxSel({});
        return;
      }
      // Basic fields we can trust from editDataset
      setTitle(editDataset.title??"");
      setDesc(editDataset.description??"");
      setTargetLevel(editDataset.admin_level??"ADM3");
      setMethod((["ratio","multiply","sum","difference"].includes(editDataset.method)?editDataset.method:"multiply") as Method);

      // Pull advanced params from authoritative table
      const {data:full} = await supabase.from("derived_datasets")
        .select("table_a,table_b,col_a,col_b,use_scalar_b,scalar_b_val,is_parametric,normalize_percent")
        .eq("id",editDataset.id).maybeSingle();

      const tA=full?.table_a||null, tB=full?.table_b||null;
      const foundA=datasets.find(d=>d.table===tA)||null;
      const foundB=datasets.find(d=>d.table===tB)||null;
      setDatasetA(foundA); setDatasetB(foundB);
      setColA(full?.col_a||foundA?.defaultCol||"value");
      setColB(full?.col_b||foundB?.defaultCol||"value");
      setUseScalarB(!!full?.use_scalar_b);
      setScalarB(full?.scalar_b_val??1);
      setIsParametric(full?.is_parametric??true);
      setNormalizePct(full?.normalize_percent ?? looksPercent(full?.col_b||foundB?.defaultCol||""));

      // Hydrate taxonomy from metadata columns (text[]), or junction table fallback
      let catArr:string[]=[]; let termArr:string[]=[];
      if(editDataset.taxonomy_categories||editDataset.taxonomy_terms){
        catArr=editDataset.taxonomy_categories??[];
        termArr=editDataset.taxonomy_terms??[];
      }else{
        const {data:meta}=await supabase.from("derived_dataset_metadata")
          .select("taxonomy_categories,taxonomy_terms").eq("id",editDataset.id).maybeSingle();
        catArr=meta?.taxonomy_categories??[]; termArr=meta?.taxonomy_terms??[];
        if(!catArr.length && !termArr.length){
          const {data:jt}=await supabase.from("derived_dataset_taxonomy")
            .select("category,term").eq("derived_dataset_id",editDataset.id);
          if(jt?.length){
            catArr=[...new Set(jt.map((r:any)=>r.category))];
            termArr=jt.map((r:any)=>r.term);
          }
        }
      }
      const hydrated:Record<string,Set<string>>={};
      catArr.forEach(c=>{hydrated[c]=hydrated[c]||new Set<string>()});
      termArr.forEach(t=>{
        const cat=Object.keys(taxMap).find(c=>taxMap[c]?.includes(t));
        if(cat){ hydrated[cat]=hydrated[cat]||new Set<string>(); hydrated[cat].add(t); }
      });
      setTaxSel(hydrated);
    })();
  // include datasets,taxMap to ensure hydration after they load
  },[open,editDataset,datasets,JSON.stringify(taxMap)]);

  // ---- Auto-fill default columns when dataset picked ----
  useEffect(()=>{
    if(datasetA && !colA) setColA(datasetA.defaultCol||"value");
    if(datasetB && !colB && !useScalarB) setColB(datasetB?.defaultCol||"value");
  },[datasetA,datasetB,useScalarB]);

  // ---- Derived formula label ----
  const symbol=useMemo(()=>({ratio:"÷",multiply:"×",sum:"+",difference:"−"}[method]),[method]);
  const rhs=useScalarB?String(scalarB):`B.${colB||"value"}`;
  const formula=`A.${colA||"value"} ${symbol} ${rhs}`;

  const fmt=(v:number|null|undefined)=> v==null||isNaN(Number(v))?"":Number(v).toLocaleString(undefined,{maximumFractionDigits:decimals});

  // ---- Preview (RPC v3 signature you shared) ----
  async function doPreview(){
    if(!datasetA || (!datasetB && !useScalarB)){ alert("Select Dataset A and (Dataset B or a scalar)."); return; }
    setLoadingPreview(true);
    setPreview([]);
    const payload:any={
      p_table_a:datasetA.table,
      p_table_b:useScalarB?null:datasetB?.table??null,
      p_col_a:colA||datasetA.defaultCol||"value",
      p_col_b:useScalarB?null:(colB||datasetB?.defaultCol||"value"),
      p_country_iso:countryIso,
      p_method:method,
      p_target_level:targetLevel,
      p_use_scalar_b:useScalarB,
      p_scalar_b_val:useScalarB?scalarB:null,
      p_limit:200,
      p_normalize_percent:normalizePct
    };
    const {data,error}=await supabase.rpc("simulate_join_preview_autoaggregate",payload);
    setLoadingPreview(false);
    if(error){ alert("Preview error: "+error.message); return; }
    setPreview(data||[]);
  }

  // ---- Save (create_derived_dataset_v2 then update taxonomy arrays) ----
  async function doSave(){
    if(!datasetA || (!datasetB && !useScalarB)){ alert("Select Dataset A and (Dataset B or a scalar)."); return; }
    const taxonomy_categories=Object.keys(taxSel);
    const taxonomy_terms=taxonomy_categories.flatMap(c=>Array.from(taxSel[c]||[]));

    const p_title=title||`Derived (${targetLevel})`;
    const args:any={
      p_title,
      p_table_a:datasetA.table,
      p_table_b:useScalarB?null:datasetB?.table??null,
      p_col_a:colA||datasetA.defaultCol||"value",
      p_col_b:useScalarB?null:(colB||datasetB?.defaultCol||"value"),
      p_admin_level:targetLevel,
      p_method:method,
      p_is_parametric:isParametric,
      p_scalar_b_val:useScalarB?scalarB:null,
      p_normalize_percent:normalizePct,
      p_debug:false
    };
    const {data:idRes,error:saveErr}=await supabase.rpc("create_derived_dataset_v2",args);
    if(saveErr){ alert("Save failed: "+saveErr.message); return; }
    const newId=(Array.isArray(idRes)?idRes[0]:idRes)??null;

    // Update metadata with description & taxonomy arrays if we got an id
    if(newId){
      await supabase.from("derived_dataset_metadata")
        .update({
          description:desc||null,
          taxonomy_categories:taxonomy_categories,
          taxonomy_terms:taxonomy_terms
        })
        .eq("id",newId);
    }
    alert(editDataset?"✅ Changes saved.":"✅ Derived dataset created.");
    onClose();
  }

  if(!open) return null;

  // Compact taxonomy row (single-wrap strip)
  const catNames=Object.keys(taxMap);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-5 w-[95%] max-w-5xl max-h-[92vh] overflow-y-auto text-sm">
        <div className="flex items-start gap-2">
          <h2 className="text-lg font-semibold">{
            editDataset?"Edit Derived Dataset":"Create Derived Dataset"
          }</h2>
          <div className="ml-auto flex items-center gap-2">
            <label className="text-xs flex items-center gap-1 border rounded px-2 py-1">
              <input type="checkbox" checked={isParametric} onChange={e=>setIsParametric(e.target.checked)} />
              Parametric
            </label>
            <button onClick={onClose} className="px-3 py-1 border rounded">Close</button>
          </div>
        </div>

        {/* Title / Desc / Level */}
        <div className="flex gap-2 mt-3">
          <input className="border p-1 rounded flex-1" placeholder="Title" value={title} onChange={e=>setTitle(e.target.value)} />
          <input className="border p-1 rounded flex-1" placeholder="Description" value={desc} onChange={e=>setDesc(e.target.value)} />
          <select className="border p-1 rounded" value={targetLevel} onChange={e=>setTargetLevel(e.target.value)}>
            {["ADM0","ADM1","ADM2","ADM3","ADM4"].map(l=><option key={l}>{l}</option>)}
          </select>
        </div>

        {/* Dataset selectors (categorized) */}
        <div className="flex gap-2 mt-3">
          {[
            ["A",datasetA,setDatasetA] as const,
            ["B",datasetB,setDatasetB] as const
          ].map(([label,ds,setter],i)=> (!useScalarB || label==="A") ? (
            <select key={label} className="border p-1 rounded flex-1"
              value={(ds as any)?.id||""}
              onChange={e=>setter(datasets.find(d=>d.id===e.target.value)||null)}
              disabled={!!editDataset}
            >
              <option value="">{`Select Dataset ${label}`}</option>
              {(["core","gis","other","derived"] as Source[]).map(group=>{
                const opts=datasets.filter(d=>d.source===group);
                if(!opts.length) return null;
                return (
                  <optgroup key={group} label={group.toUpperCase()}>
                    {opts.map(d=><option key={d.id} value={d.id}>{d.title}</option>)}
                  </optgroup>
                );
              })}
            </select>
          ): <div key="scalarSpacer" className="flex-1" />)}
        </div>

        {/* Columns + scalar + decimals */}
        <div className="flex gap-2 mt-3 items-center">
          <input className="border p-1 rounded w-40" value={colA} onChange={e=>setColA(e.target.value)} placeholder="Column A" />
          {!useScalarB && (
            <input className="border p-1 rounded w-40" value={colB} onChange={e=>setColB(e.target.value)} placeholder="Column B" />
          )}
          <label className="text-xs flex items-center gap-1 ml-auto">
            <input type="checkbox" checked={useScalarB} onChange={e=>setUseScalarB(e.target.checked)} /> Use Scalar B
          </label>
          {useScalarB && (
            <input type="number" className="border p-1 rounded w-24 text-right"
              value={scalarB} onChange={e=>setScalarB(parseFloat(e.target.value||"0"))} />
          )}
          <select className="border rounded text-xs p-1" value={decimals} onChange={e=>setDecimals(parseInt(e.target.value))} title="Decimals">
            {[0,1,2,3].map(d=><option key={d} value={d}>{d} dec</option>)}
          </select>
        </div>

        {/* Method + normalize + preview */}
        <div className="flex items-center gap-2 mt-3">
          {(["ratio","multiply","sum","difference"] as Method[]).map(m=>(
            <button key={m} onClick={()=>setMethod(m)}
              className={`px-2 py-1 border rounded ${method===m?"text-white":""}`}
              style={{background:method===m?ACCENT:"transparent",borderColor:"#e5e7eb"}}
            >{m}</button>
          ))}
          <label className="text-xs flex items-center gap-1 ml-2">
            <input type="checkbox" checked={normalizePct} onChange={e=>setNormalizePct(e.target.checked)} />
            Normalize % (divide B by 100)
          </label>
          <button onClick={doPreview} className="ml-auto px-3 py-1 text-white rounded" style={{background:ACCENT}}>
            {loadingPreview?"Loading...":"Preview"}
          </button>
        </div>

        <p className="text-xs italic mt-2">Derived = {formula}</p>

        {/* Preview Table (compact height, scroll) */}
        <div className="max-h-64 overflow-y-auto border rounded text-xs mt-2">
          <table className="w-full">
            <thead className="bg-gray-100 sticky top-0">
              <tr>
                <th className="p-1 text-left">Pcode</th>
                <th className="p-1 text-left">Name</th>
                <th className="p-1 text-right">A</th>
                <th className="p-1 text-right">B</th>
                <th className="p-1 text-right">Derived</th>
                <th className="p-1 text-left">Join</th>
                <th className="p-1 text-left">Src A</th>
                <th className="p-1 text-left">Src B</th>
                <th className="p-1 text-left">Target</th>
              </tr>
            </thead>
            <tbody>
              {preview.map((r:any,i:number)=>(
                <tr key={i} className="border-t">
                  <td className="p-1">{r.join_key}</td>
                  <td className="p-1">{r.place_name??"—"}</td>
                  <td className="p-1 text-right">{fmt(r.a)}</td>
                  <td className="p-1 text-right">{fmt(r.b)}</td>
                  <td className="p-1 text-right font-medium">{fmt(r.derived)}</td>
                  <td className="p-1">{r.join_status??""}</td>
                  <td className="p-1">{r.source_level_a??""}</td>
                  <td className="p-1">{r.source_level_b??""}</td>
                  <td className="p-1">{r.target_level??""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Taxonomy (single compact row; each category narrow) */}
        <h3 className="text-sm font-semibold mt-4">Assign Taxonomy</h3>
        <div className="mt-2 overflow-x-auto">
          <div className="flex gap-2 min-w-max">
            {catNames.map(cat=>{
              const checked=!!taxSel[cat];
              return (
                <div key={cat} className="border rounded p-2 w-56">
                  <label className="flex items-center gap-1 text-xs font-medium">
                    <input type="checkbox" checked={checked}
                      onChange={e=>{
                        setTaxSel(prev=>{
                          const next={...prev};
                          if(e.target.checked){ if(!next[cat]) next[cat]=new Set<string>(); }
                          else { delete next[cat]; }
                          return next;
                        });
                      }}
                    /> {cat}
                  </label>
                  {checked && (
                    <div className="mt-1 h-28 overflow-y-auto pr-1">
                      {(taxMap[cat]||[]).map(term=>(
                        <label key={term} className="flex items-center gap-1 text-xs">
                          <input type="checkbox" checked={!!taxSel[cat]?.has(term)}
                            onChange={e=>{
                              setTaxSel(prev=>{
                                const next={...prev};
                                if(!next[cat]) next[cat]=new Set<string>();
                                if(e.target.checked) next[cat]!.add(term);
                                else next[cat]!.delete(term);
                                return next;
                              });
                            }}
                          /> {term}
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose} className="px-3 py-1 border rounded">Cancel</button>
          <button onClick={doSave} className="px-3 py-1 text-white rounded" style={{background:ACCENT}}>
            {editDataset?"Save Changes":"Save Derived"}
          </button>
        </div>
      </div>
    </div>
  );
}

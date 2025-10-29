"use client";
import React, { useEffect, useMemo, useState, ReactNode } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { X } from "lucide-react";

type Method = "ratio" | "multiply" | "sum" | "difference";
type Source = "core" | "gis" | "other" | "derived";
interface DatasetOption { id: string; title: string; source: Source; table: string; defaultCol?: string; }
interface EditPayload {
  id: string; title: string; description: string | null; admin_level: string; method: Method;
  use_scalar_b?: boolean | null; scalar_b_val?: number | null; table_a?: string | null; table_b?: string | null;
  col_a?: string | null; col_b?: string | null; decimals?: number | null; formula?: string | null;
  target_level?: string | null; taxonomy_categories?: string[]; taxonomy_terms?: string[];
  is_parametric?: boolean | null; normalize_percent?: boolean | null;
}
interface Props { open: boolean; onClose: () => void; countryIso: string; editDataset?: EditPayload | null; }
const ACCENT = "#640811";

export default function DerivedDatasetWizard({ open, onClose, countryIso, editDataset = null }: Props) {
  const [datasets,setDatasets]=useState<DatasetOption[]>([]);
  const [datasetA,setDatasetA]=useState<DatasetOption|null>(null);
  const [datasetB,setDatasetB]=useState<DatasetOption|null>(null);
  const [colA,setColA]=useState(""),[colB,setColB]=useState("");
  const [method,setMethod]=useState<Method>("ratio");
  const [useScalarB,setUseScalarB]=useState(false);
  const [scalarB,setScalarB]=useState(1);
  const [title,setTitle]=useState(""),[desc,setDesc]=useState("");
  const [targetLevel,setTargetLevel]=useState("ADM3");
  const [decimals,setDecimals]=useState(2);
  const [isParametric,setIsParametric]=useState(true);
  const [normalizePercent,setNormalizePercent]=useState(false);
  const [preview,setPreview]=useState<any[]>([]);
  const [loadingPreview,setLoadingPreview]=useState(false);
  const [taxonomyMap,setTaxonomyMap]=useState<Record<string,string[]>>({});
  const [taxonomy,setTaxonomy]=useState<Record<string,Set<string>>>({});

  // load datasets
  useEffect(()=>{ if(!open)return;
    (async()=>{
      const base:DatasetOption[]=[
        {id:"core-pop",title:"Population Data [core]",source:"core",table:"population_data",defaultCol:"population"},
        {id:"core-gis",title:"GIS Features [core]",source:"gis",table:"gis_features",defaultCol:"area_sqkm"}
      ];
      const {data:others}=await supabase.from("dataset_metadata").select("id,title");
      others?.forEach(d=>base.push({id:d.id,title:d.title,source:"other",table:`dataset_values_${d.id}`,defaultCol:"value"}));
      const {data:derived}=await supabase.from("derived_dataset_metadata").select("id,title");
      derived?.forEach(d=>base.push({id:d.id,title:d.title,source:"derived",table:`derived_${d.id}`,defaultCol:"derived"}));
      setDatasets(base);
    })();
  },[open,countryIso]);

  // taxonomy
  useEffect(()=>{ if(!open)return;
    (async()=>{
      const {data}=await supabase.from("taxonomy_terms").select("category,name");
      if(!data)return; const grouped:Record<string,string[]>={};
      data.forEach(({category,name})=>{
        if(!grouped[category])grouped[category]=[];
        grouped[category].push(name);
      });
      setTaxonomyMap(grouped);
    })();
  },[open]);

  // hydrate edit
  useEffect(()=>{ if(!open)return;
    if(!editDataset){
      setTitle("");setDesc("");setTargetLevel("ADM3");setMethod("ratio");
      setUseScalarB(false);setScalarB(1);setColA("");setColB("");setDecimals(2);
      setDatasetA(null);setDatasetB(null);setPreview([]);setTaxonomy({});
      setIsParametric(true);setNormalizePercent(false);
      return;
    }
    setTitle(editDataset.title||"");setDesc(editDataset.description||"");
    setTargetLevel(editDataset.target_level||"ADM3");setMethod(editDataset.method as Method||"ratio");
    setUseScalarB(!!editDataset.use_scalar_b);setScalarB(editDataset.scalar_b_val??1);
    setColA(editDataset.col_a||"");setColB(editDataset.col_b||"");setDecimals(editDataset.decimals??2);
    setIsParametric(!!editDataset.is_parametric);setNormalizePercent(!!editDataset.normalize_percent);
    if(datasets.length>0){
      setDatasetA(datasets.find(d=>d.table===editDataset.table_a)||null);
      setDatasetB(datasets.find(d=>d.table===editDataset.table_b)||null);
    }
    if(editDataset.taxonomy_categories&&editDataset.taxonomy_terms){
      const next:Record<string,Set<string>>={};
      editDataset.taxonomy_categories.forEach(cat=>{
        next[cat]=new Set(editDataset.taxonomy_terms?.filter(t=>taxonomyMap[cat]?.includes(t))||[]);
      });
      setTaxonomy(next);
    }
  },[open,editDataset,datasets,taxonomyMap]);

  const methodSymbol=useMemo(()=>method==="ratio"?"÷":method==="multiply"?"×":method==="sum"?"+":"−",[method]);
  const computedFormula=useMemo(()=>`A.${colA} ${methodSymbol} ${useScalarB?scalarB:`B.${colB}`}`,[colA,colB,methodSymbol,useScalarB,scalarB]);

  async function previewJoin(){
    if(!datasetA||(!datasetB&&!useScalarB)){alert("Select Dataset A and (Dataset B or scalar).");return;}
    setLoadingPreview(true);
    const {data,error}=await supabase.rpc("simulate_join_preview_autoaggregate",{
      p_table_a:datasetA.table,p_table_b:useScalarB?null:datasetB?.table??null,
      p_col_a:colA||datasetA.defaultCol,p_col_b:useScalarB?null:colB||datasetB?.defaultCol,
      p_country_iso:countryIso,p_method:method,p_target_level:targetLevel,
      p_use_scalar_b:useScalarB,p_scalar_b_val:useScalarB?scalarB:null,p_normalize_percent:normalizePercent
    });
    setLoadingPreview(false);
    if(error){alert("Preview error: "+error.message);return;}
    setPreview(data||[]);
  }

  async function saveDerived(){
    if(!datasetA||(!datasetB&&!useScalarB)){alert("Select Dataset A and (Dataset B or scalar).");return;}
    const cats=Object.keys(taxonomy),terms=cats.flatMap(c=>Array.from(taxonomy[c]||[]));
    const payload={p_country:countryIso,p_title:title||`Derived (${targetLevel})`,p_description:desc||null,
      p_admin_level:targetLevel,p_method:method,p_use_scalar_b:useScalarB,p_scalar_b_val:useScalarB?scalarB:null,
      p_table_a:datasetA.table,p_table_b:useScalarB?null:datasetB?.table??null,p_col_a:colA||datasetA.defaultCol,
      p_col_b:useScalarB?null:colB||datasetB?.defaultCol,p_formula:computedFormula,p_target_level:targetLevel,
      p_taxonomy_categories:cats,p_taxonomy_terms:terms,p_decimals:decimals};
    const {error}=await supabase.rpc("create_derived_dataset_v2",payload);
    if(error){alert("Save failed: "+error.message);return;}
    alert("✅ Derived dataset saved."); onClose();
  }

  if(!open) return null;

  // -------- PURE REACT.CREATEELEMENT RENDER -----------
  return React.createElement("div",{className:"fixed inset-0 bg-black/50 flex items-center justify-center z-50"},
    React.createElement("div",{className:"bg-white rounded-2xl p-5 w-[95%] max-w-6xl max-h-[90vh] overflow-y-auto text-sm"},
      React.createElement("div",{className:"flex justify-between items-center mb-3"},
        React.createElement("h2",{className:"text-lg font-semibold"},editDataset?"Edit Derived Dataset":"Create Derived Dataset"),
        React.createElement("button",{onClick:onClose},React.createElement(X,{className:"w-4 h-4 text-gray-500"}))
      ),
      React.createElement("div",{className:"flex gap-2 mb-3"},
        React.createElement("input",{className:"border p-1 flex-1 rounded",placeholder:"Title",value:title,onChange:e=>setTitle(e.target.value)}),
        React.createElement("input",{className:"border p-1 flex-1 rounded",placeholder:"Description",value:desc,onChange:e=>setDesc(e.target.value)}),
        React.createElement("select",{className:"border p-1 rounded",value:targetLevel,onChange:e=>setTargetLevel(e.target.value)},
          ["ADM0","ADM1","ADM2","ADM3","ADM4"].map(l=>React.createElement("option",{key:l},l))
        )
      ),
      React.createElement("div",{className:"flex gap-2 mb-3"},
        ["A","B"].map((label,i)=>
          (!useScalarB||label==="A") &&
          React.createElement("select",{key:i,className:"border p-1 rounded flex-1",
            value:(label==="A"?datasetA?.id:datasetB?.id)||"",
            onChange:e=>label==="A"
              ?setDatasetA(datasets.find(d=>d.id===e.target.value)||null)
              :setDatasetB(datasets.find(d=>d.id===e.target.value)||null),
            disabled:!!editDataset},
            React.createElement("option",{value:""},"Select Dataset "+label),
            ["core","gis","other","derived"].map(g=>
              React.createElement("optgroup",{key:g,label:g.toUpperCase()},
                datasets.filter(d=>d.source===g).map(d=>
                  React.createElement("option",{key:d.id,value:d.id},d.title)
                )
              )
            )
          )
        )
      ),
      React.createElement("div",{className:"flex justify-end gap-2 mt-4"},
        React.createElement("button",{onClick:onClose,className:"px-3 py-1 border rounded"},"Cancel"),
        React.createElement("button",{onClick:saveDerived,className:"px-3 py-1 text-white rounded",style:{background:ACCENT}},"Save")
      )
    )
  );
}

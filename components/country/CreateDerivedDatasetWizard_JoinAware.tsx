'use client';
import { useEffect, useMemo, useState } from 'react';
import CollapsibleSection from './CollapsibleSection';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase/supabaseBrowser';
import { simulateJoinPreview, createDerivedDataset, loadDatasetOptions, loadTaxonomyTerms } from '@/lib/supabase/derived';
import type { DatasetOption, Method, PreviewRow, TaxonomyTerm } from '@/lib/supabase/types';

type Props={countryIso:string;defaultAdminLevel?:string;defaultYear?:number;onClose?:()=>void};

export default function CreateDerivedDatasetWizard_JoinAware({countryIso,defaultAdminLevel='ADM3',defaultYear=new Date().getFullYear(),onClose}:Props){
const router=useRouter();
const[title,setTitle]=useState(''),[description,setDescription]=useState(''),[adminLevel,setAdminLevel]=useState(defaultAdminLevel),[year,setYear]=useState<number>(defaultYear),[method,setMethod]=useState<Method>('ratio');
const[datasets,setDatasets]=useState<DatasetOption[]>([]),[taxonomy,setTaxonomy]=useState<TaxonomyTerm[]>([]),[datasetA,setDatasetA]=useState<DatasetOption|null>(null),[datasetB,setDatasetB]=useState<DatasetOption|null>(null);
const[colA,setColA]=useState(''),[colB,setColB]=useState(''),[useScalarB,setUseScalarB]=useState(false),[scalarB,setScalarB]=useState<number|null>(null),[decimals,setDecimals]=useState(0),[preview,setPreview]=useState<PreviewRow[]>([]);
const[loadingPreview,setLoadingPreview]=useState(false),[saving,setSaving]=useState(false),[selectedTaxonomyIds,setSelectedTaxonomyIds]=useState<string[]>([]),[selectedCategories,setSelectedCategories]=useState<string[]>([]);
useEffect(()=>{(async()=>{const sb=supabaseBrowser;const[ds,tx]=await Promise.all([loadDatasetOptions(sb,countryIso),loadTaxonomyTerms(sb)]);setDatasets(ds);setTaxonomy(tx);})().catch(console.error);},[countryIso]);
const grouped=useMemo(()=>({Core:datasets.filter(d=>d.type==='Core'),Other:datasets.filter(d=>d.type!=='Core'&&d.type!=='Derived'),Derived:datasets.filter(d=>d.type==='Derived')}),[datasets]);
async function fetchCols(t:string){const sb=supabaseBrowser;const{data}=await sb.from(t).select('*').limit(1);if(!data?.[0])return[];return Object.keys(data[0]).filter(k=>{const v=data[0][k];return typeof v==='number'||(!isNaN(Number(v))&&v!==null&&v!=='')});}
const[colsA,setColsA]=useState<string[]>([]),[colsB,setColsB]=useState<string[]>([]);
useEffect(()=>{if(datasetA?.table)fetchCols(datasetA.table).then(setColsA).catch(()=>setColsA([]));},[datasetA]);
useEffect(()=>{if(!datasetB?.table||useScalarB)return setColsB([]);fetchCols(datasetB.table).then(setColsB).catch(()=>setColsB([]));},[datasetB,useScalarB]);
const formula=useMemo(()=>{const A=colA||'A',B=useScalarB?(scalarB??'B'):colB||'B';return{ratio:`${A} ÷ ${B}`,multiply:`${A} × ${B}`,sum:`${A} + ${B}`,difference:`${A} − ${B}`}[method]||`${A}?${B}`;},[method,colA,colB,useScalarB,scalarB]);
async function handlePreview(){if(!datasetA?.table||!colA)return alert('Select dataset A/column.');if(!useScalarB&&(!datasetB?.table||!colB))return alert('Select dataset B/column.');setLoadingPreview(true);try{const sb=supabaseBrowser;const rows=await simulateJoinPreview(sb,{p_table_a:datasetA.table,p_table_b:useScalarB?null:datasetB?.table??null,p_country:countryIso,p_target_level:adminLevel,p_method:method,p_col_a:colA,p_col_b:useScalarB?null:colB??null,p_use_scalar_b:useScalarB,p_scalar_b_val:useScalarB?scalarB??0:null});const clamp=(n:number|null)=>n==null?null:Number(n.toFixed(Math.min(2,Math.max(0,decimals))));setPreview(rows.map(r=>({...r,a:clamp(r.a),b:clamp(r.b),derived:clamp(r.derived)})));}catch(e:any){alert(`Preview failed: ${e.message}`);}finally{setLoadingPreview(false);}}
async function handleSave(){if(!title.trim())return alert('Provide a title.');if(preview.length===0)return alert('Preview before save.');setSaving(true);try{const sb=supabaseBrowser;await createDerivedDataset(sb,{p_country:countryIso,p_title:title,p_admin_level:adminLevel,p_year:year,p_method:method,p_sources:JSON.stringify({table_a:datasetA?.table,col_a:colA,table_b:useScalarB?null:datasetB?.table,col_b:useScalarB?null:colB,method,decimals,admin_level:adminLevel,taxonomy_terms:selectedTaxonomyIds,taxonomy_categories:selectedCategories,description}),p_scalar_b:useScalarB?scalarB:null,p_rows:JSON.stringify(preview.map(r=>({pcode:r.out_pcode,name:r.place_name,parent_pcode:r.parent_pcode,parent_name:r.parent_name,a:r.a,b:r.b,derived:r.derived,col_a_used:r.col_a_used,col_b_used:r.col_b_used})))});router.refresh();alert('Saved.');onClose?.();}catch(e:any){alert(`Save failed: ${e.message}`);}finally{setSaving(false);}}
const cats=useMemo(()=>Array.from(new Set(taxonomy.map(t=>t.category).filter(Boolean))) as string[],[taxonomy]);
return(<div className="w-full max-w-4xl space-y-4">
<div className="rounded-2xl border p-4 bg-white shadow-sm grid gap-3 sm:grid-cols-2">
<input className="rounded border p-2" placeholder="Title" value={title} onChange={e=>setTitle(e.target.value)}/>
<input className="rounded border p-2" placeholder="Admin level" value={adminLevel} onChange={e=>setAdminLevel(e.target.value)}/>
<input type="number" className="rounded border p-2" value={year} onChange={e=>setYear(+e.target.value)}/>
<input className="rounded border p-2" placeholder="Description" value={description} onChange={e=>setDescription(e.target.value)}/>
</div>
<CollapsibleSection title="Dataset Selection" defaultOpen>
<div className="grid sm:grid-cols-3 gap-3 mb-4">
<select className="border p-2 rounded" value={method} onChange={e=>setMethod(e.target.value as Method)}>
<option value="ratio">Ratio</option><option value="multiply">Multiply</option><option value="sum">Sum</option><option value="difference">Difference</option>
</select>
<select className="border p-2 rounded" value={decimals} onChange={e=>setDecimals(+e.target.value)}>
<option value={0}>0 decimals</option><option value={1}>1</option><option value={2}>2</option>
</select>
<div className="border p-2 rounded text-center text-sm"><b>Formula:</b> {formula}</div>
</div>
<div className="grid sm:grid-cols-2 gap-4">
<DatasetPicker title="Dataset A" grouped={grouped} dataset={datasetA} setDataset={setDatasetA} cols={colsA} col={colA} setCol={setColA}/>
<DatasetPicker title="Dataset B (or Scalar)" grouped={grouped} dataset={datasetB} setDataset={setDatasetB} cols={colsB} col={colB} setCol={setColB} useScalar={useScalarB} setUseScalar={setUseScalarB} scalarValue={scalarB} setScalarValue={setScalarB}/>
</div>
<button onClick={handlePreview} disabled={loadingPreview} className="mt-4 rounded bg-black px-4 py-2 text-white">{loadingPreview?'Generating…':'Generate Preview'}</button>
</CollapsibleSection>
<CollapsibleSection title="Join Preview">
{preview.length===0?<div className="text-sm text-gray-500">No preview.</div>:
<div className="overflow-x-auto"><table className="min-w-full text-sm"><thead className="bg-gray-50"><tr><Th>PCode</Th><Th>Name</Th><Th>Parent</Th><Th>A</Th><Th>B</Th><Th>Derived</Th></tr></thead><tbody>{preview.map(r=><tr key={r.out_pcode} className="border-b"><Td>{r.out_pcode}</Td><Td>{r.place_name}</Td><Td>{r.parent_name||r.parent_pcode}</Td><Td>{r.a}</Td><Td>{useScalarB?scalarB:r.b}</Td><Td className="font-semibold">{r.derived}</Td></tr>)}</tbody></table></div>}
</CollapsibleSection>
<CollapsibleSection title="Taxonomy Metadata">
<div className="grid sm:grid-cols-2 gap-4">
<MultiSelect label="Categories" options={cats.map(c=>({value:c,label:c}))} values={selectedCategories} onChange={setSelectedCategories}/>
<MultiSelect label="Terms" options={taxonomy.map(t=>({value:t.id,label:t.name}))} values={selectedTaxonomyIds} onChange={setSelectedTaxonomyIds}/>
</div>
</CollapsibleSection>
<div className="flex justify-between items-center">
<span className="text-xs text-gray-500">Saves via create_derived_dataset()</span>
<div className="flex gap-2">
<button onClick={onClose} className="border px-4 py-2 rounded">Cancel</button>
<button onClick={handleSave} disabled={saving||!preview.length} className="bg-blue-600 text-white px-4 py-2 rounded">{saving?'Saving…':'Save'}</button>
</div></div></div>);
}

function Th({children,className}:{children:any;className?:string}){return<th className={`px-3 py-2 text-xs font-semibold text-gray-600 ${className??''}`}>{children}</th>}
function Td({children,className}:{children:any;className?:string}){return<td className={`px-3 py-2 ${className??''}`}>{children}</td>}
function MultiSelect({label,options,values,onChange}:{label:string;options:{value:string;label:string}[];values:string[];onChange:(v:string[])=>void;}){return(<div><label className="text-sm font-medium">{label}</label><div className="mt-1 max-h-40 overflow-auto border rounded p-2">{options.length===0?<div className="text-sm text-gray-500">No options</div>:options.map(o=>{const c=values.includes(o.value);return(<label key={o.value} className="block text-sm"><input type="checkbox" checked={c} onChange={e=>onChange(e.target.checked?[...values,o.value]:values.filter(v=>v!==o.value))}/> {o.label}</label>)})}</div></div>);}
function DatasetPicker({title,grouped,dataset,setDataset,cols,col,setCol,useScalar,setUseScalar,scalarValue,setScalarValue}:any){return(<div className="border p-3 rounded"><div className="flex justify-between mb-2"><span className="text-sm font-medium">{title}</span>{setUseScalar&&<label className="text-sm"><input type="checkbox" checked={useScalar} onChange={e=>setUseScalar(e.target.checked)}/> Scalar</label>}</div>{!useScalar?<><select className="w-full border rounded p-2" value={dataset?.table??''} onChange={e=>{const t=e.target.value;const found=grouped.Core.find((d:DatasetOption)=>d.table===t)||grouped.Other.find((d:DatasetOption)=>d.table===t)||grouped.Derived.find((d:DatasetOption)=>d.table===t)||null;setDataset(found);}}><option value="">Select dataset…</option>{['Core','Other','Derived'].map(g=><optgroup key={g} label={g}>{grouped[g].map((d:DatasetOption)=><option key={d.table} value={d.table}>{d.label}</option>)}</optgroup>)}</select>{cols.length>0&&<select className="mt-2 w-full border rounded p-2" value={col} onChange={e=>setCol(e.target.value)}><option value="">Select column…</option>{cols.map((c:string)=><option key={c}>{c}</option>)}</select>}</>:<input type="number" className="w-full border rounded p-2" placeholder="Scalar value" value={scalarValue??''} onChange={e=>setScalarValue(e.target.value?parseFloat(e.target.value):null)}/>}</div>);}

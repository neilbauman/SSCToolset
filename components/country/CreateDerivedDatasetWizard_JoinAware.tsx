'use client';
import { useEffect, useMemo, useState } from 'react';
import CollapsibleSection from './CollapsibleSection';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase/supabaseBrowser';
import { simulateJoinPreview, createDerivedDataset, loadDatasetOptions, loadTaxonomyTerms } from '@/lib/supabase/derived';
import type { DatasetOption, Method, PreviewRow, TaxonomyTerm } from '@/lib/supabase/types';

type Props={countryIso:string;defaultAdminLevel?:string;defaultYear?:number;onClose?:()=>void};

export default function Wizard({countryIso,defaultAdminLevel='ADM3',defaultYear=new Date().getFullYear(),onClose}:Props){
const router=useRouter();
const[title,setTitle]=useState(''),[desc,setDesc]=useState(''),[level,setLevel]=useState(defaultAdminLevel),[year,setYear]=useState<number>(defaultYear);
const[method,setMethod]=useState<Method>('ratio'),[datasets,setDatasets]=useState<DatasetOption[]>([]),[taxonomy,setTax]=useState<TaxonomyTerm[]>([]);
const[a,setA]=useState<DatasetOption|null>(null),[b,setB]=useState<DatasetOption|null>(null),[colA,setColA]=useState(''),[colB,setColB]=useState(''),[scalar,setScalar]=useState<number|null>(null),[useScalar,setUseScalar]=useState(false);
const[preview,setPreview]=useState<PreviewRow[]>([]),[decimals,setDecimals]=useState(0),[loading,setLoading]=useState(false),[saving,setSaving]=useState(false);
const[cats,setCats]=useState<string[]>([]),[terms,setTerms]=useState<string[]>([]);
useEffect(()=>{(async()=>{const sb=supabaseBrowser;const[ds,tx]=await Promise.all([loadDatasetOptions(sb,countryIso),loadTaxonomyTerms(sb)]);setDatasets(ds);setTax(tx);})();},[countryIso]);
const grouped=useMemo(()=>({Core:datasets.filter(d=>d.type==='Core'),Other:datasets.filter(d=>d.type!=='Core'&&d.type!=='Derived'),Derived:datasets.filter(d=>d.type==='Derived')}),[datasets]);
async function fetchCols(t:string){const sb=supabaseBrowser;const{data}=await sb.from(t).select('*').limit(1);return data?.[0]?Object.keys(data[0]).filter(k=>!isNaN(Number(data[0][k]))):[];}
const[colsA,setColsA]=useState<string[]>([]),[colsB,setColsB]=useState<string[]>([]);useEffect(()=>{a&&fetchCols(a.table).then(setColsA)},[a]);useEffect(()=>{!useScalar&&b&&fetchCols(b.table).then(setColsB)},[b,useScalar]);
const formula=useMemo(()=>{const A=colA||'A',B=useScalar?(scalar??'B'):colB||'B';return{ratio:`${A} ÷ ${B}`,multiply:`${A} × ${B}`,sum:`${A} + ${B}`,difference:`${A} − ${B}`}[method];},[method,colA,colB,useScalar,scalar]);
async function previewJoin(){if(!a?.table||!colA)return alert('Select A');if(!useScalar&&(!b?.table||!colB))return alert('Select B');setLoading(true);try{const sb=supabaseBrowser;const rows=await simulateJoinPreview(sb,{p_table_a:a.table,p_table_b:useScalar?null:b?.table??null,p_country:countryIso,p_target_level:level,p_method:method,p_col_a:colA,p_col_b:useScalar?null:colB??null,p_use_scalar_b:useScalar,p_scalar_b_val:useScalar?scalar??0:null});const f=(n:number|null)=>n==null?null:+n.toFixed(decimals);setPreview(rows.map(r=>({...r,a:f(r.a),b:f(r.b),derived:f(r.derived)})));}catch(e:any){alert(e.message);}finally{setLoading(false);}}
async function save(){if(!title.trim())return alert('Title required');if(!preview.length)return alert('Generate preview first');setSaving(true);try{const sb=supabaseBrowser;await createDerivedDataset(sb,{p_country:countryIso,p_title:title,p_admin_level:level,p_year:year,p_method:method,p_sources:JSON.stringify({table_a:a?.table,col_a:colA,table_b:useScalar?null:b?.table,col_b:useScalar?null:colB,method,decimals,admin_level:level,taxonomy_terms:terms,taxonomy_categories:cats,description:desc}),p_scalar_b:useScalar?scalar:null,p_rows:JSON.stringify(preview.map(r=>({pcode:r.out_pcode,name:r.place_name,parent_pcode:r.parent_pcode,parent_name:r.parent_name,a:r.a,b:r.b,derived:r.derived,col_a_used:r.col_a_used,col_b_used:r.col_b_used})))});router.refresh();alert('Saved');onClose?.();}catch(e:any){alert(e.message);}finally{setSaving(false);}}
return(<div className="w-full max-w-4xl space-y-4">
<div className="grid sm:grid-cols-2 gap-3 border p-4 rounded-2xl bg-white shadow-sm">
<input className="border p-2 rounded" placeholder="Title" value={title} onChange={e=>setTitle(e.target.value)}/>
<input className="border p-2 rounded" placeholder="Admin" value={level} onChange={e=>setLevel(e.target.value)}/>
<input type="number" className="border p-2 rounded" value={year} onChange={e=>setYear(+e.target.value)}/>
<input className="border p-2 rounded" placeholder="Description" value={desc} onChange={e=>setDesc(e.target.value)}/>
</div>
<CollapsibleSection title="Dataset Selection" defaultOpen>
<div className="grid sm:grid-cols-3 gap-3 mb-3">
<select className="border p-2 rounded" value={method} onChange={e=>setMethod(e.target.value as Method)}><option value="ratio">Ratio</option><option value="multiply">Multiply</option><option value="sum">Sum</option><option value="difference">Difference</option></select>
<select className="border p-2 rounded" value={decimals} onChange={e=>setDecimals(+e.target.value)}><option value={0}>0</option><option value={1}>1</option><option value={2}>2</option></select>
<div className="border p-2 rounded text-center text-sm"><b>Formula:</b> {formula}</div>
</div>
<div className="grid sm:grid-cols-2 gap-3">
<DatasetPicker title="Dataset A" grouped={grouped} dataset={a} setDataset={setA} cols={colsA} col={colA} setCol={setColA}/>
<DatasetPicker title="Dataset B / Scalar" grouped={grouped} dataset={b} setDataset={setB} cols={colsB} col={colB} setCol={setColB} useScalar={useScalar} setUseScalar={setUseScalar} scalarValue={scalar} setScalarValue={setScalar}/>
</div>
<button onClick={previewJoin} disabled={loading} className="mt-3 bg-black text-white rounded px-4 py-2">{loading?'Generating…':'Generate Preview'}</button>
</CollapsibleSection>
<CollapsibleSection title="Preview">
{!preview.length?<div className="text-sm text-gray-500">No preview</div>:<div className="overflow-x-auto"><table className="min-w-full text-sm"><thead className="bg-gray-50"><tr><Th>PCode</Th><Th>Name</Th><Th>Parent</Th><Th>A</Th><Th>B</Th><Th>Derived</Th></tr></thead><tbody>{preview.map(r=><tr key={r.out_pcode} className="border-b"><Td>{r.out_pcode}</Td><Td>{r.place_name}</Td><Td>{r.parent_name||r.parent_pcode}</Td><Td>{r.a}</Td><Td>{useScalar?scalar:r.b}</Td><Td className="font-semibold">{r.derived}</Td></tr>)}</tbody></table></div>}
</CollapsibleSection>
<CollapsibleSection title="Taxonomy">
<div className="grid sm:grid-cols-2 gap-3"><MultiSelect label="Categories" options={Array.from(new Set(taxonomy.map(t=>t.category).filter(Boolean))).map(c=>({value:c!,label:c!}))} values={cats} onChange={setCats}/><MultiSelect label="Terms" options={taxonomy.map(t=>({value:t.id,label:t.name}))} values={terms} onChange={setTerms}/></div>
</CollapsibleSection>
<div className="flex justify-between items-center"><span className="text-xs text-gray-500">Saves via create_derived_dataset()</span><div className="flex gap-2"><button onClick={onClose} className="border px-4 py-2 rounded">Cancel</button><button onClick={save} disabled={saving||!preview.length} className="bg-blue-600 text-white px-4 py-2 rounded">{saving?'Saving…':'Save'}</button></div></div></div>);
}

function Th({children,className}:{children:any;className?:string}){return<th className={`px-3 py-2 text-xs font-semibold text-gray-600 ${className??''}`}>{children}</th>}
function Td({children,className}:{children:any;className?:string}){return<td className={`px-3 py-2 ${className??''}`}>{children}</td>}
function MultiSelect({label,options,values,onChange}:{label:string;options:{value:string;label:string}[];values:string[];onChange:(v:string[])=>void}){return(<div><label className="text-sm font-medium">{label}</label><div className="mt-1 max-h-40 overflow-auto border rounded p-2">{!options.length?<div className="text-sm text-gray-500">No options</div>:options.map(o=>{const c=values.includes(o.value);return(<label key={o.value} className="block text-sm"><input type="checkbox" checked={c} onChange={e=>onChange(e.target.checked?[...values,o.value]:values.filter(v=>v!==o.value))}/> {o.label}</label>)})}</div></div>);}
function DatasetPicker({title,grouped,dataset,setDataset,cols,col,setCol,useScalar,setUseScalar,scalarValue,setScalarValue}:any){return(<div className="border p-3 rounded"><div className="flex justify-between mb-2"><span className="text-sm font-medium">{title}</span>{setUseScalar&&<label className="text-sm"><input type="checkbox" checked={useScalar} onChange={e=>setUseScalar(e.target.checked)}/> Scalar</label>}</div>{!useScalar?<><select className="w-full border rounded p-2" value={dataset?.table??''} onChange={e=>{const t=e.target.value;const found=grouped.Core.find((d:DatasetOption)=>d.table===t)||grouped.Other.find((d:DatasetOption)=>d.table===t)||grouped.Derived.find((d:DatasetOption)=>d.table===t)||null;setDataset(found);}}><option value="">Select…</option>{['Core','Other','Derived'].map(g=><optgroup key={g} label={g}>{grouped[g].map((d:DatasetOption)=><option key={d.table} value={d.table}>{d.label}</option>)}</optgroup>)}</select>{cols.length>0&&<select className="mt-2 w-full border rounded p-2" value={col} onChange={e=>setCol(e.target.value)}><option value="">Column…</option>{cols.map((c:string)=><option key={c}>{c}</option>)}</select>}</>:<input type="number" className="w-full border rounded p-2" placeholder="Scalar" value={scalarValue??''} onChange={e=>setScalarValue(e.target.value?parseFloat(e.target.value):null)}/>}</div>);}

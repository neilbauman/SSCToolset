'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase/supabaseBrowser';

type Method = 'ratio' | 'multiply' | 'sum' | 'difference';
type DatasetOption = { table: string; label: string; type: 'Core'|'Other'|'Derived'; admin_level?: string|null; year?: number|null; };
type PreviewRow = { out_pcode: string; place_name: string|null; parent_pcode: string|null; parent_name: string|null; a: number|null; b: number|null; derived: number|null; col_a_used: string|null; col_b_used: string|null; };
type TaxTerm = { id: string; name: string; parent_id: string|null; category: string|null };
type Props = { countryIso: string; defaultAdminLevel?: string; defaultYear?: number; onClose?: () => void };

export default function CreateDerivedDatasetWizard_JoinAware({countryIso,defaultAdminLevel='ADM3',defaultYear=new Date().getFullYear(),onClose}:Props){
const router=useRouter();

// --- form state ---
const[title,setTitle]=useState('');const[desc,setDesc]=useState('');const[admin,setAdmin]=useState(defaultAdminLevel);const[year,setYear]=useState<number>(defaultYear);
const[method,setMethod]=useState<Method>('ratio');const[decimals,setDecimals]=useState(0);
const[datasets,setDatasets]=useState<DatasetOption[]>([]);const[loadingDatasets,setLoadingDatasets]=useState(true);
const[a,setA]=useState<DatasetOption|null>(null);const[b,setB]=useState<DatasetOption|null>(null);
const[colsA,setColsA]=useState<string[]>([]);const[colsB,setColsB]=useState<string[]>([]);const[colA,setColA]=useState('');const[colB,setColB]=useState('');
const[useScalar,setUseScalar]=useState(false);const[scalar,setScalar]=useState<number|null>(null);
const[tax,setTax]=useState<TaxTerm[]>([]);const[cats,setCats]=useState<string[]>([]);const[terms,setTerms]=useState<string[]>([]);
const[preview,setPreview]=useState<PreviewRow[]>([]);const[loadingPreview,setLoadingPreview]=useState(false);const[saving,setSaving]=useState(false);
const[peekA,setPeekA]=useState<any[]>([]);const[peekB,setPeekB]=useState<any[]>([]);

// --- load datasets ---
useEffect(()=>{(async()=>{const sb=supabaseBrowser;
try{
const [core,other,derived,taxonomy]=await Promise.all([
sb.from('view_country_core_summary').select('table_name,title,admin_level,year').eq('country_iso',countryIso),
sb.from('view_country_datasets').select('table_name,title,admin_level,year').eq('country_iso',countryIso),
sb.from('view_derived_dataset_summary').select('derived_dataset_id,derived_title,admin_level,year').eq('country_iso',countryIso),
sb.from('taxonomy_terms').select('id,name,parent_id,category').order('category').order('name')
]);
const make=(arr:any[],type:'Core'|'Other'|'Derived',nameKey='title',tableKey='table_name')=>arr.map((r:any)=>({table:r[tableKey]||r.derived_dataset_id,label:r[nameKey],type,admin_level:r.admin_level,year:r.year}));
setDatasets([...make(core.data??[],'Core'),...make(other.data??[],'Other'),...make(derived.data??[],'Derived','derived_title','derived_dataset_id')]);
setTax(taxonomy.data??[]);
}catch(e){console.error(e);}finally{setLoadingDatasets(false);}})();},[countryIso]);

const grouped=useMemo(()=>({Core:datasets.filter(d=>d.type==='Core'),Other:datasets.filter(d=>d.type==='Other'),Derived:datasets.filter(d=>d.type==='Derived')}),[datasets]);
const parents=useMemo(()=>tax.filter(t=>t.parent_id===null),[tax]);const childByParent=useMemo(()=>{const m:Record<string,TaxTerm[]>={};tax.forEach(t=>{if(t.parent_id){m[t.parent_id]=m[t.parent_id]||[];m[t.parent_id].push(t);}});return m;},[tax]);

async function fetchCols(t:string){const sb=supabaseBrowser;const{data}=await sb.from(t).select('*').limit(1);if(!data?.[0])return[];return Object.keys(data[0]).filter(k=>!isNaN(Number((data[0]as any)[k])));}
useEffect(()=>{if(a?.table)fetchCols(a.table).then(setColsA);},[a]);useEffect(()=>{if(b?.table&&!useScalar)fetchCols(b.table).then(setColsB);},[b,useScalar]);
const formula=useMemo(()=>{const A=colA||'A';const B=useScalar?(scalar??'B'):colB||'B';return{ratio:`${A} ÷ ${B}`,multiply:`${A} × ${B}`,sum:`${A} + ${B}`,difference:`${A} − ${B}`}[method];},[method,colA,colB,useScalar,scalar]);

async function peek(table:string|undefined,set:(r:any[])=>void){if(!table)return set([]);const sb=supabaseBrowser;const{data}=await sb.from(table).select('*').limit(10);set(data??[]);}
async function previewJoin(){if(!a?.table||!colA)return alert('Select A');if(!useScalar&&!b?.table)return alert('Select B');setLoadingPreview(true);
try{const sb=supabaseBrowser;const{data,error}=await sb.rpc('simulate_join_preview_autoaggregate',{p_table_a:a.table,p_table_b:useScalar?null:b?.table??null,p_country:countryIso,p_target_level:admin,p_method:method,p_col_a:colA,p_col_b:useScalar?null:colB??null,p_use_scalar_b:useScalar,p_scalar_b_val:useScalar?scalar??0:null});
if(error)throw error;setPreview((data??[])as PreviewRow[]);}catch(e:any){alert(e.message);}finally{setLoadingPreview(false);}}
async function save(){if(!title.trim())return alert('Title required');if(preview.length===0)return alert('Generate preview first');setSaving(true);
try{const sb=supabaseBrowser;const sources={table_a:a?.table,col_a:colA,table_b:useScalar?null:b?.table,col_b:useScalar?null:colB,method,decimals,admin_level:admin,taxonomy_categories:cats,taxonomy_terms:terms,description:desc};
const rows=preview.map(r=>({pcode:r.out_pcode,name:r.place_name,parent_pcode:r.parent_pcode,parent_name:r.parent_name,a:r.a,b:r.b,derived:r.derived,col_a_used:r.col_a_used,col_b_used:r.col_b_used}));
const{error}=await sb.rpc('create_derived_dataset',{p_country:countryIso,p_title:title,p_admin_level:admin,p_year:year,p_method:method,p_sources:JSON.stringify(sources),p_scalar_b:useScalar?scalar:null,p_rows:JSON.stringify(rows)});if(error)throw error;router.refresh();onClose?.();}catch(e:any){alert(e.message);}finally{setSaving(false);}}

// --- render ---
return(<div className="w-full max-w-3xl rounded-xl border bg-white shadow-md">
<header className="flex items-center justify-between border-b p-3">
<h2 className="text-lg font-semibold">Create Derived Dataset</h2>
<button onClick={onClose} className="text-sm border px-3 py-1 rounded">Close</button>
</header>

<div className="max-h-[75vh] overflow-y-auto p-3 space-y-4 text-sm">
{/* Basic info */}
<div className="grid sm:grid-cols-2 gap-2">
<input className="border rounded p-2" placeholder="Title" value={title} onChange={e=>setTitle(e.target.value)}/>
<select className="border rounded p-2" value={admin} onChange={e=>setAdmin(e.target.value)}>{['ADM0','ADM1','ADM2','ADM3','ADM4'].map(l=><option key={l}>{l}</option>)}</select>
<input type="number" className="border rounded p-2" value={year} onChange={e=>setYear(+e.target.value)}/>
<input className="border rounded p-2" placeholder="Description" value={desc} onChange={e=>setDesc(e.target.value)}/>
</div>

{/* Dataset selection */}
<div>
<div className="font-semibold border-b pb-1 mb-2">Dataset Selection</div>
{loadingDatasets?<div className="text-gray-500">Loading datasets…</div>:(
<div className="grid sm:grid-cols-3 gap-2 mb-2">
<select className="border rounded p-2" value={method} onChange={e=>setMethod(e.target.value as Method)}><option value="ratio">Ratio (A÷B)</option><option value="multiply">Multiply (A×B)</option><option value="sum">Sum (A+B)</option><option value="difference">Diff (A−B)</option></select>
<select className="border rounded p-2" value={decimals} onChange={e=>setDecimals(+e.target.value)}><option value={0}>0 dec</option><option value={1}>1 dec</option><option value={2}>2 dec</option></select>
<div className="border rounded p-2 text-center"><b>Formula:</b> {formula}</div>
</div>)}

<div className="grid sm:grid-cols-2 gap-2">
<Picker title="Dataset A" grouped={grouped} dataset={a} setDataset={setA} cols={colsA} col={colA} setCol={setColA} peekRows={peekA} onPeek={()=>peek(a?.table,setPeekA)}/>
<Picker title="Dataset B / Scalar" grouped={grouped} dataset={b} setDataset={setB} cols={colsB} col={colB} setCol={setColB} useScalar={useScalar} setUseScalar={setUseScalar} scalar={scalar} setScalar={setScalar} peekRows={peekB} onPeek={()=>peek(b?.table,setPeekB)}/>
</div>
<button onClick={previewJoin} disabled={loadingPreview} className="mt-2 bg-black text-white rounded px-4 py-2">{loadingPreview?'Generating…':'Generate Preview'}</button>
</div>

{/* Preview */}
<div>
<div className="font-semibold border-b pb-1 mb-2">Preview</div>
{preview.length===0?<div className="text-gray-500">No preview</div>:<div className="overflow-x-auto border rounded">
<table className="min-w-full text-xs"><thead className="bg-gray-50"><tr><Th>PCode</Th><Th>Name</Th><Th>Parent</Th><Th>A</Th><Th>B</Th><Th>Derived</Th></tr></thead><tbody>{preview.map(r=><tr key={r.out_pcode} className="border-t"><Td>{r.out_pcode}</Td><Td>{r.place_name}</Td><Td>{r.parent_name||r.parent_pcode}</Td><Td>{r.a}</Td><Td>{useScalar?scalar:r.b}</Td><Td className="font-semibold">{r.derived}</Td></tr>)}</tbody></table></div>}
</div>

{/* Taxonomy */}
<div>
<div className="font-semibold border-b pb-1 mb-2">Taxonomy</div>
<div className="grid sm:grid-cols-2 gap-2">
<div className="border rounded p-2"><div className="font-medium mb-1">Categories</div>
{parents.map(c=><label key={c.id} className="block"><input type="checkbox" checked={cats.includes(c.id)} onChange={e=>{setCats(e.target.checked?[...cats,c.id]:cats.filter(x=>x!==c.id));if(!e.target.checked){const child=(childByParent[c.id]??[]).map(t=>t.id);setTerms(p=>p.filter(id=>!child.includes(id)));}}}/> {c.name}</label>)}
</div>
<div className="border rounded p-2"><div className="font-medium mb-1">Terms</div>
{cats.length===0?<div className="text-gray-500">Select a category</div>:cats.flatMap(id=>childByParent[id]??[]).map(t=><label key={t.id} className="block"><input type="checkbox" checked={terms.includes(t.id)} onChange={e=>setTerms(e.target.checked?[...terms,t.id]:terms.filter(x=>x!==t.id))}/> {t.name}</label>)}
</div>
</div>
</div>
</div>

<footer className="flex justify-between items-center border-t p-3">
<span className="text-xs text-gray-500">Saving via create_derived_dataset</span>
<div className="flex gap-2">
<button onClick={onClose} className="border px-3 py-1 rounded">Cancel</button>
<button onClick={save} disabled={saving||!preview.length} className="bg-blue-600 text-white px-3 py-1 rounded">{saving?'Saving…':'Save Derived Dataset'}</button>
</div>
</footer>
</div>);
}

// --- small components ---
function Th({children}:{children:any}){return<th className="px-2 py-1 text-left text-gray-600">{children}</th>;}
function Td({children,className}:{children:any;className?:string}){return<td className={`px-2 py-1 ${className??''}`}>{children}</td>;}

function Picker({title,grouped,dataset,setDataset,cols,col,setCol,useScalar,setUseScalar,scalar,setScalar,onPeek,peekRows}:{title:string;grouped:Record<'Core'|'Other'|'Derived',DatasetOption[]>;dataset:DatasetOption|null;setDataset:(d:DatasetOption|null)=>void;cols:string[];col:string;setCol:(v:string)=>void;useScalar?:boolean;setUseScalar?:(v:boolean)=>void;scalar?:number|null;setScalar?:(n:number|null)=>void;onPeek:()=>void;peekRows:any[];}){
return(<div className="border rounded p-2">
<div className="flex items-center justify-between mb-1"><div className="font-medium">{title}</div>{setUseScalar&&<label className="text-xs flex items-center gap-1"><input type="checkbox" checked={!!useScalar} onChange={e=>setUseScalar?.(e.target.checked)}/>Scalar</label>}</div>
{!useScalar?(<>
<div className="flex gap-1">
<select className="w-full border rounded p-1" value={dataset?.table??''} onChange={e=>{const t=e.target.value;const found=grouped.Core.find(d=>d.table===t)||grouped.Other.find(d=>d.table===t)||grouped.Derived.find(d=>d.table===t)||null;setDataset(found);}}>
<option value="">Select dataset…</option>
{(['Core','Other','Derived']as const).map(g=><optgroup key={g} label={g}>{grouped[g].map(d=><option key={d.table} value={d.table}>{d.label}{d.year?` (${d.year})`:''}{d.admin_level?` · ${d.admin_level}`:''}</option>)}</optgroup>)}
</select>
<button onClick={onPeek} disabled={!dataset?.table} className="border rounded px-2 text-xs">Peek</button>
</div>
{cols.length>0&&<select className="mt-1 w-full border rounded p-1" value={col} onChange={e=>setCol(e.target.value)}><option value="">Select column…</option>{cols.map(c=><option key={c}>{c}</option>)}</select>}
{peekRows.length>0&&<div className="mt-2 border rounded overflow-x-auto max-h-32"><table className="min-w-full text-[11px]"><thead className="bg-gray-50"><tr>{Object.keys(peekRows[0]).map(k=><th key={k} className="px-1 py-0.5 text-left text-gray-500">{k}</th>)}</tr></thead><tbody>{peekRows.map((r,i)=><tr key={i} className="border-t">{Object.keys(peekRows[0]).map(k=><td key={k} className="px-1 py-0.5">{String((r as any)[k])}</td>)}</tr>)}</tbody></table></div>}
</>):<input type="number" className="w-full border rounded p-1" placeholder="Scalar value" value={scalar??''} onChange={e=>setScalar?.(e.target.value?parseFloat(e.target.value):null)}/>}
</div>);
}

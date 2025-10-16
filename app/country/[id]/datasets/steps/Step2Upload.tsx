"use client";
import Papa from "papaparse";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
const F="w-full border rounded-md px-3 py-2 text-sm outline-none focus:ring-2 ring-[color:var(--gsc-red)]",L="block text-xs font-medium text-[color:var(--gsc-gray)] mb-1",S="inline-flex items-center gap-2 border rounded-md px-3 py-2 text-sm hover:bg-gray-50";

export default function Step2Upload({meta,headers,setHeaders,rows,setRows,joinColumn,setJoinColumn,nameColumn,setNameColumn,matchInfo,setMatchInfo}:{meta:any;headers:string[];setHeaders:any;rows:any[];setRows:any;joinColumn:string;setJoinColumn:any;nameColumn:string;setNameColumn:any;matchInfo:any;setMatchInfo:any;}){
async function parseCSV(f:File){return new Promise<{headers:string[];rows:any[]}>((res,rej)=>Papa.parse(f,{header:true,skipEmptyLines:true,complete:r=>res({headers:r.meta.fields??[],rows:r.data.slice(0,200)}),error:rej}));}
async function handleFile(e:any){const f=e.target.files?.[0];if(!f)return;const{headers,rows}=await parseCSV(f);setHeaders(headers);setRows(rows);}
async function checkPcodes(){if(!joinColumn||!rows.length)return;const{data}=await supabase.from("admin_units").select("pcode").eq("level",meta.adminLevel);const known=new Set((data??[]).map((r:any)=>r.pcode));const codes=rows.map(r=>String(r[joinColumn]??"").trim());const found=codes.filter(c=>known.has(c));setMatchInfo({rate:Math.round((found.length/codes.length)*100)})}
return(<section className="space-y-3"><div><label className={L}>Upload CSV</label><input type="file" accept=".csv" onChange={handleFile}/></div>
{headers.length>0&&<div className="grid md:grid-cols-2 gap-3"><div><label className={L}>Admin PCode Column</label><select className={F} value={joinColumn} onChange={e=>setJoinColumn(e.target.value)}>{headers.map(h=><option key={h}>{h}</option>)}</select></div><div><label className={L}>Admin Name Column</label><select className={F} value={nameColumn} onChange={e=>setNameColumn(e.target.value)}><option value="">None</option>{headers.map(h=><option key={h}>{h}</option>)}</select></div></div>}
<button className={S} onClick={checkPcodes}>Check Codes</button>
{matchInfo&&<div className="text-xs border rounded p-2">{matchInfo.rate}% matched known {meta.adminLevel} units.</div>}
{rows.length>0&&<div className="border rounded p-2 max-h-60 overflow-auto text-xs"><table className="min-w-full"><thead><tr>{headers.map(h=><th key={h} className="text-left px-2 py-1 border-b">{h}</th>)}</tr></thead><tbody>{rows.slice(0,8).map((r,i)=><tr key={i}>{headers.map(h=><td key={h} className="px-2 py-1 border-b">{r[h]}</td>)}</tr>)}</tbody></table></div>}
</section>);
}

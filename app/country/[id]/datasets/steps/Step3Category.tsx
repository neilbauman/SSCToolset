"use client";
const F="w-full border rounded-md px-3 py-2 text-sm outline-none focus:ring-2 ring-[color:var(--gsc-red)]",L="block text-xs font-medium text-[color:var(--gsc-gray)] mb-1",S="inline-flex items-center gap-2 border rounded-md px-3 py-2 text-sm hover:bg-gray-50";
export default function Step3Category({headers,joinColumn,nameColumn,categoryCols,setCategoryCols,categoryMap,setCategoryMap}:{headers:string[];joinColumn:string;nameColumn:string;categoryCols:string[];setCategoryCols:any;categoryMap:any[];setCategoryMap:any;}){
function detect(){setCategoryMap(categoryCols.map(c=>({code:c,label:c})));}
return(<section className="space-y-3"><label className={L}>Select Category/Data Columns</label><select multiple className={`${F} h-40`} value={categoryCols} onChange={e=>setCategoryCols([...e.target.selectedOptions].map(o=>o.value))}>{headers.filter(h=>h!==joinColumn&&h!==nameColumn).map(h=><option key={h}>{h}</option>)}</select><button className={S} onClick={detect}>Confirm</button>{categoryMap.length>0&&<div className="border rounded p-2 text-xs"><p className="font-medium">Categories</p>{categoryMap.map(c=><div key={c.code}>{c.label}</div>)}</div>}</section>);
}

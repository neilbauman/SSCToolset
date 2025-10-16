"use client";
type Props = { meta: any; setMeta: (v: any) => void };
const F="w-full border rounded-md px-3 py-2 text-sm outline-none focus:ring-2 ring-[color:var(--gsc-red)]",L="block text-xs font-medium text-[color:var(--gsc-gray)] mb-1";

export default function Step1Meta({meta,setMeta}:Props){
return(<section className="space-y-3">
<div><label className={L}>Title *</label><input className={F} value={meta.title} onChange={e=>setMeta({...meta,title:e.target.value})}/></div>
<div><label className={L}>Description</label><textarea className={F} rows={3} value={meta.desc} onChange={e=>setMeta({...meta,desc:e.target.value})}/></div>
<div className="grid md:grid-cols-2 gap-3"><div><label className={L}>Source</label><input className={F} value={meta.source} onChange={e=>setMeta({...meta,source:e.target.value})}/></div><div><label className={L}>Source URL</label><input className={F} value={meta.sourceUrl} onChange={e=>setMeta({...meta,sourceUrl:e.target.value})}/></div></div>
<div className="grid md:grid-cols-3 gap-3"><div><label className={L}>Type</label><select className={F} value={meta.datasetType} onChange={e=>setMeta({...meta,datasetType:e.target.value})}><option value="gradient">Gradient</option><option value="categorical">Categorical</option></select></div>
<div><label className={L}>Format</label><select className={F} value={meta.dataFormat} onChange={e=>setMeta({...meta,dataFormat:e.target.value})}><option value="numeric">Numeric</option><option value="percentage">Percentage</option><option value="text">Text</option></select></div>
<div><label className={L}>Admin Level</label><select className={F} value={meta.adminLevel} onChange={e=>setMeta({...meta,adminLevel:e.target.value})}>{["ADM0","ADM1","ADM2","ADM3"].map(a=><option key={a}>{a}</option>)}</select></div></div>
{meta.adminLevel==="ADM0"&&<div><label className={L}>National Value</label><input className={F} value={meta.nationalValue} onChange={e=>setMeta({...meta,nationalValue:e.target.value})}/></div>}
<div><label className={L}>Year</label><input type="number" className={F} value={meta.year} onChange={e=>setMeta({...meta,year:e.target.value})}/></div>
</section>);
}

"use client";
export default function DatasetPreview({
  headers, rows, limit=50
}:{ headers:string[]; rows:Record<string,string>[]; limit?:number }){
  return (
    <div className="rounded-xl border overflow-auto bg-white">
      <table className="min-w-full text-sm">
        <thead className="bg-[var(--gsc-light-gray)]/60">
          <tr>{headers.map(h=><th key={h} className="p-2 text-left">{h}</th>)}</tr>
        </thead>
        <tbody>
          {rows.slice(0,limit).map((r,i)=>(
            <tr key={i} className="border-t">
              {headers.map(h=><td key={h} className="p-2">{r[h]??""}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length>limit && <div className="p-2 text-xs text-gray-500">Showing {limit} of {rows.length} rows…</div>}
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { Loader2, Database } from "lucide-react";

type DatasetMeta = { id: string; title: string; dataset_type: string | null; admin_level: string | null; unit: string | null; };

type CatRow = { admin_pcode: string; admin_level: string | null; category_label: string; category_score: number | null; };
type GradRow = { admin_pcode: string; admin_level: string | null; value: number | null; unit: string | null; };

export default function DatasetPreview({ dataset }: { dataset: DatasetMeta; countryIso: string }) {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [gradRows, setGradRows] = useState<GradRow[]>([]);
  const [catRows, setCatRows] = useState<CatRow[]>([]);
  const [catHeaders, setCatHeaders] = useState<string[]>([]);
  const [mapScores, setMapScores] = useState<Record<string, number | null>>({});
  const [nameMap, setNameMap] = useState<Record<string, string>>({});

  const isCat = dataset.dataset_type === "categorical";
  const isAdm0 = dataset.dataset_type === "adm0";

  useEffect(() => {
    (async () => {
      try {
        setLoading(true); setErr(null);

        if (isCat) {
          const [vRes, mRes] = await Promise.all([
            supabase.from("dataset_values_cat").select("admin_pcode,admin_level,category_label,category_score").eq("dataset_id", dataset.id).limit(100000),
            supabase.from("dataset_category_maps").select("label,score").eq("dataset_id", dataset.id).order("label")
          ]);
          if (vRes.error) throw vRes.error; if (mRes.error) throw mRes.error;

          const v = (vRes.data || []) as CatRow[];
          const m = (mRes.data || []) as { label: string; score: number | null }[];
          setCatRows(v);
          setCatHeaders((m.length?m.map(x=>x.label):Array.from(new Set(v.map(r=>r.category_label))).sort((a,b)=>a.localeCompare(b))));
          setMapScores(Object.fromEntries(m.map(x=>[x.label, x.score])));

          // fetch admin names once using pcodes found in v
          const pcodes = Array.from(new Set(v.map(r=>r.admin_pcode))).slice(0, 1000);
          if (pcodes.length) {
            const { data: admins, error: ae } = await supabase.from("admin_units").select("pcode,name").in("pcode", pcodes);
            if (ae) throw ae;
            const nm: Record<string,string> = {}; (admins||[]).forEach((a:any)=>nm[a.pcode]=a.name);
            setNameMap(nm);
          }
        } else {
          const { data, error } = await supabase.from("dataset_values").select("admin_pcode,admin_level,value,unit").eq("dataset_id", dataset.id).limit(100000);
          if (error) throw error;
          const rows = (data || []) as GradRow[];
          setGradRows(rows);

          const pcodes = Array.from(new Set(rows.map(r=>r.admin_pcode))).slice(0, 1000);
          if (pcodes.length) {
            const { data: admins, error: ae } = await supabase.from("admin_units").select("pcode,name").in("pcode", pcodes);
            if (ae) throw ae;
            const nm: Record<string,string> = {}; (admins||[]).forEach((a:any)=>nm[a.pcode]=a.name);
            setNameMap(nm);
          }
        }
      } catch (e:any) {
        setErr(e.message || "Failed to load preview.");
      } finally { setLoading(false); }
    })();
  }, [dataset.id, isCat]);

  // Pivot categorical into a matrix; use score -> mapScore -> ✓ presence
  const catMatrix = useMemo(() => {
    if (!isCat) return [];
    const byAdmin = new Map<string, Record<string, number | string | null>>();
    for (const r of catRows) {
      const key = r.admin_pcode;
      if (!byAdmin.has(key)) byAdmin.set(key, {});
      const cell =
        r.category_score ??
        (mapScores[r.category_label] ?? null) ??
        "✓";
      byAdmin.get(key)![r.category_label] = cell;
    }
    return Array.from(byAdmin.entries()).map(([p, obj]) => ({ admin_pcode: p, admin_name: nameMap[p] ?? "", ...obj }));
  }, [catRows, mapScores, nameMap, isCat]);

  if (loading) return <div className="text-sm text-gray-600 flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin"/>Loading preview…</div>;
  if (err) return <div className="rounded-lg p-3 text-sm" style={{color:"var(--gsc-red)", border:"1px solid var(--gsc-light-gray)", background:"white"}}>{err}</div>;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-[var(--gsc-gray)]"><Database className="h-4 w-4"/><span className="font-semibold">{dataset.title}</span><span className="text-xs opacity-70">({(dataset.dataset_type||"").toUpperCase()} • {dataset.admin_level})</span></div>

      {/* ADM0 single value */}
      {isAdm0 && (
        <div className="rounded-lg p-4 text-sm" style={{background:"white", border:"1px solid var(--gsc-light-gray)"}}>
          {gradRows.length===0 ? <div className="text-gray-500">No value.</div> :
            <div className="flex items-baseline gap-2"><div className="text-2xl font-semibold">{gradRows[0]?.value ?? "—"}</div>{dataset.unit && <div className="text-gray-500">{dataset.unit}</div>}</div>}
        </div>
      )}

      {/* Gradient values */}
      {!isCat && !isAdm0 && (
        <div className="overflow-auto rounded-lg" style={{border:"1px solid var(--gsc-light-gray)", background:"white"}}>
          <table className="min-w-full text-xs">
            <thead className="bg-[var(--gsc-beige)] text-[var(--gsc-gray)]"><tr>
              <th className="px-2 py-1 text-left">admin_pcode</th>
              <th className="px-2 py-1 text-left">admin_name</th>
              <th className="px-2 py-1 text-left">value</th>
              <th className="px-2 py-1 text-left">unit</th>
            </tr></thead>
            <tbody>
              {gradRows.slice(0,200).map((r,i)=>(
                <tr key={i} style={{borderTop:"1px solid var(--gsc-light-gray)"}}>
                  <td className="px-2 py-1">{r.admin_pcode}</td>
                  <td className="px-2 py-1">{nameMap[r.admin_pcode] ?? "—"}</td>
                  <td className="px-2 py-1">{r.value ?? "—"}</td>
                  <td className="px-2 py-1">{r.unit ?? dataset.unit ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Categorical (pivoted headers, visible data) */}
      {isCat && (
        <div className="overflow-auto rounded-lg" style={{border:"1px solid var(--gsc-light-gray)", background:"white"}}>
          <table className="min-w-full text-xs">
            <thead className="bg-[var(--gsc-beige)] text-[var(--gsc-gray)]">
              <tr>
                <th className="px-2 py-1 text-left">admin_pcode</th>
                <th className="px-2 py-1 text-left">admin_name</th>
                {catHeaders.map(h=> <th key={h} className="px-2 py-1 text-left">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {catMatrix.slice(0,200).map((row:any,i:number)=>(
                <tr key={i} style={{borderTop:"1px solid var(--gsc-light-gray)"}}>
                  <td className="px-2 py-1">{row.admin_pcode}</td>
                  <td className="px-2 py-1">{row.admin_name || "—"}</td>
                  {catHeaders.map(h=>{
                    const v = row[h];
                    const isCheck = v === "✓";
                    return (
                      <td key={h} className="px-2 py-1" style={isCheck?{color:"var(--gsc-green)"}:undefined}>
                        {v ?? "—"}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

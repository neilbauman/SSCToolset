"use client";
import { useState, useEffect, useMemo } from "react";
import { useParams } from "next/navigation";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { ArrowLeft, ArrowRight, Upload, CheckCircle2, FileSpreadsheet, Search, Loader2 } from "lucide-react";
import { saveDataset, GradientRow, CategoricalRow, CategoryMapItem, MetaInput, DatasetType } from "@/lib/datasets/saveDataset";

/* small helpers */
const parseCsv = (t: string) => {
  const l = t.replace(/\r/g, "").split("\n").filter(Boolean);
  const h = l[0].split(",").map((s) => s.trim());
  return { headers: h, rows: l.slice(1).map((r) => Object.fromEntries(h.map((k, i) => [k, (r.split(",")[i] || "").trim()]))) };
};
const parseFile = async (f: File) => parseCsv(await f.text());
const Step = ({ title, children, back, next, disable }: any) => (
  <div className="space-y-4">
    <h2 className="text-lg font-semibold">{title}</h2>
    <div className="rounded-xl border p-4">{children}</div>
    <div className="flex justify-between">
      {back ? (
        <button onClick={back} className="border px-3 py-1 rounded-xl flex items-center gap-1">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
      ) : <span/>}
      {next && (
        <button onClick={next} disabled={disable} className="bg-black text-white px-3 py-1 rounded-xl flex items-center gap-1">
          Next <ArrowRight className="h-4 w-4" />
        </button>
      )}
    </div>
  </div>
);

export default function DatasetWizard() {
  const raw = (useParams()?.id ?? "") as string | string[];
  const iso = (Array.isArray(raw) ? raw[0] : raw)?.toUpperCase() || "";

  /* shared state */
  const [datasetId, setDatasetId] = useState<string | null>(null);
  const [type, setType] = useState<DatasetType>("gradient");
  const [step, setStep] = useState(0);
  const [err, setErr] = useState(""); const [loading, setLoading] = useState(false);

  /* STEP 1 – metadata */
  const [meta, setMeta] = useState({
    title: "", dataset_type: "gradient", data_format: "numeric", admin_level: "ADM3",
    join_field: "admin_pcode", year: "", unit: "", source_name: "", source_url: "",
    indicator_id: ""
  });
  const [indicators, setIndicators] = useState<{ id: string; name: string }[]>([]);
  const [q, setQ] = useState(""); const [taxonomy, setTaxonomy] = useState<{ category: string | null; term: string | null }>({ category: null, term: null });

  useEffect(() => { (async () => {
    const { data } = await supabase.from("indicator_catalogue").select("id,name").order("name");
    setIndicators(data || []);
  })(); }, []);
  useEffect(() => { (async () => {
    if (!meta.indicator_id) return setTaxonomy({ category: null, term: null });
    const { data: l } = await supabase.from("indicator_taxonomy_links").select("taxonomy_id").eq("indicator_id", meta.indicator_id).limit(1);
    const tid = l?.[0]?.taxonomy_id;
    if (!tid) return setTaxonomy({ category: null, term: null });
    const { data: t } = await supabase.from("taxonomy_terms").select("category,name").eq("id", tid).maybeSingle();
    setTaxonomy({ category: (t as any)?.category ?? null, term: (t as any)?.name ?? null });
  })(); }, [meta.indicator_id]);

  async function saveMeta() {
    try {
      setLoading(true); setErr("");
      if (!meta.title || !meta.dataset_type || !meta.admin_level || !meta.join_field) throw new Error("Missing required fields");
      const payload = {
        country_iso: iso, title: meta.title.trim(), dataset_type: meta.dataset_type,
        data_format: meta.data_format, admin_level: meta.admin_level,
        join_field: meta.join_field.trim(), indicator_id: meta.indicator_id || null,
        year: meta.year ? Number(meta.year) : null, unit: meta.unit || null,
        source_name: meta.source_name || null, source_url: meta.source_url || null,
        created_at: new Date().toISOString()
      };
      const { data, error } = await supabase.from("dataset_metadata").insert(payload).select("id").single();
      if (error) throw error;
      setDatasetId(data.id); setType(meta.dataset_type as DatasetType); setStep(1);
    } catch (e: any) { setErr(e.message); } finally { setLoading(false); }
  }

  /* STEP 2–4 states */
  const [file, setFile] = useState<File | null>(null);
  const [parsed, setParsed] = useState<{ headers: string[]; rows: Record<string, string>[] }>({ headers: [], rows: [] });
  const [join, setJoin] = useState("admin_pcode");
  const [valCol, setVal] = useState("");
  const [cats, setCats] = useState<string[]>([]);
  const [map, setMap] = useState<CategoryMapItem[]>([]);
  const [adm0, setAdm0] = useState("");

  useEffect(() => { if (type === "categorical") setMap(cats.map((c) => ({ code: c, label: c, score: null }))); }, [cats, type]);
  const onFile = async (f: File) => setParsed(await parseFile(f));

  const steps = useMemo(() => (type === "adm0" ? ["Meta", "ADM0", "Save"] :
    type === "categorical" ? ["Meta", "Upload", "Scores", "Save"] : ["Meta", "Upload", "Save"]), [type]);

  /* SAVE all */
  const next = async () => {
    try {
      if (steps[step] === "Save") {
        if (!datasetId) throw new Error("Dataset ID missing from Step 1");
        setLoading(true);
        const metaInput: MetaInput = {
          id: datasetId, title: meta.title, country_iso: iso, admin_level: meta.admin_level,
          dataset_type: meta.dataset_type, data_format: meta.data_format,
          year: meta.year ? +meta.year : null, unit: meta.unit,
          join_field: meta.join_field, indicator_id: meta.indicator_id || null,
          source_name: meta.source_name || null, source_url: meta.source_url || null
        };

        if (type === "adm0") {
          await saveDataset(metaInput, [{ admin_pcode: "ADM0", admin_level: "ADM0", value: +adm0, unit: meta.unit }]);
        } else if (type === "gradient") {
          const rows: GradientRow[] = parsed.rows.map((r) => ({
            admin_pcode: r[join], admin_level: meta.admin_level,
            value: +((r[valCol] ?? "").replace(/,/g, "")), unit: meta.unit
          })).filter((r) => r.admin_pcode && !isNaN(r.value));
          await saveDataset(metaInput, rows);
        } else if (type === "categorical") {
          const rows: CategoricalRow[] = [];
          cats.forEach((c) =>
            parsed.rows.forEach((r) =>
              rows.push({
                admin_pcode: r[join], admin_level: meta.admin_level,
                category_code: c, category_label: c,
                category_score: map.find((m) => m.label === c)?.score ?? null
              })
            ));
          await saveDataset(metaInput, rows, map);
        }
        window.location.href = `/country/${iso}/datasets`;
        return;
      }
      setStep((s) => s + 1);
    } catch (e: any) { setErr(e.message); } finally { setLoading(false); }
  };

  /* UI */
  return (
    <SidebarLayout headerProps={{
      title: `${iso} – Add Dataset`,
      group: "country-config",
      description: "Upload or create datasets and link them to indicators.",
      tool: "Dataset Wizard",
      breadcrumbs: <Breadcrumbs items={[
        { label: "Countries", href: "/country" },
        { label: iso, href: `/country/${iso}` },
        { label: "Datasets", href: `/country/${iso}/datasets` },
        { label: "Add" }
      ]}/>
    }}>
      <div className="space-y-4">
        {err && <div className="bg-red-50 text-red-700 border p-2 rounded">{err}</div>}
        <div className="border p-2 rounded-xl text-sm flex items-center gap-2" style={{borderColor:"var(--gsc-light-gray)"}}>
          <FileSpreadsheet className="h-4 w-4"/> Step {step+1}/{steps.length}: {steps[step]}
        </div>

        {/* STEP 1 */}
        {steps[step]==="Meta" && (
          <Step title="Dataset details" next={saveMeta}>
            <div className="grid md:grid-cols-2 gap-3">
              <input className="border p-2 rounded" placeholder="Title"
                value={meta.title} onChange={e=>setMeta({...meta,title:e.target.value})}/>
              <select className="border p-2 rounded" value={meta.dataset_type}
                onChange={e=>setMeta({...meta,dataset_type:e.target.value})}>
                {["adm0","gradient","categorical"].map(x=><option key={x}>{x}</option>)}
              </select>
              <select className="border p-2 rounded" value={meta.data_format}
                onChange={e=>setMeta({...meta,data_format:e.target.value})}>
                {["numeric","percentage","text"].map(x=><option key={x}>{x}</option>)}
              </select>
              <select className="border p-2 rounded" value={meta.admin_level}
                onChange={e=>setMeta({...meta,admin_level:e.target.value})}>
                {["ADM0","ADM1","ADM2","ADM3","ADM4","ADM5"].map(x=><option key={x}>{x}</option>)}
              </select>
              <input className="border p-2 rounded" placeholder="Join field (admin_pcode)"
                value={meta.join_field} onChange={e=>setMeta({...meta,join_field:e.target.value})}/>
              <input className="border p-2 rounded" placeholder="Year" value={meta.year}
                onChange={e=>setMeta({...meta,year:e.target.value})}/>
              <input className="border p-2 rounded" placeholder="Unit" value={meta.unit}
                onChange={e=>setMeta({...meta,unit:e.target.value})}/>
              <input className="border p-2 rounded" placeholder="Source Name" value={meta.source_name}
                onChange={e=>setMeta({...meta,source_name:e.target.value})}/>
              <input className="border p-2 rounded" placeholder="Source URL" value={meta.source_url}
                onChange={e=>setMeta({...meta,source_url:e.target.value})}/>
            </div>

            <div className="border rounded p-3 space-y-2 mt-3" style={{borderColor:"var(--gsc-light-gray)"}}>
              <div className="text-sm text-gray-600">Indicator (optional)</div>
              <div className="flex gap-2 items-center">
                <div className="relative grow">
                  <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search indicators…"
                    className="w-full rounded border px-8 py-2 text-sm" style={{borderColor:"var(--gsc-light-gray)"}}/>
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400"/>
                </div>
                <select className="border rounded p-2 text-sm" style={{borderColor:"var(--gsc-light-gray)"}}
                  value={meta.indicator_id} onChange={e=>setMeta({...meta,indicator_id:e.target.value})}>
                  <option value="">(none)</option>
                  {indicators.filter(i=>i.name.toLowerCase().includes(q.toLowerCase())).slice(0,300)
                    .map(i=><option key={i.id} value={i.id}>{i.name}</option>)}
                </select>
              </div>
              <div className="text-xs text-gray-600">
                Taxonomy:&nbsp;<span className="font-medium">{taxonomy.category??"—"}</span>
                {taxonomy.term?<> • <span>{taxonomy.term}</span></>:null}
              </div>
            </div>

            <div className="flex justify-end mt-3">
              <button disabled={loading} onClick={saveMeta}
                className="bg-[var(--gsc-blue)] text-white px-4 py-2 rounded-xl">
                {loading?<><Loader2 className="h-4 w-4 animate-spin inline mr-2"/>Saving…</>:"Save & Continue"}
              </button>
            </div>
          </Step>
        )}

        {/* ADM0 */}
        {steps[step]==="ADM0" && (
          <Step title="ADM0 value" back={()=>setStep(s=>s-1)} next={next}>
            <input className="border p-2 rounded w-full" placeholder="Numeric value"
              value={adm0} onChange={e=>setAdm0(e.target.value)}/>
          </Step>
        )}

        {/* Upload */}
        {steps[step]==="Upload" && (
          <Step title="Upload file & map" back={()=>setStep(s=>s-1)} next={next}>
            <input type="file" accept=".csv" onChange={e=>e.target.files&&setFile(e.target.files[0])}/>
            {file && <button className="mt-2 border px-3 py-1 rounded" onClick={()=>file&&onFile(file)}>
              <Upload className="h-4 w-4 inline mr-1"/>Parse file</button>}
            {parsed.headers.length>0&&(
              <>
                <div className="mt-3 text-sm text-gray-600">Join column</div>
                <select className="border p-2 rounded w-full" value={join} onChange={e=>setJoin(e.target.value)}>
                  {parsed.headers.map((h)=><option key={h}>{h}</option>)}
                </select>
                {type==="gradient"&&(
                  <>
                    <div className="mt-3 text-sm text-gray-600">Value column</div>
                    <select className="border p-2 rounded w-full" value={valCol} onChange={e=>setVal(e.target.value)}>
                      {parsed.headers.map((h)=><option key={h}>{h}</option>)}
                    </select>
                  </>
                )}
                {type==="categorical"&&(
                  <div className="mt-3 border rounded p-2 grid gap-1" style={{borderColor:"var(--gsc-light-gray)"}}>
                    <div className="text-sm text-gray-600">Category columns</div>
                    {parsed.headers.map((h)=>
                      <label key={h} className="flex items-center gap-2">
                        <input type="checkbox" checked={cats.includes(h)} onChange={e=>setCats(p=>e.target.checked?[...p,h]:p.filter(x=>x!==h))}/>
                        {h}
                      </label>)}
                  </div>
                )}
              </>
            )}
          </Step>
        )}

        {/* Scores */}
        {steps[step]==="Scores"&&(
          <Step title="Category scores (optional)" back={()=>setStep(s=>s-1)} next={next}>
            {map.length===0?<div className="text-sm text-gray-600">No categories selected.</div>:
              map.map((m,i)=><div key={m.label} className="flex justify-between items-center gap-2 text-sm">
                <span>{m.label}</span>
                <input className="border p-1 rounded w-24" value={m.score??""}
                  onChange={e=>setMap(prev=>prev.map((x,j)=>j===i?{...x,score:e.target.value?+e.target.value:null}:x))}/>
              </div>)}
          </Step>
        )}

        {/* Save */}
        {steps[step]==="Save"&&(
          <div className="border p-4 rounded-xl space-y-2">
            <CheckCircle2 className="text-green-600 h-5 w-5 inline"/> Ready to save.
            <button onClick={next} disabled={loading} className="bg-black text-white px-4 py-2 rounded-xl">
              {loading?"Saving…":"Save"}
            </button>
          </div>
        )}
      </div>
    </SidebarLayout>
  );
}

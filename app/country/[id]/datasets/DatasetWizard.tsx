"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { ArrowLeft, ArrowRight, Upload, CheckCircle2, FileSpreadsheet, Search } from "lucide-react";
import { saveDataset, DatasetType, MetaInput, GradientRow, CategoricalRow, CategoryMapItem } from "@/lib/datasets/saveDataset";

type Parsed = { headers: string[]; rows: Record<string, string>[] };
const parseCsv = (t: string): Parsed => {
  const l = t.replace(/\r/g, "").split("\n").filter(Boolean);
  if (!l.length) return { headers: [], rows: [] };
  const h = l[0].split(",").map((s) => s.trim());
  return {
    headers: h,
    rows: l.slice(1).map((x) => {
      const p = x.split(",");
      const o: Record<string, string> = {};
      h.forEach((k, i) => (o[k] = (p[i] ?? "").trim()));
      return o;
    }),
  };
};
const parseFile = async (f: File) => (f.name.endsWith(".csv") ? parseCsv(await f.text()) : (() => { throw new Error("CSV only unless XLSX installed"); })());

type Indicator = { id: string; name: string };
type Tax = { category: string | null; term: string | null };

function Step({
  title,
  back,
  next,
  disable,
  children,
}: {
  title: string;
  back?: () => void;
  next?: () => void;
  disable?: boolean;
  children: any;
}) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="rounded-xl border p-4">{children}</div>
      <div className="flex justify-between">
        <button onClick={back} disabled={!back} className="border px-3 py-1 rounded-xl">
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <button onClick={next} disabled={disable} className="bg-black text-white px-3 py-1 rounded-xl">
          <ArrowRight className="h-4 w-4" />
          Next
        </button>
      </div>
    </div>
  );
}

export default function DatasetWizard() {
  const raw = (useParams()?.id ?? "") as string | string[];
  const iso = (Array.isArray(raw) ? raw[0] : raw)?.toUpperCase() || "";

  // meta
  const [type, setType] = useState<DatasetType>("gradient");
  const [title, setTitle] = useState("");
  const [admLevel, setAdm] = useState("ADM3");
  const [year, setYear] = useState("");
  const [unit, setUnit] = useState("");
  const [joinField, setJoinField] = useState("admin_pcode");

  // indicator/taxonomy
  const [indicatorId, setIndicatorId] = useState<string | null>(null);
  const [indicators, setIndicators] = useState<Indicator[]>([]);
  const [q, setQ] = useState("");
  const [tax, setTax] = useState<Tax>({ category: null, term: null });

  // file + mapping
  const [file, setFile] = useState<File | null>(null);
  const [parsed, setParsed] = useState<Parsed>({ headers: [], rows: [] });
  const [join, setJoin] = useState("");
  const [valCol, setVal] = useState("");
  const [cats, setCats] = useState<string[]>([]);
  const [map, setMap] = useState<CategoryMapItem[]>([]);
  const [adm0, setAdm0] = useState("");

  const [err, setErr] = useState("");
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);

  const steps = useMemo(
    () => (type === "adm0" ? ["Meta", "ADM0", "Save"] : type === "categorical" ? ["Meta", "Upload", "Scores", "Save"] : ["Meta", "Upload", "Save"]),
    [type]
  );

  useEffect(() => {
    // preload indicators
    (async () => {
      const { data } = await supabase.from("indicator_catalogue").select("id,name").order("name").limit(1000);
      setIndicators(((data || []) as Indicator[]));
    })();
  }, []);

  useEffect(() => {
    if (type !== "categorical") return;
    setMap(cats.map((c) => ({ code: c, label: c, score: null })));
  }, [cats, type]);

  useEffect(() => {
    (async () => {
      if (!indicatorId) {
        setTax({ category: null, term: null });
        return;
      }
      const { data: links } = await supabase
        .from("indicator_taxonomy_links")
        .select("taxonomy_id")
        .eq("indicator_id", indicatorId)
        .limit(1);
      const tid = links?.[0]?.taxonomy_id;
      if (!tid) {
        setTax({ category: null, term: null });
        return;
      }
      const { data: term } = await supabase.from("taxonomy_terms").select("category,name").eq("id", tid).maybeSingle();
      setTax({ category: (term as any)?.category ?? null, term: (term as any)?.name ?? null });
    })();
  }, [indicatorId]);

  const onFile = async (f: File) => setParsed(await parseFile(f));

  const next = async () => {
    try {
      if (steps[step] === "Save") {
        setLoading(true);
        const meta: MetaInput = {
          title,
          country_iso: iso,
          admin_level: admLevel,
          data_type: type === "categorical" ? "categorical" : "numeric",
          data_format: "numeric",
          dataset_type: type,
          year: year ? +year : null,
          unit,
          join_field: joinField || "admin_pcode",
          indicator_id: indicatorId,
          source_name: null,
          source_url: null,
        };

        if (type === "adm0") {
          await saveDataset(meta, [{ admin_pcode: "ADM0", admin_level: "ADM0", value: +adm0, unit }]);
        }
        if (type === "gradient") {
          const rows: GradientRow[] = parsed.rows
            .map((r) => ({
              admin_pcode: r[join],
              admin_level: admLevel,
              value: +((r[valCol] as any)?.replace?.(/,/g, "") ?? r[valCol]),
              unit,
            }))
            .filter((r) => r.admin_pcode && !isNaN(r.value));
          await saveDataset(meta, rows);
        }
        if (type === "categorical") {
          const rows: CategoricalRow[] = [];
          cats.forEach((c) =>
            parsed.rows.forEach((r) =>
              rows.push({
                admin_pcode: r[join],
                admin_level: admLevel,
                category_code: c,
                category_label: c,
                category_score: map.find((m) => m.label === c)?.score ?? null,
              })
            )
          );
          await saveDataset(meta, rows, map);
        }
        window.location.href = `/country/${iso}/datasets`;
        return;
      }
      setStep((s) => s + 1);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SidebarLayout
      headerProps={{
        title: `${iso} – Add Dataset`,
        group: "country-config",
        description: "Upload raw data and link it to an indicator & taxonomy for future SSC instances.",
        tool: "Dataset Wizard",
        breadcrumbs: (
          <Breadcrumbs
            items={[
              { label: "Countries", href: "/country" },
              { label: iso, href: `/country/${iso}` },
              { label: "Datasets", href: `/country/${iso}/datasets` },
              { label: "Add" },
            ]}
          />
        ),
      }}
    >
      <div className="space-y-4">
        <div className="border p-2 rounded-xl text-sm flex items-center gap-2" style={{ borderColor: "var(--gsc-light-gray)" }}>
          <FileSpreadsheet className="h-4 w-4" />
          Step {step + 1}/{steps.length}: {steps[step]}
        </div>
        {err && <div className="bg-red-50 text-red-700 border p-2 rounded">{err}</div>}

        {/* META */}
        "use client";
import { useState, useEffect } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { Search, Loader2 } from "lucide-react";

export default function DatasetWizardStep1({ iso, onSaved }: { iso: string; onSaved: (id: string) => void }) {
  const [form, setForm] = useState({
    title: "",
    dataset_type: "gradient",
    data_format: "numeric",
    admin_level: "ADM3",
    join_field: "admin_pcode",
    indicator_id: "",
    year: "",
    unit: "",
    source_name: "",
    source_url: ""
  });
  const [indicators, setIndicators] = useState<{ id: string; name: string }[]>([]);
  const [taxonomy, setTaxonomy] = useState<{ category: string | null; term: string | null }>({ category: null, term: null });
  const [q, setQ] = useState(""); const [saving, setSaving] = useState(false); const [err, setErr] = useState("");

  useEffect(() => { (async () => {
    const { data } = await supabase.from("indicator_catalogue").select("id,name").order("name");
    setIndicators(data || []);
  })(); }, []);

  useEffect(() => { (async () => {
    if (!form.indicator_id) return setTaxonomy({ category: null, term: null });
    const { data: link } = await supabase.from("indicator_taxonomy_links").select("taxonomy_id").eq("indicator_id", form.indicator_id).limit(1);
    const tid = link?.[0]?.taxonomy_id; if (!tid) return setTaxonomy({ category: null, term: null });
    const { data: t } = await supabase.from("taxonomy_terms").select("category,name").eq("id", tid).maybeSingle();
    setTaxonomy({ category: (t as any)?.category ?? null, term: (t as any)?.name ?? null });
  })(); }, [form.indicator_id]);

  async function save() {
    try {
      setSaving(true); setErr("");
      if (!form.title || !form.dataset_type || !form.admin_level || !form.join_field) throw new Error("Missing required fields");
      const payload = {
        country_iso: iso,
        title: form.title.trim(),
        dataset_type: form.dataset_type,
        data_format: form.data_format,
        admin_level: form.admin_level,
        join_field: form.join_field.trim(),
        indicator_id: form.indicator_id || null,
        year: form.year ? Number(form.year) : null,
        unit: form.unit || null,
        source_name: form.source_name || null,
        source_url: form.source_url || null,
        created_at: new Date().toISOString()
      };
      const { data, error } = await supabase.from("dataset_metadata").insert(payload).select("id").single();
      if (error) throw error;
      onSaved(data.id);
    } catch (e: any) { setErr(e.message); } finally { setSaving(false); }
  }

  const input = (label: string, name: keyof typeof form, type="text", opts?: any) => (
    <label className="text-sm flex flex-col">
      <span className="mb-1 text-gray-600">{label}</span>
      <input {...opts} type={type} value={form[name] as any} onChange={e=>setForm({...form,[name]:e.target.value})}
        className="border rounded p-2 text-sm" style={{borderColor:"var(--gsc-light-gray)"}} />
    </label>
  );

  return (
    <div className="space-y-4">
      {err && <div className="bg-red-50 text-red-700 border p-2 rounded">{err}</div>}
      <div className="grid md:grid-cols-2 gap-3">
        {input("Title","title")}
        <label className="text-sm">
          <span className="mb-1 text-gray-600">Dataset Type</span>
          <select className="border rounded p-2 text-sm w-full" value={form.dataset_type}
            onChange={e=>setForm({...form,dataset_type:e.target.value})}>
            {["adm0","gradient","categorical"].map(x=><option key={x}>{x}</option>)}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 text-gray-600">Data Format</span>
          <select className="border rounded p-2 text-sm w-full" value={form.data_format}
            onChange={e=>setForm({...form,data_format:e.target.value})}>
            {["numeric","percentage","text"].map(x=><option key={x}>{x}</option>)}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 text-gray-600">Admin Level</span>
          <select className="border rounded p-2 text-sm w-full" value={form.admin_level}
            onChange={e=>setForm({...form,admin_level:e.target.value})}>
            {["ADM0","ADM1","ADM2","ADM3","ADM4","ADM5"].map(x=><option key={x}>{x}</option>)}
          </select>
        </label>
        {input("Join Field (CSV column for PCodes)","join_field")}
        {input("Year","year","number")}
        {input("Unit","unit")}
        {input("Source Name","source_name")}
        {input("Source URL","source_url")}
      </div>

      <div className="border rounded p-3 space-y-2" style={{borderColor:"var(--gsc-light-gray)"}}>
        <div className="text-sm text-gray-600">Indicator (optional)</div>
        <div className="flex gap-2 items-center">
          <div className="relative grow">
            <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search indicators…" className="w-full rounded border px-8 py-2 text-sm"
              style={{borderColor:"var(--gsc-light-gray)"}}/>
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400"/>
          </div>
          <select className="border rounded p-2 text-sm" value={form.indicator_id}
            onChange={e=>setForm({...form,indicator_id:e.target.value})} style={{borderColor:"var(--gsc-light-gray)"}}>
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

      <div className="flex justify-end">
        <button disabled={saving} onClick={save}
          className="bg-[var(--gsc-blue)] text-white px-4 py-2 rounded-xl">
          {saving?<><Loader2 className="h-4 w-4 animate-spin inline mr-2"/>Saving…</>:"Save & Continue"}
        </button>
      </div>
    </div>
  );
}

        {/* ADM0 */}
        {steps[step] === "ADM0" && (
          <Step title="ADM0 value" back={() => setStep((s) => s - 1)} next={next}>
            <input className="border p-2 rounded w-full" placeholder="Numeric value" value={adm0} onChange={(e) => setAdm0(e.target.value)} />
          </Step>
        )}

        {/* Upload & mapping */}
        {steps[step] === "Upload" && (
          <Step title="Upload file & map" back={() => setStep((s) => s - 1)} next={next}>
            <input type="file" accept=".csv" onChange={(e) => e.target.files && setFile(e.target.files[0])} />
            {file && (
              <button className="mt-2 border px-3 py-1 rounded" onClick={async () => setParsed(await parseFile(file))}>
                <Upload className="h-4 w-4 inline mr-1" />
                Parse file
              </button>
            )}
            {parsed.headers.length > 0 && (
              <>
                <div className="mt-3 text-sm text-gray-600">Select join column (admin code field in your file)</div>
                <select className="border p-2 rounded w-full" value={join} onChange={(e) => setJoin(e.target.value)}>
                  <option value="">(choose column)</option>
                  {parsed.headers.map((h) => (
                    <option key={h}>{h}</option>
                  ))}
                </select>

                {type === "gradient" && (
                  <>
                    <div className="mt-3 text-sm text-gray-600">Select value column</div>
                    <select className="border p-2 rounded w-full" value={valCol} onChange={(e) => setVal(e.target.value)}>
                      <option value="">(choose column)</option>
                      {parsed.headers.map((h) => (
                        <option key={h}>{h}</option>
                      ))}
                    </select>
                  </>
                )}

                {type === "categorical" && (
                  <div className="mt-3 border rounded p-2 grid gap-1" style={{ borderColor: "var(--gsc-light-gray)" }}>
                    <div className="text-sm text-gray-600">Select category columns</div>
                    {parsed.headers.map((h) => (
                      <label key={h} className="flex items-center gap-2">
                        <input type="checkbox" checked={cats.includes(h)} onChange={(e) => setCats((p) => (e.target.checked ? [...p, h] : p.filter((x) => x !== h)))} />
                        {h}
                      </label>
                    ))}
                  </div>
                )}
              </>
            )}
          </Step>
        )}

        {/* Scores for categorical */}
        {steps[step] === "Scores" && (
          <Step title="Category scores (optional)" back={() => setStep((s) => s - 1)} next={next}>
            {map.length === 0 ? (
              <div className="text-sm text-gray-600">No categories selected.</div>
            ) : (
              map.map((m, i) => (
                <div key={m.label} className="flex justify-between items-center gap-2 text-sm">
                  <span>{m.label}</span>
                  <input
                    className="border p-1 rounded w-24"
                    value={m.score ?? ""}
                    onChange={(e) => {
                      const v = e.target.value;
                      const score = v === "" ? null : Number(v);
                      setMap((prev) => prev.map((x, j) => (j === i ? { ...x, score } : x)));
                    }}
                  />
                </div>
              ))
            )}
          </Step>
        )}

        {/* Save */}
        {steps[step] === "Save" && (
          <div className="border p-4 rounded-xl space-y-2">
            <CheckCircle2 className="text-green-600 h-5 w-5 inline" /> Ready to save.
            <button onClick={next} disabled={loading} className="bg-black text-white px-4 py-2 rounded-xl">
              {loading ? "Saving…" : "Save"}
            </button>
          </div>
        )}
      </div>
    </SidebarLayout>
  );
}

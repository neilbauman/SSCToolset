"use client";
import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";

type Source = "core" | "gis" | "other" | "derived";
type Method = "ratio" | "multiply" | "sum" | "difference";
type DatasetOption = { id: string; title: string; source: Source; table: string; defaultCol?: string | null };
type Props = { open: boolean; onClose: () => void; countryIso: string; editDataset?: any | null };
const ACCENT = "#640811", LEVELS = ["ADM0", "ADM1", "ADM2", "ADM3", "ADM4"] as const;

export default function DerivedDatasetWizard({ open, onClose, countryIso, editDataset = null }: Props) {
  const [datasets, setDatasets] = useState<DatasetOption[]>([]);
  const [datasetA, setDatasetA] = useState<DatasetOption | null>(null);
  const [datasetB, setDatasetB] = useState<DatasetOption | null>(null);
  const [colA, setColA] = useState(""), [colB, setColB] = useState("");
  const [method, setMethod] = useState<Method>("ratio");
  const [useScalarB, setUseScalarB] = useState(false), [scalarB, setScalarB] = useState(1);
  const [isParametric, setIsParametric] = useState(true);
  const [targetLevel, setTargetLevel] = useState<(typeof LEVELS)[number]>("ADM3");
  const [decimals, setDecimals] = useState(2);
  const [title, setTitle] = useState(""), [desc, setDesc] = useState("");
  const [preview, setPreview] = useState<any[]>([]), [loadingPreview, setLoadingPreview] = useState(false);
  const [taxonomyMap, setTaxonomyMap] = useState<Record<string, string[]>>({});
  const [taxonomySel, setTaxonomySel] = useState<Record<string, Set<string>>>({});

  // ─── Load datasets (case-insensitive iso filter) ───
  useEffect(() => {
    if (!open) return;
    (async () => {
      const base: DatasetOption[] = [
        { id: "core-pop", title: "Population Data [core]", source: "core", table: "population_data", defaultCol: "population" },
        { id: "core-gis", title: "GIS Features [core]", source: "gis", table: "gis_features", defaultCol: "area_sqkm" }
      ];
      const { data: others } = await supabase.from("dataset_metadata").select("id,title,default_numeric_column,country_iso").ilike("country_iso", countryIso);
      others?.forEach(d => base.push({ id: d.id, title: d.title, source: "other", table: `dataset_${d.id}`, defaultCol: d.default_numeric_column || null }));
      const { data: derived } = await supabase.from("derived_dataset_metadata").select("id,title,country_iso").ilike("country_iso", countryIso);
      derived?.forEach(d => base.push({ id: d.id, title: `Derived: ${d.title}`, source: "derived", table: `derived_${d.id}`, defaultCol: "derived" }));
      setDatasets(base);
    })();
  }, [open, countryIso]);

  // ─── Load taxonomy ───
  useEffect(() => {
    if (!open) return;
    (async () => {
      const { data } = await supabase.from("taxonomy_terms").select("category,name").order("category");
      if (!data || !data.length) return;
      const grouped: Record<string, string[]> = {};
      data.forEach(({ category, name }) => { (grouped[category] = grouped[category] || []).push(name); });
      setTaxonomyMap(grouped);
    })();
  }, [open]);

  // ─── Hydrate edit ───
  useEffect(() => {
    if (!open) return;
    if (!editDataset) {
      setTitle(""); setDesc(""); setTargetLevel("ADM3"); setMethod("ratio");
      setUseScalarB(false); setScalarB(1); setColA(""); setColB(""); setDecimals(2);
      setDatasetA(null); setDatasetB(null); setPreview([]); setIsParametric(true); setTaxonomySel({});
      return;
    }
    setTitle(editDataset.title ?? ""); setDesc(editDataset.description ?? "");
    setTargetLevel(editDataset.target_level || editDataset.admin_level || "ADM3");
    setMethod(editDataset.method || "ratio"); setUseScalarB(!!editDataset.use_scalar_b);
    setScalarB(editDataset.scalar_b_val ?? 1); setColA(editDataset.col_a || ""); setColB(editDataset.col_b || "");
    if (datasets.length) {
      setDatasetA(datasets.find(d => d.table === editDataset.table_a) || null);
      setDatasetB(datasets.find(d => d.table === editDataset.table_b) || null);
    }
  }, [open, editDataset, datasets]);

  useEffect(() => { if (datasetA && !colA) setColA(datasetA.defaultCol || "value"); }, [datasetA]);
  useEffect(() => { if (datasetB && !colB) setColB(datasetB.defaultCol || "value"); }, [datasetB]);

  const methodSymbol = useMemo(() => ({ ratio: "÷", multiply: "×", sum: "+", difference: "−" }[method]), [method]);
  const formula = useMemo(() => `A.${colA || "?"} ${methodSymbol} ${useScalarB ? scalarB : `B.${colB || "?"}`}`, [colA, colB, methodSymbol, useScalarB, scalarB]);
  const fmt = (v: number | null) => v == null || isNaN(v as any) ? "" : Number(v).toLocaleString(undefined, { maximumFractionDigits: decimals });

  // ─── Preview ───
  async function previewJoin() {
    if (!datasetA || (!datasetB && !useScalarB)) return alert("Select Dataset A and (Dataset B or scalar).");
    if (!colA || (!useScalarB && !colB)) return alert("Enter column names.");
    setLoadingPreview(true); setPreview([]);
    const params = {
      p_table_a: datasetA.table, p_table_b: useScalarB ? null : datasetB?.table ?? null,
      p_col_a: colA, p_col_b: useScalarB ? null : colB || null, p_country_iso: countryIso,
      p_method: method, p_target_level: targetLevel, p_use_scalar_b: useScalarB,
      p_scalar_b_val: useScalarB ? scalarB : null, p_limit: 250, p_normalize_percent: false
    };
    const { data, error } = await supabase.rpc("simulate_join_preview_autoaggregate", params);
    setLoadingPreview(false);
    if (error) return alert("Preview failed: " + error.message);
    setPreview(data || []);
  }

  // ─── Save ───
  async function saveDerived() {
    if (!datasetA || (!datasetB && !useScalarB)) return alert("Select Dataset A and (Dataset B or scalar).");
    if (!colA || (!useScalarB && !colB)) return alert("Enter column names.");

    const payload = {
      p_title: title || `Derived (${targetLevel})`,
      p_table_a: datasetA.table, p_table_b: useScalarB ? null : datasetB?.table ?? null,
      p_col_a: colA, p_col_b: useScalarB ? null : colB, p_admin_level: targetLevel,
      p_method: method, p_is_parametric: isParametric, p_scalar_b_val: useScalarB ? scalarB : null,
      p_normalize_percent: false, p_debug: false
    };

    let { error } = await supabase.rpc("create_derived_dataset_v2", payload);
    if (error) {
      // fallback direct insert
      const insert = await supabase.from("derived_dataset_metadata").insert({
        title, description: desc, admin_level: targetLevel, method,
        is_parametric: isParametric, table_a: datasetA.table,
        table_b: useScalarB ? null : datasetB?.table ?? null,
        col_a: colA, col_b: useScalarB ? null : colB, scalar_b_val: useScalarB ? scalarB : null,
        country_iso: countryIso
      });
      if (insert.error) return alert("Save failed: " + insert.error.message);
      alert("✅ Derived dataset registered (direct insert)."); onClose(); return;
    }
    alert("✅ Derived dataset created."); onClose();
  }

  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-5 w-[96%] max-w-6xl max-h-[92vh] overflow-y-auto text-sm">
        <h2 className="text-lg font-semibold mb-3">{editDataset ? "Edit Derived Dataset" : "Create Derived Dataset"}</h2>

        <div className="flex flex-wrap gap-2 mb-3">
          <input className="border p-2 rounded flex-1" placeholder="Title" value={title} onChange={e => setTitle(e.target.value)} />
          <input className="border p-2 rounded flex-1" placeholder="Description" value={desc} onChange={e => setDesc(e.target.value)} />
          <select className="border p-2 rounded w-32" value={targetLevel} onChange={e => setTargetLevel(e.target.value as any)}>{LEVELS.map(l => <option key={l}>{l}</option>)}</select>
          <select className="border p-2 rounded w-40" value={isParametric ? "parametric" : "fixed"} onChange={e => setIsParametric(e.target.value === "parametric")}><option value="parametric">Parametric</option><option value="fixed">Fixed</option></select>
        </div>

        {/* Dataset selectors */}
        <div className="flex gap-2 mb-3">
          {(["A","B"] as const).map(l => !useScalarB || l==="A" ? (
            <select key={l} className="border p-2 rounded flex-1" value={(l==="A"?datasetA:datasetB)?.id||""}
              onChange={e=>{const sel=datasets.find(d=>d.id===e.target.value)||null;if(l==="A")setDatasetA(sel);else setDatasetB(sel);}}>
              <option value="">Select Dataset {l}</option>
              {(["core","gis","other","derived"] as Source[]).map(g=>{
                const items=datasets.filter(d=>d.source===g);
                return(<optgroup key={g} label={g.toUpperCase()}>{items.map(d=><option key={d.id} value={d.id}>{d.title}</option>)}</optgroup>);
              })}
            </select>
          ):null)}
        </div>

        <div className="flex flex-wrap items-center gap-2 mb-3">
          <input className="border p-2 rounded w-48" value={colA} onChange={e=>setColA(e.target.value)} placeholder="Column A"/>
          {!useScalarB && <input className="border p-2 rounded w-48" value={colB} onChange={e=>setColB(e.target.value)} placeholder="Column B"/>}
          <label className="text-xs flex items-center gap-2 ml-auto"><input type="checkbox" checked={useScalarB} onChange={e=>setUseScalarB(e.target.checked)}/>Use Scalar B</label>
          {useScalarB && <input type="number" className="border p-2 rounded w-24 text-right" value={scalarB} onChange={e=>setScalarB(parseFloat(e.target.value||"0"))}/>}
        </div>

        <div className="flex items-center gap-2 mb-2">
          {(["ratio","multiply","sum","difference"] as const).map(m=><button key={m} onClick={()=>setMethod(m)} className={`px-2 py-1 border rounded ${method===m?"text-white":""}`} style={{background:method===m?ACCENT:"transparent"}}>{m}</button>)}
          <button onClick={previewJoin} className="ml-auto px-3 py-1 text-white rounded" style={{background:ACCENT}}>{loadingPreview?"Loading...":"Preview"}</button>
        </div>

        <p className="text-xs italic mb-2">Derived = {formula}</p>
        <div className="max-h-64 overflow-y-auto border rounded text-xs mb-4">
          <table className="w-full"><thead className="bg-gray-100"><tr><th className="p-1 text-left">Pcode</th><th className="p-1 text-left">Name</th><th className="p-1 text-right">A</th>{!useScalarB&&<th className="p-1 text-right">B</th>}<th className="p-1 text-right">Derived</th></tr></thead>
            <tbody>{preview.length?preview.map((r:any,i:number)=><tr key={i} className="border-t"><td className="p-1">{r.pcode||r.join_key||"—"}</td><td className="p-1">{r.name||r.place_name||"—"}</td><td className="p-1 text-right">{fmt(r.a)}</td>{!useScalarB&&<td className="p-1 text-right">{fmt(r.b)}</td>}<td className="p-1 text-right font-medium">{fmt(r.derived)}</td></tr>):<tr><td className="p-2 italic text-gray-500" colSpan={useScalarB?4:5}>No preview data</td></tr>}</tbody></table>
        </div>

        {/* Taxonomy */}
        <h3 className="text-sm font-semibold mb-2">Assign Taxonomy</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
          {Object.keys(taxonomyMap).map(cat=>{
            const enabled=!!taxonomySel[cat];
            return(<div key={cat} className="border rounded p-2">
              <label className="flex items-center gap-1 text-xs font-medium"><input type="checkbox" checked={enabled} onChange={e=>setTaxonomySel(p=>{const n={...p};if(e.target.checked)n[cat]=new Set<string>();else delete n[cat];return n;})}/>{cat}</label>
              {enabled&&<div className="ml-3 mt-1 grid grid-cols-1">{taxonomyMap[cat].map(term=><label key={term} className="flex items-center gap-1 text-xs"><input type="checkbox" checked={!!taxonomySel[cat]?.has(term)} onChange={e=>setTaxonomySel(p=>{const n={...p};if(!n[cat])n[cat]=new Set<string>();if(e.target.checked)n[cat]!.add(term);else n[cat]!.delete(term);return n;})}/>{term}</label>)}</div>}
            </div>);
          })}
        </div>

        <div className="flex justify-end gap-2"><button onClick={onClose} className="px-3 py-1 border rounded">Cancel</button>
          <button onClick={saveDerived} className="px-3 py-1 text-white rounded" style={{background:ACCENT}}>{editDataset?"Save Changes":"Save Derived"}</button></div>
      </div>
    </div>
  );
}

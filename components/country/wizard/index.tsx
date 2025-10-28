"use client";
import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";

type Source = "core" | "other" | "derived" | "gis";
type Method = "ratio" | "multiply" | "sum" | "difference";
type DatasetOption = { id: string; title: string; source: Source; table: string; defaultCol?: string | null };
type TaxonomyMap = Record<string, string[]>;
type EditPayload = { id: string; title: string; description?: string | null; admin_level?: string; method?: Method; use_scalar_b?: boolean | null; scalar_b_val?: number | null; table_a?: string | null; table_b?: string | null; col_a?: string | null; col_b?: string | null; decimals?: number | null; formula?: string | null; target_level?: string | null };
type Props = { countryIso: string; onClose: () => void; editDataset?: EditPayload | null };
const ACCENT = "#640811";

export default function DerivedDatasetWizard({ countryIso, onClose, editDataset = null }: Props) {
  const [datasets, setDatasets] = useState<DatasetOption[]>([]);
  const [datasetA, setDatasetA] = useState<DatasetOption | null>(null);
  const [datasetB, setDatasetB] = useState<DatasetOption | null>(null);
  const [colA, setColA] = useState(""), [colB, setColB] = useState(""), [method, setMethod] = useState<Method>("ratio");
  const [useScalarB, setUseScalarB] = useState(false), [scalarB, setScalarB] = useState(1);
  const [title, setTitle] = useState(""), [desc, setDesc] = useState(""), [targetLevel, setTargetLevel] = useState("ADM3"), [decimals, setDecimals] = useState(2);
  const [preview, setPreview] = useState<any[]>([]), [loadingPreview, setLoadingPreview] = useState(false);
  const [taxonomyMap, setTaxonomyMap] = useState<TaxonomyMap>({}), [taxonomy, setTaxonomy] = useState<Record<string, Set<string>>>({});

  useEffect(() => { (async () => {
    const base: DatasetOption[] = [
      { id: "core-pop", title: "Population Data [core]", source: "core", table: "population_data", defaultCol: "population" },
      { id: "core-gis", title: "GIS Features [core]", source: "gis", table: "gis_features", defaultCol: "area_sqkm" },
    ];
    const { data: others } = await supabase.from("dataset_metadata").select("id,title,default_numeric_column").eq("country_iso", countryIso);
    others?.forEach(d => base.push({ id: d.id, title: d.title, source: "other", table: `dataset_${d.id}`, defaultCol: d.default_numeric_column || null }));
    const { data: derived } = await supabase.from("derived_dataset_metadata").select("id,title,method,admin_level").eq("country_iso", countryIso);
    derived?.forEach(d => base.push({ id: d.id, title: `${d.title} [derived]`, source: "derived", table: `derived_${d.id}` }));
    setDatasets(base);
  })(); }, [countryIso]);

  useEffect(() => { (async () => {
    const { data } = await supabase.from("taxonomy_terms").select("category,name");
    const map: TaxonomyMap = {}; data?.forEach(({ category, name }) => { if (!map[category]) map[category] = []; map[category].push(name); });
    setTaxonomyMap(map);
  })(); }, []);

  useEffect(() => {
    if (!editDataset) { setTitle(""); setDesc(""); setTargetLevel("ADM3"); setMethod("ratio"); setUseScalarB(false); setScalarB(1); setColA(""); setColB(""); setDecimals(2); setDatasetA(null); setDatasetB(null); setPreview([]); setTaxonomy({}); return; }
    setTitle(editDataset.title || ""); setDesc(editDataset.description || ""); setTargetLevel(editDataset.target_level || editDataset.admin_level || "ADM3");
    setMethod((editDataset.method as Method) || "ratio"); setUseScalarB(!!editDataset.use_scalar_b); setScalarB(editDataset.scalar_b_val ?? 1);
    setColA(editDataset.col_a || ""); setColB(editDataset.col_b || ""); setDecimals(editDataset.decimals ?? 2);
    const a = datasets.find(d => d.table === editDataset.table_a); const b = datasets.find(d => d.table === editDataset.table_b);
    setDatasetA(a || null); setDatasetB(b || null);
  }, [editDataset, datasets]);

  useEffect(() => { if (datasetA && !colA) setColA(datasetA.defaultCol || "value"); if (datasetB && !colB) setColB(datasetB.defaultCol || "value"); }, [datasetA, datasetB]);

  const methodSymbol = useMemo(() => method === "ratio" ? "÷" : method === "multiply" ? "×" : method === "sum" ? "+" : "−", [method]);
  const computedFormula = useMemo(() => `A.${colA} ${methodSymbol} ${useScalarB ? scalarB : `B.${colB}`}`, [colA, colB, methodSymbol, scalarB, useScalarB]);
  const fmt = (v: number | null) => v == null || isNaN(v) ? "" : v.toLocaleString(undefined, { maximumFractionDigits: decimals });

 async function previewJoin() {
  if (!datasetA || (!datasetB && !useScalarB)) {
    alert("Select Dataset A and (Dataset B or a scalar).");
    return;
  }

  setLoadingPreview(true);
  const { data, error } = await supabase.rpc("resolve_parametric_dataset_v3", {
    p_country_iso: countryIso,
    p_table_a: datasetA.id,   // must be UUIDs of dataset_metadata entries
    p_table_b: datasetB?.id || null,
    p_method: method,
    p_normalize_percent: false,
    p_target_admin_level: targetLevel
  });

  setLoadingPreview(false);
  if (error) {
    console.error(error);
    alert("Preview failed: " + error.message);
    return;
  }
  setPreview(data || []);
}

  async function saveDerived() {
    if (!datasetA || (!datasetB && !useScalarB)) return alert("Select Dataset A and (Dataset B or a scalar).");
    const cats = Object.keys(taxonomy), terms = cats.flatMap(c => Array.from(taxonomy[c] || []));
    const payload = { p_country: countryIso, p_title: title || `Derived (${targetLevel})`, p_description: desc || null, p_admin_level: targetLevel, p_method: method, p_use_scalar_b: useScalarB, p_scalar_b_val: useScalarB ? scalarB : null, p_table_a: datasetA.table, p_table_b: useScalarB ? null : datasetB?.table ?? null, p_col_a: colA, p_col_b: useScalarB ? null : colB, p_formula: computedFormula, p_target_level: targetLevel, p_taxonomy_categories: cats, p_taxonomy_terms: terms, p_decimals: decimals };
    const { error } = await supabase.rpc("create_derived_dataset_v2", payload);
    if (error) return alert("Save failed: " + error.message);
    alert(editDataset ? "✅ Changes saved." : "✅ Derived dataset created."); onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-5 w-[95%] max-w-5xl max-h-[90vh] overflow-y-auto text-sm">
        <h2 className="text-lg font-semibold mb-3">{editDataset ? "Edit Derived Dataset" : "Create Derived Dataset"}</h2>
        <div className="flex gap-2 mb-3">
          <input className="border p-1 flex-1 rounded" placeholder="Title" value={title} onChange={e=>setTitle(e.target.value)} />
          <input className="border p-1 flex-1 rounded" placeholder="Description" value={desc} onChange={e=>setDesc(e.target.value)} />
          <select className="border p-1 rounded" value={targetLevel} onChange={e=>setTargetLevel(e.target.value)}>{["ADM0","ADM1","ADM2","ADM3","ADM4"].map(l=><option key={l}>{l}</option>)}</select>
        </div>
        <div className="flex gap-2 mb-3">
          <select className="border p-1 rounded flex-1" value={datasetA?.id||""} onChange={e=>setDatasetA(datasets.find(d=>d.id===e.target.value)||null)} disabled={!!editDataset}>
            <option value="">Select Dataset A</option>{datasets.map(d=><option key={d.id} value={d.id}>{d.title}</option>)}
          </select>
          {!useScalarB && <select className="border p-1 rounded flex-1" value={datasetB?.id||""} onChange={e=>setDatasetB(datasets.find(d=>d.id===e.target.value)||null)} disabled={!!editDataset}>
            <option value="">Select Dataset B</option>{datasets.map(d=><option key={d.id} value={d.id}>{d.title}</option>)}
          </select>}
        </div>
        <div className="flex gap-2 mb-3">
          <input className="border p-1 rounded w-40" value={colA} onChange={e=>setColA(e.target.value)} placeholder="Column A" />
          {!useScalarB && <input className="border p-1 rounded w-40" value={colB} onChange={e=>setColB(e.target.value)} placeholder="Column B" />}
          <label className="text-xs flex items-center gap-1 ml-auto"><input type="checkbox" checked={useScalarB} onChange={e=>setUseScalarB(e.target.checked)} /> Use Scalar B</label>
          {useScalarB && <input type="number" className="border p-1 rounded w-24 text-right" value={scalarB} onChange={e=>setScalarB(parseFloat(e.target.value||"0"))} />}
          <select className="border rounded text-xs p-1" value={decimals} onChange={e=>setDecimals(parseInt(e.target.value))} title="Decimals">{[0,1,2,3].map(d=><option key={d} value={d}>{d} dec</option>)}</select>
        </div>
        <div className="flex items-center gap-2 mb-2">{(["ratio","multiply","sum","difference"] as const).map(m=><button key={m} onClick={()=>setMethod(m)} className={`px-2 py-1 border rounded ${method===m?"text-white":""}`} style={{background:method===m?ACCENT:"transparent",borderColor:"#e5e7eb"}}>{m}</button>)}<button onClick={previewJoin} className="ml-auto px-3 py-1 text-white rounded" style={{background:ACCENT}}>{loadingPreview?"Loading...":"Preview"}</button></div>
        <p className="text-xs italic mb-2">Derived = {computedFormula}</p>
        <div className="max-h-64 overflow-y-auto border rounded text-xs mb-4"><table className="w-full"><thead className="bg-gray-100"><tr><th className="p-1 text-left">Pcode</th><th className="p-1 text-left">Name</th><th className="p-1 text-right">A</th><th className="p-1 text-right">B</th><th className="p-1 text-right">Derived</th></tr></thead><tbody>{preview.length===0?<tr><td colSpan={5} className="text-center italic text-gray-500 py-2">No preview data</td></tr>:preview.map((r,i)=><tr key={i} className="border-t"><td className="p-1">{r.pcode}</td><td className="p-1">{r.name??"—"}</td><td className="p-1 text-right">{fmt(r.a)}</td><td className="p-1 text-right">{fmt(r.b)}</td><td className="p-1 text-right font-medium">{fmt(r.derived)}</td></tr>)}</tbody></table></div>
        <h3 className="text-sm font-semibold mb-2">Assign Taxonomy</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">{Object.keys(taxonomyMap).map(cat=>{const chk=!!taxonomy[cat];return(<div key={cat} className="border rounded p-2"><label className="flex items-center gap-1 text-xs font-medium"><input type="checkbox" checked={chk} onChange={e=>setTaxonomy(p=>{const n={...p};if(e.target.checked){if(!n[cat])n[cat]=new Set<string>();}else delete n[cat];return n;})}/> {cat}</label>{chk&&<div className="ml-3 mt-1 grid grid-cols-1">{taxonomyMap[cat].map(term=><label key={term} className="flex items-center gap-1 text-xs"><input type="checkbox" checked={!!taxonomy[cat]?.has(term)} onChange={e=>setTaxonomy(p=>{const n={...p};if(!n[cat])n[cat]=new Set<string>();if(e.target.checked)n[cat]!.add(term);else n[cat]!.delete(term);return n;})}/> {term}</label>)}</div>}</div>);})}</div>
        <div className="flex justify-end gap-2"><button onClick={onClose} className="px-3 py-1 border rounded hover:bg-gray-100">Cancel</button><button onClick={saveDerived} className="px-3 py-1 text-white rounded" style={{background:ACCENT}}>{editDataset?"Save Changes":"Save Derived"}</button></div>
      </div>
    </div>
  );
}

"use client";
import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";

type Method = "ratio" | "multiply" | "sum" | "difference";
type Source = "core" | "base" | "derived";
type DatasetOption = { id: string; title: string; source: Source; defaultCol: string };
type TaxonomyMap = Record<string, string[]>;

type EditPayload = {
  id: string; title: string; description?: string | null; admin_level?: string | null;
  method?: Method | null; use_scalar_b?: boolean | null; scalar_b_val?: number | null;
  table_a?: string | null; table_b?: string | null; col_a?: string | null; col_b?: string | null;
  decimals?: number | null; target_level?: string | null; formula?: string | null;
  taxonomy_categories?: string[] | null; taxonomy_terms?: string[] | null;
  normalize_percent?: boolean | null;
};

export default function DerivedDatasetWizard({ open, onClose, countryIso, editDataset }: {
  open: boolean; onClose: () => void; countryIso: string; editDataset?: EditPayload | null;
}) {
  const ACCENT = "#640811";
  const [datasets, setDatasets] = useState<DatasetOption[]>([]);
  const [datasetA, setDatasetA] = useState<DatasetOption | null>(null);
  const [datasetB, setDatasetB] = useState<DatasetOption | null>(null);
  const [colA, setColA] = useState(""), [colB, setColB] = useState("");
  const [method, setMethod] = useState<Method>("ratio");
  const [useScalarB, setUseScalarB] = useState(false);
  const [scalarB, setScalarB] = useState(1);
  const [title, setTitle] = useState(""), [desc, setDesc] = useState("");
  const [targetLevel, setTargetLevel] = useState("ADM3");
  const [decimals, setDecimals] = useState(2);
  const [normalizePercent, setNormalizePercent] = useState(false);
  const [preview, setPreview] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [taxonomyMap, setTaxonomyMap] = useState<TaxonomyMap>({});
  const [taxonomy, setTaxonomy] = useState<Record<string, Set<string>>>({});

  // -------------------- Load datasets --------------------
  useEffect(() => {
    if (!open) return;
    (async () => {
      const base: DatasetOption[] = [
        { id: "population_data", title: "Population [core]", source: "core", defaultCol: "population" },
        { id: "gis_features", title: "GIS Features [core]", source: "core", defaultCol: "area_sqkm" },
      ];
      const { data: meta } = await supabase.from("dataset_metadata").select("id,title");
      meta?.forEach((d: any) => base.push({ id: d.id, title: d.title, source: "base", defaultCol: "value" }));
      const { data: derived } = await supabase.from("derived_dataset_metadata").select("id,title");
      derived?.forEach((d: any) => base.push({ id: d.id, title: d.title, source: "derived", defaultCol: "derived" }));
      setDatasets(base);
    })();
  }, [open]);

  // -------------------- Load taxonomy --------------------
  useEffect(() => {
    if (!open) return;
    (async () => {
      const { data } = await supabase.from("taxonomy_terms").select("category,name");
      const map: TaxonomyMap = {};
      data?.forEach((t: any) => {
        if (!map[t.category]) map[t.category] = [];
        map[t.category].push(t.name);
      });
      setTaxonomyMap(map);
    })();
  }, [open]);

  // -------------------- Hydration on edit --------------------
  useEffect(() => {
    if (!editDataset || !datasets.length) return;
    setTitle(editDataset.title || ""); setDesc(editDataset.description || "");
    setTargetLevel(editDataset.target_level || editDataset.admin_level || "ADM3");
    setMethod((editDataset.method as Method) || "ratio");
    setUseScalarB(!!editDataset.use_scalar_b);
    setScalarB(editDataset.scalar_b_val ?? 1);
    setColA(editDataset.col_a || ""); setColB(editDataset.col_b || "");
    setDecimals(editDataset.decimals ?? 2); setNormalizePercent(!!editDataset.normalize_percent);
    setDatasetA(datasets.find(d => d.id === editDataset.table_a) || null);
    setDatasetB(datasets.find(d => d.id === editDataset.table_b) || null);
    const cats = editDataset.taxonomy_categories || []; const terms = editDataset.taxonomy_terms || [];
    const next: Record<string, Set<string>> = {}; cats.forEach(c => next[c] = new Set());
    terms.forEach(t => { const c = Object.keys(taxonomyMap).find(x => taxonomyMap[x]?.includes(t)); if (c) next[c].add(t); });
    setTaxonomy(next);
  }, [editDataset, datasets, taxonomyMap]);

  const methodSymbol = useMemo(() => ({ ratio: "÷", multiply: "×", sum: "+", difference: "−" }[method]), [method]);
  const formula = useMemo(() => `A.${colA || datasetA?.defaultCol || "?"} ${methodSymbol} ${useScalarB ? scalarB : `B.${colB || datasetB?.defaultCol || "?"}`}`, [colA, colB, methodSymbol, useScalarB, scalarB, datasetA, datasetB]);

  // -------------------- Preview --------------------
  async function previewJoin() {
    if (!datasetA || (!datasetB && !useScalarB)) return alert("Select Dataset A and (Dataset B or scalar)");
    setLoading(true);
    const { data, error } = await supabase.rpc("simulate_join_preview_autoaggregate", {
      p_table_a: datasetA.id, p_table_b: useScalarB ? null : datasetB?.id ?? null,
      p_col_a: colA || datasetA.defaultCol, p_col_b: useScalarB ? null : colB || datasetB?.defaultCol,
      p_country_iso: countryIso, p_method: method, p_target_level: targetLevel,
      p_use_scalar_b: useScalarB, p_scalar_b_val: useScalarB ? scalarB : null, p_normalize_percent: normalizePercent,
    });
    setLoading(false);
    if (error) alert("Preview error: " + error.message);
    else setPreview(data || []);
  }

  // -------------------- Save --------------------
  async function saveDerived() {
    if (!datasetA || (!datasetB && !useScalarB)) return alert("Select Dataset A and (Dataset B or scalar)");
    const cats = Object.keys(taxonomy), terms = cats.flatMap(c => [...taxonomy[c]]);
    const { error } = await supabase.rpc("create_derived_dataset_v2", {
      p_country: countryIso, p_title: title || `Derived (${targetLevel})`, p_description: desc,
      p_admin_level: targetLevel, p_method: method, p_use_scalar_b: useScalarB, p_scalar_b_val: useScalarB ? scalarB : null,
      p_table_a: datasetA.id, p_table_b: useScalarB ? null : datasetB?.id ?? null,
      p_col_a: colA || datasetA.defaultCol, p_col_b: useScalarB ? null : colB || datasetB?.defaultCol,
      p_formula: formula, p_target_level: targetLevel, p_taxonomy_categories: cats, p_taxonomy_terms: terms, p_decimals: decimals,
    });
    if (error) alert("Save failed: " + error.message); else { alert("✅ Saved."); onClose(); }
  }

  if (!open) return null;
  const renderSelect = (label: "A" | "B") => {
    if (useScalarB && label === "B") return null;
    const ds = label === "A" ? datasetA : datasetB, setDs = label === "A" ? setDatasetA : setDatasetB;
    return (
      <select className="border p-1 rounded flex-1" value={ds?.id || ""}
        onChange={e => setDs(datasets.find(d => d.id === e.target.value) || null)}>
        <option value="">Select Dataset {label}</option>
        {["core", "base", "derived"].map(g => (
          <optgroup key={g} label={g.toUpperCase()}>
            {datasets.filter(d => d.source === g).map(d => <option key={d.id} value={d.id}>{d.title}</option>)}
          </optgroup>
        ))}
      </select>
    );
  };

  const safe = (v: any) => v ?? "–";

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-5 w-[95%] max-w-6xl max-h-[90vh] overflow-y-auto text-sm">
        <h2 className="text-lg font-semibold mb-3">{editDataset ? "Edit Derived Dataset" : "Create Derived Dataset"}</h2>

        <div className="flex gap-2 mb-3">
          <input className="border p-1 flex-1 rounded" placeholder="Title" value={title} onChange={e => setTitle(e.target.value)} />
          <input className="border p-1 flex-1 rounded" placeholder="Description" value={desc} onChange={e => setDesc(e.target.value)} />
          <select className="border p-1 rounded" value={targetLevel} onChange={e => setTargetLevel(e.target.value)}>
            {["ADM0","ADM1","ADM2","ADM3","ADM4"].map(l => <option key={l}>{l}</option>)}
          </select>
        </div>

        <div className="flex gap-2 mb-3">{renderSelect("A")}{renderSelect("B")}</div>

        <div className="flex gap-2 mb-3">
          <input className="border p-1 rounded w-40" value={colA} onChange={e => setColA(e.target.value)} placeholder="Column A" />
          {!useScalarB && <input className="border p-1 rounded w-40" value={colB} onChange={e => setColB(e.target.value)} placeholder="Column B" />}
          <label className="text-xs flex items-center gap-1 ml-auto"><input type="checkbox" checked={useScalarB} onChange={e => setUseScalarB(e.target.checked)} />Scalar B</label>
          {useScalarB && <input type="number" className="border p-1 rounded w-20 text-right" value={scalarB} onChange={e => setScalarB(parseFloat(e.target.value || "0"))} />}
          <select className="border rounded text-xs p-1" value={decimals} onChange={e => setDecimals(+e.target.value)}>{[0,1,2,3].map(d => <option key={d}>{d} dec</option>)}</select>
        </div>

        <div className="flex gap-2 mb-2">
          {(["ratio","multiply","sum","difference"] as const).map(m => (
            <button key={m} onClick={() => setMethod(m)} className={`px-2 py-1 border rounded ${method===m?"text-white":""}`} style={{background:method===m?ACCENT:"transparent"}}>{m}</button>
          ))}
          <label className="text-xs flex items-center gap-1 ml-3"><input type="checkbox" checked={normalizePercent} onChange={e=>setNormalizePercent(e.target.checked)} />Normalize %</label>
          <button onClick={previewJoin} className="ml-auto px-3 py-1 text-white rounded" style={{background:ACCENT}}>{loading?"Loading...":"Preview"}</button>
        </div>

        <p className="text-xs italic mb-2">Derived = {formula}</p>

        <div className="max-h-56 overflow-y-auto border rounded text-xs mb-4">
          <table className="w-full">
            <thead className="bg-gray-100 sticky top-0"><tr>{(preview[0]?Object.keys(preview[0]):["join_key","place_name","a","b","derived"]).map(k=><th key={k} className="p-1 text-left">{k}</th>)}</tr></thead>
            <tbody>{preview.length===0?<tr><td colSpan={6} className="text-center italic text-gray-500 py-2">No preview data</td></tr>:preview.map((r,i)=><tr key={i} className="border-t">{Object.entries(r).map(([k,v],j)=><td key={j} className="p-1">{safe(v)}</td>)}</tr>)}</tbody>
          </table>
        </div>

        <h3 className="text-sm font-semibold mb-2">Assign Taxonomy</h3>
        <div className="flex flex-wrap gap-2 mb-4">{Object.keys(taxonomyMap).map(cat=>{
          const checked=!!taxonomy[cat];
          return(<div key={cat} className="border rounded p-2 flex-1 min-w-[160px] max-w-[220px] max-h-32 overflow-y-auto">
            <label className="flex items-center gap-1 text-xs font-medium mb-1">
              <input type="checkbox" checked={checked} onChange={e=>{
                setTaxonomy(prev=>{const next={...prev};if(e.target.checked)next[cat]=new Set();else delete next[cat];return next;});
              }}/>{cat}</label>
            {checked&&<div className="ml-2 space-y-1">{taxonomyMap[cat].map(term=>
              <label key={term} className="flex items-center gap-1 text-xs"><input type="checkbox" checked={!!taxonomy[cat]?.has(term)} onChange={e=>{
                setTaxonomy(prev=>{const next={...prev};if(!next[cat])next[cat]=new Set();if(e.target.checked)next[cat].add(term);else next[cat].delete(term);return next;});}}/>{term}</label>)}</div>}
          </div>);})}</div>

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-1 border rounded">Cancel</button>
          <button onClick={saveDerived} className="px-3 py-1 text-white rounded" style={{background:ACCENT}}>Save</button>
        </div>
      </div>
    </div>
  );
}

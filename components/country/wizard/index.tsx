"use client";
import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";

type Source = "core" | "other" | "derived" | "gis";
type Method = "ratio" | "multiply" | "sum" | "difference";
type DatasetOption = { id: string; title: string; source: Source; table: string; defaultCol?: string | null };
type TaxonomyMap = Record<string, string[]>;
type EditPayload = { id: string; title: string; description: string | null; admin_level: string; method: Method; table_a?: string; table_b?: string; col_a?: string; col_b?: string; scalar_b_val?: number; use_scalar_b?: boolean; decimals?: number; is_parametric?: boolean };
type Props = { open: boolean; onClose: () => void; countryIso: string; editDataset?: EditPayload | null };
const ACCENT = "#640811";

export default function DerivedDatasetWizard({ open, onClose, countryIso, editDataset }: Props) {
  const [datasets, setDatasets] = useState<DatasetOption[]>([]);
  const [datasetA, setDatasetA] = useState<DatasetOption | null>(null);
  const [datasetB, setDatasetB] = useState<DatasetOption | null>(null);
  const [colA, setColA] = useState(""), [colB, setColB] = useState("");
  const [method, setMethod] = useState<Method>("multiply");
  const [useScalarB, setUseScalarB] = useState(false);
  const [scalarB, setScalarB] = useState<number>(1);
  const [title, setTitle] = useState(""), [desc, setDesc] = useState("");
  const [targetLevel, setTargetLevel] = useState("ADM3");
  const [isParametric, setIsParametric] = useState(false);
  const [decimals, setDecimals] = useState(2);
  const [preview, setPreview] = useState<any[]>([]);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [taxonomyMap, setTaxonomyMap] = useState<TaxonomyMap>({});
  const [taxonomy, setTaxonomy] = useState<Record<string, Set<string>>>({});

  useEffect(() => {
    if (!open) return;
    (async () => {
      const base: DatasetOption[] = [
        { id: "core-pop", title: "Population Data [core]", source: "core", table: "population_data", defaultCol: "population" },
        { id: "core-gis", title: "GIS Features [core]", source: "gis", table: "gis_features", defaultCol: "area_sqkm" },
      ];
      const { data: others } = await supabase.from("dataset_metadata").select("id,title,default_numeric_column").eq("country_iso", countryIso);
      if (others) others.forEach(d => base.push({ id: d.id, title: d.title, source: "other", table: `dataset_${d.id}`, defaultCol: d.default_numeric_column || null }));
      setDatasets(base);
      const { data: tax } = await supabase.from("taxonomy_terms").select("category,name");
      if (tax) {
        const grouped: TaxonomyMap = {};
        tax.forEach(({ category, name }) => { if (!grouped[category]) grouped[category] = []; grouped[category].push(name); });
        setTaxonomyMap(grouped);
      }
    })();
  }, [open]);

  useEffect(() => {
    if (!editDataset || !open) return;
    setTitle(editDataset.title || ""); setDesc(editDataset.description || ""); setTargetLevel(editDataset.admin_level || "ADM3");
    setMethod(editDataset.method || "multiply"); setUseScalarB(!!editDataset.use_scalar_b);
    setScalarB(editDataset.scalar_b_val ?? 1); setColA(editDataset.col_a || ""); setColB(editDataset.col_b || "");
    setDecimals(editDataset.decimals ?? 2); setIsParametric(!!editDataset.is_parametric);
    const A = datasets.find(d => d.table === editDataset.table_a); const B = datasets.find(d => d.table === editDataset.table_b);
    if (A) setDatasetA(A); if (B) setDatasetB(B);
  }, [editDataset, datasets, open]);

  const symbol = useMemo(() => ({ ratio: "÷", multiply: "×", sum: "+", difference: "−" }[method]), [method]);
  const formula = useMemo(() => `A.${colA} ${symbol} ${useScalarB ? scalarB : `B.${colB}`}`, [colA, colB, scalarB, symbol, useScalarB]);
  const fmt = (v: number | null) => (v == null ? "" : v.toLocaleString(undefined, { maximumFractionDigits: decimals }));

  async function previewJoin() {
    if (!datasetA || (!datasetB && !useScalarB)) return alert("Select Dataset A and (Dataset B or scalar).");
    setLoadingPreview(true);
    const { data, error } = await supabase.rpc("simulate_join_preview_autoaggregate", {
      p_table_a: datasetA.table, p_table_b: useScalarB ? null : datasetB?.table, p_col_a: colA, p_col_b: useScalarB ? null : colB,
      p_country_iso: countryIso, p_method: method, p_target_level: targetLevel, p_use_scalar_b: useScalarB,
      p_scalar_b_val: useScalarB ? scalarB : null, p_limit: 100, p_normalize_percent: false
    });
    setLoadingPreview(false);
    if (error) return alert("Preview failed: " + error.message);
    setPreview(data || []);
  }

  async function saveDerived() {
    if (!datasetA || (!datasetB && !useScalarB)) return alert("Select Dataset A and (Dataset B or scalar).");
    const payload = {
      p_title: title || `Derived (${targetLevel})`, p_table_a: datasetA.table, p_table_b: useScalarB ? null : datasetB?.table ?? null,
      p_col_a: colA, p_col_b: useScalarB ? null : colB, p_admin_level: targetLevel, p_method: method,
      p_is_parametric: isParametric, p_scalar_b_val: useScalarB ? scalarB : null, p_normalize_percent: false, p_debug: false
    };
    const { error } = await supabase.rpc("create_derived_dataset_v2", payload);
    if (error) return alert("Save failed: " + error.message);
    alert(editDataset ? "✅ Changes saved." : "✅ Derived dataset created."); onClose();
  }

  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-5 w-[95%] max-w-5xl max-h-[90vh] overflow-y-auto text-sm">
        <h2 className="text-lg font-semibold mb-3">{editDataset ? "Edit Derived Dataset" : "Create Derived Dataset"}</h2>

        {/* Header */}
        <div className="flex gap-2 mb-3 items-center">
          <input className="border p-1 flex-1 rounded" placeholder="Title" value={title} onChange={e => setTitle(e.target.value)} />
          <input className="border p-1 flex-1 rounded" placeholder="Description" value={desc} onChange={e => setDesc(e.target.value)} />
          <select className="border p-1 rounded" value={targetLevel} onChange={e => setTargetLevel(e.target.value)}>
            {["ADM0","ADM1","ADM2","ADM3","ADM4"].map(l=><option key={l}>{l}</option>)}
          </select>
          <select className="border p-1 rounded" value={isParametric ? "parametric":"fixed"} onChange={e=>setIsParametric(e.target.value==="parametric")}>
            <option value="fixed">Fixed</option><option value="parametric">Parametric</option>
          </select>
        </div>

        {/* Dataset selectors */}
        <div className="flex gap-2 mb-3">
          {[["A",datasetA,setDatasetA],["B",datasetB,setDatasetB]].map(([label,ds,setter],i)=>!useScalarB||label==="A"?(
            <select key={label} className="border p-1 rounded flex-1" value={(ds as any)?.id||""} onChange={e=>setter(datasets.find(d=>d.id===e.target.value)||null)} disabled={!!editDataset}>
              <option value="">Select Dataset {label}</option>
              {["core","gis","other","derived"].map(g=>(
                <optgroup key={g} label={g.toUpperCase()}>
                  {datasets.filter(d=>d.source===g).map(d=><option key={d.id} value={d.id}>{d.title}</option>)}
                </optgroup>
              ))}
            </select>):null)}
        </div>

        {/* Columns + Scalar */}
        <div className="flex gap-2 mb-3 items-center">
          <input className="border p-1 rounded w-40" value={colA} onChange={e=>setColA(e.target.value)} placeholder="Column A" />
          {!useScalarB && <input className="border p-1 rounded w-40" value={colB} onChange={e=>setColB(e.target.value)} placeholder="Column B" />}
          <label className="text-xs flex items-center gap-1 ml-auto">
            <input type="checkbox" checked={useScalarB} onChange={e=>setUseScalarB(e.target.checked)} /> Use Scalar B
          </label>
          {useScalarB && <input type="number" className="border p-1 rounded w-24 text-right" value={scalarB} onChange={e=>setScalarB(parseFloat(e.target.value||"0"))} />}
        </div>

        {/* Method + Preview */}
        <div className="flex items-center gap-2 mb-2">
          {(["ratio","multiply","sum","difference"] as const).map(m=>(
            <button key={m} onClick={()=>setMethod(m)} className={`px-2 py-1 border rounded ${method===m?"text-white":""}`} style={{background:method===m?ACCENT:"transparent",borderColor:"#e5e7eb"}}>{m}</button>
          ))}
          <button onClick={previewJoin} className="ml-auto px-3 py-1 text-white rounded" style={{background:ACCENT}}>
            {loadingPreview?"Loading...":"Preview"}
          </button>
        </div>
        <p className="text-xs italic mb-2">Derived = {formula}</p>

        {/* Preview Table */}
        <div className="max-h-64 overflow-y-auto border rounded text-xs mb-4">
          <table className="w-full"><thead className="bg-gray-100"><tr><th className="p-1 text-left">Key</th><th className="p-1">Name</th><th className="p-1 text-right">A</th><th className="p-1 text-right">B</th><th className="p-1 text-right">Derived</th></tr></thead>
          <tbody>{preview.length===0?<tr><td colSpan={5} className="text-center italic text-gray-500 py-2">No preview data</td></tr>:
          preview.map((r,i)=><tr key={i} className="border-t"><td className="p-1">{r.join_key}</td><td className="p-1">{r.place_name}</td>
          <td className="p-1 text-right">{fmt(r.a)}</td><td className="p-1 text-right">{fmt(r.b)}</td><td className="p-1 text-right font-medium">{fmt(r.derived)}</td></tr>)}</tbody></table>
        </div>

        {/* Taxonomy */}
        <h3 className="text-sm font-semibold mb-2">Assign Taxonomy</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
          {Object.keys(taxonomyMap).map(cat=>{
            const checked=!!taxonomy[cat];
            return(<div key={cat} className="border rounded p-2">
              <label className="flex items-center gap-1 text-xs font-medium">
                <input type="checkbox" checked={checked} onChange={e=>setTaxonomy(p=>{
                  const n={...p}; if(e.target.checked){if(!n[cat])n[cat]=new Set<string>();} else delete n[cat]; return n;
                })}/> {cat}
              </label>
              {checked&&<div className="ml-3 mt-1 grid grid-cols-1">
                {taxonomyMap[cat].map(term=>(
                  <label key={term} className="flex items-center gap-1 text-xs">
                    <input type="checkbox" checked={!!taxonomy[cat]?.has(term)} onChange={e=>setTaxonomy(p=>{
                      const n={...p}; if(!n[cat])n[cat]=new Set<string>();
                      if(e.target.checked)n[cat]!.add(term); else n[cat]!.delete(term); return n;
                    })}/> {term}
                  </label>))}
              </div>}
            </div>);
          })}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-1 border rounded">Cancel</button>
          <button onClick={saveDerived} className="px-3 py-1 text-white rounded" style={{background:ACCENT}}>
            {editDataset?"Save Changes":"Save Derived"}
          </button>
        </div>
      </div>
    </div>
  );
}

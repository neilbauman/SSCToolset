"use client";
import { useState, useEffect } from "react";
import { supabaseBrowser } from "@/lib/supabase/supabaseBrowser";

type Source = "core" | "other" | "derived" | "gis";
type Option = { id: string; title: string; source: Source; table: string };
type Props = { open: boolean; onClose: () => void; countryIso: string };

export default function CreateDerivedDatasetWizard_JoinAware({ open, onClose, countryIso }: Props) {
  const sb = supabaseBrowser;
  const [title, setTitle] = useState(""), [desc, setDesc] = useState(""), [targetLevel, setTargetLevel] = useState("ADM3");
  const [method, setMethod] = useState("ratio"), [decimals, setDecimals] = useState(0);
  const [useScalarB, setUseScalarB] = useState(false), [scalarB, setScalarB] = useState<number>(1);
  const [datasets, setDatasets] = useState<Option[]>([]), [datasetA, setDatasetA] = useState<Option | null>(null), [datasetB, setDatasetB] = useState<Option | null>(null);
  const [colA, setColA] = useState(""), [colB, setColB] = useState(""), [preview, setPreview] = useState<any[]>([]);
  const [previewA, setPreviewA] = useState<any[]>([]), [previewB, setPreviewB] = useState<any[]>([]);
  const [categories, setCategories] = useState<Record<string, string[]>>({}), [taxonomy, setTaxonomy] = useState<Record<string, string[]>>({});
  const [include, setInclude] = useState({ core: true, other: true, derived: true, gis: true }), [loadingPreview, setLoadingPreview] = useState(false);

  useEffect(() => { if (open) loadDatasets(); }, [open, include]);
  useEffect(() => { if (open) loadTaxonomy(); }, [open]);

  async function loadDatasets() {
    const list: Option[] = [];
    if (include.core) {
      list.push({ id: "core-admin", title: "Administrative Boundaries [Core]", source: "core", table: "admin_units" });
      list.push({ id: "core-pop", title: "Population Data [Core]", source: "core", table: "population_data" });
    }
    if (include.gis)
      list.push({ id: "core-gis", title: "GIS Features [Core]", source: "gis", table: "gis_features" });
    if (include.other) {
      const { data } = await sb.from("dataset_metadata").select("id,title").eq("country_iso", countryIso);
      if (data) data.forEach((d) => list.push({ id: d.id, title: d.title, source: "other", table: `dataset_${d.id}` }));
    }
    if (include.derived) {
      const { data } = await sb.from("view_derived_dataset_summary").select("derived_dataset_id,derived_title,admin_level").eq("country_iso", countryIso);
      if (data) data.forEach((d) => list.push({ id: d.derived_dataset_id, title: `${d.derived_title} (${d.admin_level})`, source: "derived", table: `derived_${d.derived_dataset_id}` }));
    }
    setDatasets(list);
  }

  async function loadTaxonomy() {
    const { data } = await sb.from("taxonomy_terms").select("category,name");
    if (!data) return;
    const grouped: Record<string, string[]> = {};
    data.forEach((t) => { if (!grouped[t.category]) grouped[t.category] = []; grouped[t.category].push(t.name); });
    setCategories(grouped);
  }

  async function detectNumericColumn(table: string): Promise<string> {
    const { data } = await sb.from(table).select("*").limit(1);
    if (!data || !data[0]) return "value";
    const numeric = Object.keys(data[0]).find((k) => typeof data[0][k] === "number");
    return numeric || "value";
  }

  async function peekDataset(table: string, side: "A" | "B") {
    const { data } = await sb.from(table).select("*").limit(10);
    if (!data) return;
    const numKey = Object.keys(data[0] || {}).find((k) => typeof data[0][k] === "number");
    const rows = data.map((r) => ({ pcode: r.pcode, name: r.name, value: numKey ? r[numKey] : null }));
    if (side === "A") setPreviewA(rows); else setPreviewB(rows);
  }

  async function previewJoin() {
    if (!datasetA) return alert("Select Dataset A first.");
    setLoadingPreview(true);
    const colAname = await detectNumericColumn(datasetA.table);
    const colBname = useScalarB ? "scalar" : datasetB ? await detectNumericColumn(datasetB.table) : "scalar";
    const { data, error } = await sb.rpc("simulate_join_preview_autoaggregate", {
      p_table_a: datasetA.table,
      p_table_b: datasetB?.table || "",
      p_country: countryIso,
      p_target_level: targetLevel,
      p_method: method,
      p_col_a: colAname,
      p_col_b: colBname,
      p_use_scalar_b: useScalarB,
      p_scalar_b_val: scalarB,
    });
    setLoadingPreview(false);
    if (error) return alert("Preview failed: " + error.message);
    setColA(colAname); setColB(colBname); setPreview(data || []);
  }

  async function saveDerived() {
    if (!title) return alert("Please provide a title.");
    if (preview.length === 0) return alert("Please generate a preview first.");

    const taxonomyCats = Object.keys(taxonomy);
    const taxonomyTerms = Object.values(taxonomy).flat();
    const formula = `Derived = A.${colA} ${method === "ratio" ? "÷" : method === "multiply" ? "×" : method === "sum" ? "+" : "–"} ${useScalarB ? scalarB : "B." + colB}`;

    const { error } = await sb.rpc("create_derived_dataset", {
      p_country_iso: countryIso,
      p_title: title,
      p_description: desc,
      p_admin_level: targetLevel,
      p_table_a: datasetA?.table || "",
      p_table_b: datasetB?.table || "",
      p_col_a: colA,
      p_col_b: colB,
      p_use_scalar_b: useScalarB,
      p_scalar_b_val: scalarB,
      p_method: method,
      p_decimals: decimals,
      p_taxonomy_categories: taxonomyCats,
      p_taxonomy_terms: taxonomyTerms,
      p_formula: formula,
    });

    if (error) return alert("Save failed: " + error.message);
    alert("Derived dataset created successfully.");
    onClose();
  }

  if (!open) return null;
  const grouped = ["core", "other", "derived", "gis"].map((g) => ({ key: g, label: g.charAt(0).toUpperCase() + g.slice(1), options: datasets.filter((d) => d.source === g) }));
  const formula = `Derived = A.${colA || "?"} ${method === "ratio" ? "÷" : method === "multiply" ? "×" : method === "sum" ? "+" : "–"} ${useScalarB ? scalarB : `B.${colB || "?"}`}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-lg w-[95%] max-w-6xl max-h-[90vh] overflow-y-auto p-6 text-sm">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-[#640811]">Create Derived Dataset</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-black text-lg">✕</button>
        </div>
        <div className="grid grid-cols-3 gap-2 mb-3">
          <input className="border rounded p-2" placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <input className="border rounded p-2" placeholder="Description" value={desc} onChange={(e) => setDesc(e.target.value)} />
          <select className="border rounded p-2" value={targetLevel} onChange={(e) => setTargetLevel(e.target.value)}>
            {["ADM1", "ADM2", "ADM3", "ADM4"].map((lvl) => <option key={lvl}>{lvl}</option>)}
          </select>
        </div>

        <div className="flex gap-4 mb-3">{Object.entries(include).map(([k, v]) => (
          <label key={k} className="flex items-center gap-1"><input type="checkbox" checked={v} onChange={(e) => setInclude({ ...include, [k]: e.target.checked })} /> {k.charAt(0).toUpperCase() + k.slice(1)}</label>
        ))}</div>

        <div className="grid grid-cols-2 gap-4 mb-3">
          <div className="border rounded-lg p-3">
            <div className="flex items-center justify-between mb-2"><span className="font-medium text-gray-700">Dataset A</span>
              <button onClick={() => datasetA && peekDataset(datasetA.table, "A")} className="text-xs border px-2 py-1 rounded hover:bg-gray-100">Peek</button></div>
            <select className="border rounded p-2 w-full" value={datasetA?.id || ""} onChange={(e) => setDatasetA(datasets.find((x) => x.id === e.target.value) || null)}>
              <option value="">Select dataset...</option>{grouped.map((g) => (<optgroup key={g.key} label={g.label} style={{ color: "#666" }}>{g.options.map((d) => <option key={d.id} value={d.id}>{d.title}</option>)}</optgroup>))}
            </select>
            {previewA.length > 0 && (<div className="max-h-20 overflow-y-auto text-xs border rounded mt-1">{previewA.map((r, i) => (
              <div key={i} className="grid grid-cols-3 border-b p-1"><span>{r.pcode}</span><span>{r.name}</span><span className="text-right">{r.value}</span></div>))}</div>)}
          </div>

          {!useScalarB && (<div className="border rounded-lg p-3">
            <div className="flex items-center justify-between mb-2"><span className="font-medium text-gray-700">Dataset B</span>
              <button onClick={() => datasetB && peekDataset(datasetB.table, "B")} className="text-xs border px-2 py-1 rounded hover:bg-gray-100">Peek</button></div>
            <select className="border rounded p-2 w-full" value={datasetB?.id || ""} onChange={(e) => setDatasetB(datasets.find((x) => x.id === e.target.value) || null)}>
              <option value="">Select dataset...</option>{grouped.map((g) => (<optgroup key={g.key} label={g.label} style={{ color: "#666" }}>{g.options.map((d) => <option key={d.id} value={d.id}>{d.title}</option>)}</optgroup>))}
            </select>
            {previewB.length > 0 && (<div className="max-h-20 overflow-y-auto text-xs border rounded mt-1">{previewB.map((r, i) => (
              <div key={i} className="grid grid-cols-3 border-b p-1"><span>{r.pcode}</span><span>{r.name}</span><span className="text-right">{r.value}</span></div>))}</div>)}
          </div>)}
        </div>

        <div className="flex items-center gap-3 mb-3">
          <select className="border rounded p-2" value={method} onChange={(e) => setMethod(e.target.value)}>{["ratio","multiply","sum","difference"].map((m)=> <option key={m}>{m}</option>)}</select>
          <select className="border rounded p-2" value={decimals} onChange={(e)=>setDecimals(parseInt(e.target.value))}>{[0,1,2].map((n)=><option key={n}>{n} decimals</option>)}</select>
          <div className="ml-auto flex items-center gap-2"><label className="flex items-center gap-1"><input type="checkbox" checked={useScalarB} onChange={(e)=>setUseScalarB(e.target.checked)} /> Scalar B</label>
            {useScalarB && (<input type="number" className="border rounded p-1 w-24 text-right" value={scalarB} onChange={(e)=>setScalarB(parseFloat(e.target.value))}/>)} 
            <button onClick={previewJoin} className="ml-4 px-4 py-1.5 bg-[#640811] text-white rounded hover:bg-[#50060d]">{loadingPreview ? "..." : "Preview"}</button>
          </div>
        </div>

        <p className="text-xs italic mb-2 text-gray-600">{formula}</p>

        {preview.length>0 && (<div className="max-h-40 overflow-y-auto border rounded mb-4 text-xs"><table className="w-full"><thead className="bg-gray-50 sticky top-0"><tr><th>Pcode</th><th>Name</th><th>A</th><th>B</th><th>Derived</th></tr></thead>
          <tbody>{preview.map((r,i)=>(<tr key={i} className="border-t"><td>{r.out_pcode}</td><td>{r.place_name}</td><td className="text-right">{r.a}</td><td className="text-right">{r.b}</td><td className="text-right">{Number(r.derived).toFixed(decimals)}</td></tr>))}</tbody></table></div>)}

        <h3 className="text-sm font-semibold mb-1">Assign Taxonomy</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">{Object.keys(categories).map((cat)=>(
          <div key={cat}><label className="flex items-center gap-1 font-medium text-[13px] text-gray-700">
            <input type="checkbox" checked={!!taxonomy[cat]} onChange={(e)=>{const t={...taxonomy};if(e.target.checked)t[cat]=[];else delete t[cat];setTaxonomy(t);}}/> {cat}</label>
            {taxonomy[cat]&&(<div className="ml-4 mt-1 grid grid-cols-1">{categories[cat].map((term)=>(
              <label key={term} className="flex items-center gap-1 text-xs">
                <input type="checkbox" checked={taxonomy[cat]?.includes(term)} onChange={(e)=>{const t={...taxonomy};if(e.target.checked)t[cat]=[...(t[cat]||[]),term];else t[cat]=t[cat].filter((x)=>x!==term);setTaxonomy(t);}}/> {term}</label>))}</div>)}</div>))}
        </div>

        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-1.5 border rounded text-sm">Cancel</button>
          <button onClick={saveDerived} className="px-4 py-1.5 bg-[#00b398] text-white rounded text-sm hover:bg-[#00957e]">Save Derived</button>
        </div>
      </div>
    </div>
  );
}

"use client";
import { useEffect, useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";

type Props = {
  open: boolean;
  onClose: () => void;
  countryIso: string;
};

export default function CreateDerivedDatasetWizard_JoinAware({ open, onClose, countryIso }: Props) {
  const [datasets, setDatasets] = useState([]);
  const [datasetA, setA] = useState(null);
  const [datasetB, setB] = useState(null);
  const [colA, setColA] = useState("population");
  const [colB, setColB] = useState("population");
  const [useScalarB, setUseScalarB] = useState(true);
  const [scalarB, setScalarB] = useState(5.1);
  const [method, setMethod] = useState("ratio");
  const [decimals, setDecimals] = useState(0);
  const [targetLevel, setTargetLevel] = useState("ADM4");
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [previewRows, setPreviewRows] = useState([]);
  const [taxonomy, setTaxonomy] = useState({});
  const [taxonomyTerms, setTaxonomyTerms] = useState([]);

  useEffect(() => { if (!open) return;
    (async () => {
      const { data } = await supabase.from("dataset_metadata").select("id,title,source,table_name");
      const { data: tax } = await supabase.from("taxonomy_terms").select("category,name");
      const grouped = tax?.reduce((a, t) => {
        a[t.category] = [...(a[t.category] || []), t.name]; return a;
      }, {}) || {};
      setDatasets(data || []); setTaxonomyTerms(grouped);
    })();
  }, [open]);

  async function peek(ds, setter) {
    if (!ds?.table_name) return;
    const { data } = await supabase.from(ds.table_name).select("*").limit(5);
    setter(data || []);
  }

  async function previewJoin() {
    if (!datasetA) return;
    const { data, error } = await supabase.rpc("simulate_join_preview_autoaggregate", {
      p_table_a: datasetA.table_name, p_table_b: datasetB?.table_name || null,
      p_country: countryIso, p_target_level: targetLevel, p_method: method,
      p_col_a: colA, p_col_b: colB, p_use_scalar_b: useScalarB,
      p_scalar_b_val: useScalarB ? scalarB : null
    });
    if (!error) setPreviewRows(data || []); else alert("Join preview failed");
  }

  async function save() {
    const { data, error } = await supabase.from("derived_dataset_metadata").insert({
      country_iso: countryIso, title, description: desc, admin_level: targetLevel,
      table_a: datasetA?.table_name, table_b: useScalarB ? null : datasetB?.table_name,
      col_a: colA, col_b: colB, use_scalar_b: useScalarB, scalar_b_val: useScalarB ? scalarB : null,
      method, decimals,
      taxonomy_categories: Object.keys(taxonomy),
      taxonomy_terms: Object.entries(taxonomy).flatMap(([k, v]) => (v ? [v] : [])),
      formula: `Derived = A.${colA} ${methodSymbol(method)} ${useScalarB ? scalarB : "B." + colB} → ${targetLevel}`
    }).select("id").single();
    if (error) alert("Save failed: " + error.message);
    else { alert("Derived dataset created."); onClose(); }
  }

  const toggleTerm = (cat, term) =>
    setTaxonomy((t) => {
      const set = new Set(t[cat] || []);
      set.has(term) ? set.delete(term) : set.add(term);
      return { ...t, [cat]: Array.from(set) };
    });

  const methodSymbol = (m) => ({ ratio: "÷", multiply: "×", sum: "+", difference: "−" }[m] || "?");

  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
      <div className="bg-white p-4 rounded w-[900px] max-h-[95vh] overflow-y-auto text-sm space-y-3">
        <div className="flex gap-3 items-center">
          {["Core", "Other", "Derived", "GIS"].map((s) => (
            <label key={s} className="flex items-center gap-1">
              <input type="checkbox" defaultChecked={s !== "GIS"} /> Include {s}
            </label>
          ))}
        </div>
        <div className="flex gap-2">
          <input className="border p-1 flex-1" placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <select value={targetLevel} onChange={(e) => setTargetLevel(e.target.value)} className="border p-1">
            {["ADM4", "ADM3", "ADM2", "ADM1"].map((a) => <option key={a}>{a}</option>)}
          </select>
          <input className="border p-1 flex-1" placeholder="Description (optional)" value={desc} onChange={(e) => setDesc(e.target.value)} />
        </div>
        <div className="flex gap-2">
          <select value={datasetA?.id || ""} onChange={(e) => setA(datasets.find((d) => d.id == e.target.value))} className="border p-1 flex-1">
            <option value="">Select Dataset A</option>
            {datasets.map((d) => <option key={d.id} value={d.id}>{d.title} [{d.source}]</option>)}
          </select>
          <select value={datasetB?.id || ""} onChange={(e) => setB(datasets.find((d) => d.id == e.target.value))} className="border p-1 flex-1" disabled={useScalarB}>
            <option value="">Select Dataset B</option>
            {datasets.map((d) => <option key={d.id} value={d.id}>{d.title} [{d.source}]</option>)}
          </select>
          <label className="flex items-center gap-1">
            <input type="checkbox" checked={useScalarB} onChange={(e) => setUseScalarB(e.target.checked)} /> Use scalar
          </label>
          {useScalarB && <input type="number" value={scalarB} onChange={(e) => setScalarB(e.target.value)} className="border p-1 w-20" />}
        </div>
        <div className="flex gap-2 items-center">
          <input className="border p-1 flex-1" value={colA} onChange={(e) => setColA(e.target.value)} />
          <button onClick={() => peek(datasetA, setPreviewRows)} className="border px-2">peek</button>
          <select value={method} onChange={(e) => setMethod(e.target.value)} className="border p-1">
            {["multiply", "ratio", "sum", "difference"].map((m) => <option key={m}>{m}</option>)}
          </select>
          <div className="flex items-center gap-1 text-xs text-gray-600">
            Derived = A.{colA} {methodSymbol(method)} {useScalarB ? scalarB : "B." + colB} → {targetLevel}
          </div>
        </div>
        <div className="flex gap-2 items-center">
          <label>Decimals:</label>
          <input type="number" min="0" max="4" value={decimals} onChange={(e) => setDecimals(+e.target.value)} className="border p-1 w-16" />
          <button onClick={previewJoin} className="bg-blue-500 text-white px-3 py-1 rounded">Preview</button>
        </div>
        <div className="max-h-48 overflow-y-auto border rounded">
          <table className="w-full text-xs">
            <thead><tr className="bg-gray-100"><th>Pcode</th><th>Name</th><th>A</th><th>B</th><th>Derived</th></tr></thead>
            <tbody>{previewRows.map((r, i) => (
              <tr key={i}><td>{r.out_pcode}</td><td>{r.place_name}</td><td>{r.a}</td><td>{r.b}</td>
              <td>{r.derived?.toFixed(decimals)}</td></tr>))}</tbody>
          </table>
        </div>
        <div>
          <b>Assign Taxonomy</b>
          <div className="grid grid-cols-4 gap-2 mt-1">
            {Object.entries(taxonomyTerms).map(([cat, terms]) => (
              <div key={cat}>
                <label className="font-semibold">{cat}</label>
                <div className="pl-2 space-y-1">
                  {terms.map((t) => (
                    <label key={t} className="block">
                      <input type="checkbox"
                        checked={taxonomy[cat]?.includes(t)}
                        onChange={() => toggleTerm(cat, t)} /> {t}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="border px-3 py-1 rounded">Cancel</button>
          <button onClick={save} className="bg-green-600 text-white px-3 py-1 rounded">Save Derived</button>
        </div>
      </div>
    </div>
  );
}

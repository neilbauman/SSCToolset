"use client";
import { useEffect, useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";

type Props = { open: boolean; onClose: () => void; countryIso: string; };
type Taxonomy = Record<string, string[]>;

export default function CreateDerivedDatasetWizard_JoinAware({ open, onClose, countryIso }: Props) {
  const [datasets, setDatasets] = useState<any[]>([]);
  const [datasetA, setA] = useState<any | null>(null);
  const [datasetB, setB] = useState<any | null>(null);
  const [colA, setColA] = useState("population");
  const [colB, setColB] = useState("population");
  const [useScalarB, setUseScalarB] = useState(true);
  const [scalarB, setScalarB] = useState(5.1);
  const [method, setMethod] = useState("ratio");
  const [decimals, setDecimals] = useState(0);
  const [targetLevel, setTargetLevel] = useState("ADM4");
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [previewRows, setPreviewRows] = useState<any[]>([]);
  const [taxonomy, setTaxonomy] = useState<Taxonomy>({});

  useEffect(() => {
    if (!open) return;
    (async () => {
      const { data } = await supabase.from("dataset_metadata").select("id,title,source,table_name");
      const { data: tax } = await supabase.from("taxonomy_terms").select("category,name");
      const grouped = (tax || []).reduce((a: Taxonomy, t: any) => {
        if (!a[t.category]) a[t.category] = [];
        a[t.category].push(t.name);
        return a;
      }, {});
      setDatasets(data || []); setTaxonomy(grouped);
    })();
  }, [open]);

  async function peek(ds: any) {
    if (!ds?.table_name) return;
    const { data } = await supabase.from(ds.table_name).select("pcode,name,population").limit(5);
    alert(JSON.stringify(data, null, 2));
  }

  async function previewJoin() {
    const { data, error } = await supabase.rpc("simulate_join_preview_autoaggregate", {
      p_table_a: datasetA?.table_name, p_table_b: datasetB?.table_name || null,
      p_country: countryIso, p_target_level: targetLevel, p_method: method,
      p_col_a: colA, p_col_b: colB, p_use_scalar_b: useScalarB,
      p_scalar_b_val: useScalarB ? scalarB : null,
    });
    if (error) alert("Join preview failed: " + error.message);
    else setPreviewRows(data || []);
  }

  async function save() {
    const { error } = await supabase.from("derived_dataset_metadata").insert({
      country_iso: countryIso, title, description: desc, admin_level: targetLevel,
      table_a: datasetA?.table_name, table_b: useScalarB ? null : datasetB?.table_name,
      col_a: colA, col_b: colB, use_scalar_b: useScalarB, scalar_b_val: useScalarB ? scalarB : null,
      method, decimals,
      taxonomy_categories: Object.keys(taxonomy),
      taxonomy_terms: Object.values(taxonomy).flat(),
      formula: `Derived = A.${colA} ${symbol(method)} ${useScalarB ? scalarB : "B." + colB} → ${targetLevel}`,
    });
    if (error) alert("Save failed: " + error.message); else { alert("✅ Saved."); onClose(); }
  }

  const symbol = (m: string) => ({ ratio: "÷", multiply: "×", sum: "+", difference: "−" }[m] || "?");

  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
      <div className="bg-white p-4 rounded w-[900px] max-h-[95vh] overflow-y-auto text-sm space-y-3">
        <div className="flex gap-2">
          <input value={title} onChange={e => setTitle(e.target.value)} className="border p-1 flex-1" placeholder="Title" />
          <select value={targetLevel} onChange={e => setTargetLevel(e.target.value)} className="border p-1">
            {["ADM4","ADM3","ADM2","ADM1"].map(a => <option key={a}>{a}</option>)}
          </select>
          <input value={desc} onChange={e => setDesc(e.target.value)} className="border p-1 flex-1" placeholder="Description" />
        </div>
        <div className="flex gap-2">
          <select value={datasetA?.id||""} onChange={e=>setA(datasets.find(d=>d.id==e.target.value))} className="border p-1 flex-1">
            <option>Select Dataset A</option>{datasets.map(d=><option key={d.id} value={d.id}>{d.title}</option>)}
          </select>
          <button onClick={()=>peek(datasetA)} className="border px-2">peek</button>
          <select value={datasetB?.id||""} disabled={useScalarB} onChange={e=>setB(datasets.find(d=>d.id==e.target.value))} className="border p-1 flex-1">
            <option>Select Dataset B</option>{datasets.map(d=><option key={d.id} value={d.id}>{d.title}</option>)}
          </select>
          <label className="flex items-center gap-1"><input type="checkbox" checked={useScalarB} onChange={e=>setUseScalarB(e.target.checked)}/>Scalar</label>
          {useScalarB && <input type="number" value={scalarB} onChange={e=>setScalarB(+e.target.value)} className="border p-1 w-20" />}
        </div>
        <div className="flex gap-2 items-center">
          <select value={method} onChange={e=>setMethod(e.target.value)} className="border p-1">
            {["multiply","ratio","sum","difference"].map(m=><option key={m}>{m}</option>)}
          </select>
          <div className="text-xs text-gray-600">Derived = A.{colA} {symbol(method)} {useScalarB ? scalarB : "B."+colB}</div>
          <label className="flex items-center gap-1 ml-auto">Decimals:
            <input type="number" value={decimals} onChange={e=>setDecimals(+e.target.value)} className="border w-12 p-1 text-xs" />
          </label>
          <button onClick={previewJoin} className="bg-blue-500 text-white px-3 py-1 rounded">Preview</button>
        </div>
        <div className="max-h-48 overflow-y-auto border rounded">
          <table className="w-full text-xs"><thead><tr className="bg-gray-100">
            <th>Pcode</th><th>Name</th><th>A</th><th>B</th><th>Derived</th></tr></thead>
            <tbody>{previewRows.map((r,i)=><tr key={i}>
              <td>{r.out_pcode}</td><td>{r.place_name}</td><td>{r.a}</td><td>{r.b}</td><td>{r.derived?.toFixed(decimals)}</td></tr>)}</tbody></table>
        </div>
        <div><b>Taxonomy</b>
          <div className="grid grid-cols-4 gap-2 mt-1">
            {Object.entries(taxonomy).map(([cat,terms])=>(
              <div key={cat}><label className="font-semibold">{cat}</label>
                <div className="pl-2">{terms.map(t=><label key={t} className="block text-xs">
                  <input type="checkbox"/> {t}</label>)}</div></div>))}
          </div>
        </div>
        <div className="flex justify-end gap-2"><button onClick={onClose} className="border px-3 py-1 rounded">Cancel</button>
          <button onClick={save} className="bg-green-600 text-white px-3 py-1 rounded">Save</button></div>
      </div>
    </div>
  );
}

"use client";
import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";

type Props = { open: boolean; onClose: () => void; countryIso: string };

type DatasetOption = {
  id: string;
  title: string;
  admin_level?: string;
  source: "core" | "other" | "derived";
  table_name: string;
};
type TaxonomyMap = Record<string, string[]>;

export default function CreateDerivedDatasetWizard_JoinAware({ open, onClose, countryIso }: Props) {
  // toggles for what to load into dropdowns
  const [incCore, setIncCore] = useState(true);
  const [incOther, setIncOther] = useState(true);
  const [incDerived, setIncDerived] = useState(true);

  // loaded datasets (merged)
  const [allDatasets, setAllDatasets] = useState<DatasetOption[]>([]);
  const datasets = useMemo(() => {
    return allDatasets.filter(d =>
      (incCore && d.source === "core") ||
      (incOther && d.source === "other") ||
      (incDerived && d.source === "derived")
    );
  }, [allDatasets, incCore, incOther, incDerived]);

  // selections
  const [datasetA, setA] = useState<DatasetOption | null>(null);
  const [datasetB, setB] = useState<DatasetOption | null>(null);
  const [colA, setColA] = useState("population");
  const [colB, setColB] = useState("population");
  const [useScalarB, setUseScalarB] = useState(true);
  const [scalarB, setScalarB] = useState<number>(5.1);
  const [method, setMethod] = useState("ratio");
  const [decimals, setDecimals] = useState(0);
  const [targetLevel, setTargetLevel] = useState("ADM4");
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");

  // previews
  const [previewRows, setPreviewRows] = useState<any[]>([]);
  const [peekRows, setPeekRows] = useState<any[]>([]);
  const [peekTitle, setPeekTitle] = useState<string>("");

  // taxonomy
  const [taxonomy, setTaxonomy] = useState<TaxonomyMap>({});
  const [catChecked, setCatChecked] = useState<Record<string, boolean>>({});
  const [termChecked, setTermChecked] = useState<Record<string, Record<string, boolean>>>({});

  // load datasets + taxonomy when modal opens or toggles change
  useEffect(() => {
    if (!open) return;
    (async () => {
      const core: DatasetOption[] = [
        { id: "core-admin",  title: "Administrative Boundaries", admin_level: "ADM4", source: "core", table_name: "admin_units" },
        { id: "core-pop",    title: "Population Data",          admin_level: "ADM4", source: "core", table_name: "population_data" },
        { id: "core-gis",    title: "GIS Features",             admin_level: "ADM4", source: "core", table_name: "gis_features" },
      ];
      const other: DatasetOption[] = (await supabase
        .from("dataset_metadata")
        .select("id,title,admin_level")
        .eq("country_iso", countryIso)
        .order("title")).data?.map((d: any) => ({
          id: d.id, title: d.title || "(Untitled)", admin_level: d.admin_level,
          source: "other" as const, table_name: `dataset_${d.id}`.toLowerCase()
        })) || [];
      const derived: DatasetOption[] = (await supabase
        .from("view_derived_dataset_summary")
        .select("derived_dataset_id,derived_title,admin_level")
        .eq("country_iso", countryIso)
        .order("derived_title")).data?.map((d: any) => ({
          id: d.derived_dataset_id, title: d.derived_title, admin_level: d.admin_level,
          source: "derived" as const, table_name: `derived_${d.derived_dataset_id}`
        })) || [];
      setAllDatasets([...core, ...other, ...derived]);

      const tax = (await supabase.from("taxonomy_terms").select("category,name")).data || [];
      const grouped = tax.reduce((a: TaxonomyMap, t: any) => {
        if (!a[t.category]) a[t.category] = [];
        a[t.category].push(t.name);
        return a;
      }, {});
      setTaxonomy(grouped);
      // initialize check states (unchecked by default)
      const initCat: Record<string, boolean> = {};
      const initTerms: Record<string, Record<string, boolean>> = {};
      Object.keys(grouped).forEach(c => { initCat[c] = false; initTerms[c] = {}; grouped[c].forEach(n => initTerms[c][n] = false); });
      setCatChecked(initCat); setTermChecked(initTerms);
    })();
  }, [open, countryIso]);

  // small helper
  const symbol = (m: string) => ({ ratio: "÷", multiply: "×", sum: "+", difference: "−" }[m] || "?");

  // PEEK (shows pcode, name, and chosen value if exists, else population if exists)
  async function doPeek(ds: DatasetOption | null, col: string) {
    setPeekRows([]); setPeekTitle("");
    if (!ds) return;
    const selectCols = ["pcode", "name", col].join(",");
    let { data, error } = await supabase.from(ds.table_name).select(selectCols).limit(6);
    if (error) {
      // fallback to population
      ({ data, error } = await supabase.from(ds.table_name).select("pcode,name,population").limit(6));
    }
    if (!error && data) { setPeekRows(data); setPeekTitle(`${ds.title} (${col})`); }
  }

  // PREVIEW (join/scalar)
  async function previewJoin() {
    const { data, error } = await supabase.rpc("simulate_join_preview_autoaggregate", {
      p_table_a: datasetA?.table_name || null,
      p_table_b: useScalarB ? null : (datasetB?.table_name || null),
      p_country: countryIso,
      p_target_level: targetLevel,
      p_method: method,
      p_col_a: colA,
      p_col_b: useScalarB ? colA /*not used*/ : colB,
      p_use_scalar_b: useScalarB,
      p_scalar_b_val: useScalarB ? scalarB : null
    });
    if (error) return alert("Join preview failed: " + error.message);
    setPreviewRows(data || []);
  }

  // SAVE (includes selected taxonomy)
  async function save() {
    const selectedCats = Object.entries(catChecked).filter(([, v]) => v).map(([k]) => k);
    const selectedTerms = Object.entries(termChecked)
      .flatMap(([c, m]) => Object.entries(m).filter(([, v]) => v).map(([name]) => ({ c, name })));

    const { error } = await supabase.from("derived_dataset_metadata").insert({
      country_iso: countryIso,
      title, description: desc, admin_level: targetLevel,
      table_a: datasetA?.table_name || null,
      table_b: useScalarB ? null : (datasetB?.table_name || null),
      col_a: colA, col_b: useScalarB ? null : colB,
      use_scalar_b: useScalarB, scalar_b_val: useScalarB ? scalarB : null,
      method, decimals,
      taxonomy_categories: selectedCats,
      taxonomy_terms: selectedTerms.map(t => `${t.c}:${t.name}`),
      formula: `A.${colA} ${symbol(method)} ${useScalarB ? scalarB : `B.${colB}`} → ${targetLevel}`
    });
    if (error) return alert("Save failed: " + error.message);
    alert("✅ Saved."); onClose();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
      <div className="bg-white rounded w-[980px] max-h-[95vh] overflow-y-auto p-4 text-sm space-y-3">
        {/* header */}
        <div className="flex items-center gap-2">
          <input className="border rounded p-2 flex-1" placeholder="Derived dataset title" value={title} onChange={e=>setTitle(e.target.value)} />
          <select className="border rounded p-2" value={targetLevel} onChange={e=>setTargetLevel(e.target.value)}>
            {["ADM4","ADM3","ADM2","ADM1"].map(x=><option key={x}>{x}</option>)}
          </select>
        </div>
        <input className="border rounded p-2 w-full" placeholder="Description" value={desc} onChange={e=>setDesc(e.target.value)} />

        {/* dataset group toggles */}
        <div className="flex flex-wrap gap-6 text-xs">
          {[["Include Core",incCore,setIncCore],["Include Other",incOther,setIncOther],["Include Derived",incDerived,setIncDerived]].map(([l,v,fn]: any)=>(
            <label key={l} className="flex items-center gap-2"><input type="checkbox" checked={v} onChange={e=>(fn as any)(e.target.checked)} />{l}</label>
          ))}
        </div>

        {/* A & B selection row */}
        <div className="grid grid-cols-2 gap-3 items-end">
          {/* A side */}
          <div className="border rounded p-3">
            <div className="font-semibold mb-1">Dataset A</div>
            <select className="border rounded p-2 w-full" value={datasetA?.id || ""} onChange={e=>setA(datasets.find(d=>d.id==e.target.value) || null)}>
              <option value="">Select dataset…</option>
              {datasets.map(d=><option key={d.id} value={d.id}>[{d.source}] {d.title}</option>)}
            </select>
            <div className="flex gap-2 mt-2">
              <input className="border rounded p-2 flex-1" value={colA} onChange={e=>setColA(e.target.value)} placeholder="Column for A (e.g., population)" />
              <button className="border rounded px-3" onClick={()=>doPeek(datasetA,colA)}>peek</button>
            </div>
          </div>

          {/* B side (hidden when scalar) */}
          <div className="border rounded p-3">
            <div className="flex items-center justify-between mb-1">
              <div className="font-semibold">Dataset B</div>
              <label className="text-xs flex items-center gap-2">
                <input type="checkbox" checked={useScalarB} onChange={e=>setUseScalarB(e.target.checked)} />
                Use scalar
              </label>
            </div>

            {!useScalarB ? (
              <>
                <select className="border rounded p-2 w-full" value={datasetB?.id || ""} onChange={e=>setB(datasets.find(d=>d.id==e.target.value) || null)}>
                  <option value="">Select dataset…</option>
                  {datasets.map(d=><option key={d.id} value={d.id}>[{d.source}] {d.title}</option>)}
                </select>
                <div className="flex gap-2 mt-2">
                  <input className="border rounded p-2 flex-1" value={colB} onChange={e=>setColB(e.target.value)} placeholder="Column for B (e.g., population)" />
                  <button className="border rounded px-3" onClick={()=>doPeek(datasetB,colB)}>peek</button>
                </div>
              </>
            ) : (
              <div className="flex gap-2">
                <input type="number" className="border rounded p-2 w-28" value={scalarB} onChange={e=>setScalarB(+e.target.value)} />
                <div className="text-xs text-gray-600 self-center">Scalar used as B</div>
              </div>
            )}
          </div>
        </div>

        {/* math + controls */}
        <div className="flex flex-wrap items-center gap-3">
          <select className="border rounded p-2" value={method} onChange={e=>setMethod(e.target.value)}>
            {["multiply","ratio","sum","difference"].map(m=><option key={m}>{m}</option>)}
          </select>
          <div className="text-xs text-gray-600">
            Derived = A.{colA} {symbol(method)} {useScalarB ? scalarB : `B.${colB}`} → {targetLevel}
          </div>
          <label className="ml-auto text-xs flex items-center gap-2">
            Decimals
            <input type="number" min={0} max={6} className="border rounded p-1 w-14" value={decimals} onChange={e=>setDecimals(+e.target.value)} />
          </label>
          <button onClick={previewJoin} className="bg-blue-600 text-white px-3 py-1 rounded">Preview</button>
        </div>

        {/* join preview (short, scrollable) */}
        <div className="max-h-44 overflow-y-auto border rounded">
          <table className="w-full text-xs">
            <thead className="bg-gray-100 sticky top-0">
              <tr><th className="text-left p-1">pcode</th><th className="text-left p-1">name</th><th className="text-right p-1">A</th><th className="text-right p-1">B</th><th className="text-right p-1">Derived</th></tr>
            </thead>
            <tbody>
              {previewRows.map((r:any,i:number)=>(
                <tr key={i} className="odd:bg-gray-50">
                  <td className="p-1">{r.out_pcode}</td>
                  <td className="p-1">{r.place_name}</td>
                  <td className="p-1 text-right">{r.a}</td>
                  <td className="p-1 text-right">{r.b}</td>
                  <td className="p-1 text-right">{typeof r.derived==="number" ? r.derived.toFixed(decimals) : r.derived}</td>
                </tr>
              ))}
              {!previewRows.length && <tr><td className="p-2 text-center text-gray-500" colSpan={5}>No preview yet</td></tr>}
            </tbody>
          </table>
        </div>

        {/* peek (tiny) */}
        {!!peekRows.length && (
          <div className="max-h-32 overflow-y-auto border rounded">
            <div className="text-xs font-semibold px-2 py-1 bg-gray-50">{peekTitle}</div>
            <table className="w-full text-xs">
              <thead className="bg-gray-100 sticky top-0">
                <tr><th className="text-left p-1">pcode</th><th className="text-left p-1">name</th><th className="text-right p-1">value</th></tr>
              </thead>
              <tbody>{peekRows.map((r:any, i:number)=>(
                <tr key={i} className="odd:bg-gray-50">
                  <td className="p-1">{r.pcode}</td>
                  <td className="p-1">{r.name}</td>
                  <td className="p-1 text-right">{r.population ?? r.value ?? ""}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}

        {/* taxonomy (categories checkable; show terms only when checked) */}
        <div>
          <div className="font-semibold mb-1">Taxonomy</div>
          <div className="grid grid-cols-4 gap-3">
            {Object.entries(taxonomy).map(([cat, terms]) => (
              <div key={cat} className="border rounded p-2">
                <label className="font-semibold text-sm flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={!!catChecked[cat]}
                    onChange={(e)=>{
                      const v = e.target.checked;
                      setCatChecked(s=>({...s,[cat]:v}));
                    }}
                  />
                  {cat}
                </label>
                {catChecked[cat] && (
                  <div className="mt-1 pl-3 space-y-1">
                    {terms.map(t => (
                      <label key={t} className="flex items-center gap-2 text-xs">
                        <input
                          type="checkbox"
                          checked={!!termChecked[cat]?.[t]}
                          onChange={(e)=>{
                            const v = e.target.checked;
                            setTermChecked(s=>{
                              const next = {...s};
                              next[cat] = {...(next[cat]||{}) , [t]: v};
                              return next;
                            });
                          }}
                        />
                        {t}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* footer */}
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="border rounded px-3 py-1">Cancel</button>
          <button onClick={save} className="bg-green-600 text-white rounded px-3 py-1">Save</button>
        </div>
      </div>
    </div>
  );
}

"use client";
import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";

type Method = "ratio" | "multiply" | "sum" | "difference";
type Source = "other" | "derived";
type DatasetOption = { id: string; title: string; source: Source; defaultCol?: string | null };
type TaxonomyMap = Record<string, string[]>;

export default function DerivedDatasetWizard({
  open,
  onClose,
  countryIso,
  editDataset = null,
}: {
  open: boolean;
  onClose: () => void;
  countryIso: string;
  editDataset?: any;
}) {
  const [datasets, setDatasets] = useState<DatasetOption[]>([]);
  const [datasetA, setDatasetA] = useState<DatasetOption | null>(null);
  const [datasetB, setDatasetB] = useState<DatasetOption | null>(null);
  const [colA, setColA] = useState(""), [colB, setColB] = useState("");
  const [method, setMethod] = useState<Method>("ratio");
  const [useScalarB, setUseScalarB] = useState(false);
  const [scalarB, setScalarB] = useState(1);
  const [title, setTitle] = useState(""), [desc, setDesc] = useState("");
  const [targetLevel, setTargetLevel] = useState("ADM3"), [decimals, setDecimals] = useState(2);
  const [normalizePercent, setNormalizePercent] = useState(false);
  const [preview, setPreview] = useState<any[]>([]);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [taxonomyMap, setTaxonomyMap] = useState<TaxonomyMap>({});
  const [taxonomy, setTaxonomy] = useState<Record<string, Set<string>>>({});
  const ACCENT = "#640811";

  // Load datasets
  useEffect(() => {
    if (!open) return;
    (async () => {
      const opts: DatasetOption[] = [];
      const { data: base } = await supabase
        .from("dataset_metadata")
        .select("id,title,country_iso")
        .eq("country_iso", countryIso);
      base?.forEach(d =>
        opts.push({ id: d.id, title: d.title, source: "other", defaultCol: "value" })
      );
      const { data: drv } = await supabase
        .from("derived_dataset_metadata")
        .select("id,title,country_iso")
        .eq("country_iso", countryIso);
      drv?.forEach(d =>
        opts.push({ id: d.id, title: d.title, source: "derived", defaultCol: "derived" })
      );
      setDatasets(opts.sort((a, b) => a.title.localeCompare(b.title)));
    })();
  }, [open, countryIso]);

  // Taxonomy
  useEffect(() => {
    if (!open) return;
    (async () => {
      const { data } = await supabase.from("taxonomy_terms").select("category,name");
      if (!data) return;
      const grouped: TaxonomyMap = {};
      data.forEach((x: any) => {
        if (!grouped[x.category]) grouped[x.category] = [];
        grouped[x.category].push(x.name);
      });
      setTaxonomyMap(grouped);
    })();
  }, [open]);

  const methodSymbol = useMemo(
    () => ({ ratio: "÷", multiply: "×", sum: "+", difference: "−" }[method]),
    [method]
  );
  const formula = useMemo(
    () => `A.${colA || "?"} ${methodSymbol} ${useScalarB ? scalarB : `B.${colB || "?"}`}`,
    [colA, colB, methodSymbol, useScalarB, scalarB]
  );

  async function previewJoin() {
    if (!datasetA || (!datasetB && !useScalarB)) return alert("Select Dataset A and (Dataset B or scalar).");
    setLoadingPreview(true);
    const { data, error } = await supabase.rpc("simulate_join_preview_autoaggregate", {
      p_table_a: datasetA.id,
      p_table_b: useScalarB ? null : datasetB?.id ?? null,
      p_col_a: colA || "value",
      p_col_b: useScalarB ? null : colB || "value",
      p_country_iso: countryIso,
      p_method: method,
      p_target_level: targetLevel,
      p_use_scalar_b: useScalarB,
      p_scalar_b_val: useScalarB ? scalarB : null,
      p_limit: 50,
      p_normalize_percent: normalizePercent,
    });
    setLoadingPreview(false);
    if (error) {
      alert("Preview error: " + error.message);
      return;
    }
    setPreview(data || []);
  }

  async function saveDerived() {
    if (!datasetA || (!datasetB && !useScalarB)) return alert("Select Dataset A and (Dataset B or scalar).");
    const cats = Object.keys(taxonomy);
    const terms = cats.flatMap(c => Array.from(taxonomy[c] || []));
    const { error } = await supabase.rpc("create_derived_dataset_v2", {
      p_country: countryIso,
      p_title: title || `Derived (${targetLevel})`,
      p_description: desc || null,
      p_admin_level: targetLevel,
      p_method: method,
      p_use_scalar_b: useScalarB,
      p_scalar_b_val: useScalarB ? scalarB : null,
      p_table_a: datasetA.id,
      p_table_b: useScalarB ? null : datasetB?.id ?? null,
      p_col_a: colA || "value",
      p_col_b: useScalarB ? null : colB || "value",
      p_formula: formula,
      p_target_level: targetLevel,
      p_taxonomy_categories: cats,
      p_taxonomy_terms: terms,
      p_decimals: decimals,
    });
    if (error) return alert("Save failed: " + error.message);
    alert("✅ Derived dataset saved.");
    onClose();
  }

  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-5 w-[95%] max-w-6xl max-h-[90vh] overflow-y-auto text-sm">
        <h2 className="text-lg font-semibold mb-3">Create Derived Dataset</h2>

        {/* Title / Level */}
        <div className="flex gap-2 mb-3">
          <input className="border p-1 flex-1 rounded" placeholder="Title" value={title} onChange={e => setTitle(e.target.value)} />
          <input className="border p-1 flex-1 rounded" placeholder="Description" value={desc} onChange={e => setDesc(e.target.value)} />
          <select className="border p-1 rounded" value={targetLevel} onChange={e => setTargetLevel(e.target.value)}>
            {["ADM0", "ADM1", "ADM2", "ADM3", "ADM4"].map(l => <option key={l}>{l}</option>)}
          </select>
        </div>

        {/* Datasets */}
        <div className="flex gap-2 mb-3">
          {(["A", "B"] as const).map(lbl =>
            !useScalarB || lbl === "A" ? (
              <select key={lbl} className="border p-1 rounded flex-1"
                value={(lbl === "A" ? datasetA : datasetB)?.id || ""}
                onChange={e => {
                  const d = datasets.find(x => x.id === e.target.value) || null;
                  if (lbl === "A") setDatasetA(d); else setDatasetB(d);
                  if (d?.defaultCol) lbl === "A" ? setColA(d.defaultCol) : setColB(d.defaultCol);
                }}>
                <option value="">Select Dataset {lbl}</option>
                <optgroup label="Base datasets">
                  {datasets.filter(d => d.source === "other").map(d =>
                    <option key={d.id} value={d.id}>{d.title}</option>
                  )}
                </optgroup>
                <optgroup label="Derived datasets">
                  {datasets.filter(d => d.source === "derived").map(d =>
                    <option key={d.id} value={d.id}>{d.title}</option>
                  )}
                </optgroup>
              </select>
            ) : null
          )}
        </div>

        {/* Columns */}
        <div className="flex gap-2 mb-3">
          <input className="border p-1 rounded w-40" value={colA} onChange={e => setColA(e.target.value)} placeholder="Column A" />
          {!useScalarB && (
            <input className="border p-1 rounded w-40" value={colB} onChange={e => setColB(e.target.value)} placeholder="Column B" />
          )}
          <label className="text-xs flex items-center gap-1 ml-auto">
            <input type="checkbox" checked={useScalarB} onChange={e => setUseScalarB(e.target.checked)} /> Use Scalar B
          </label>
          {useScalarB && (
            <input type="number" className="border p-1 rounded w-24 text-right"
              value={scalarB} onChange={e => setScalarB(parseFloat(e.target.value || "0"))} />
          )}
        </div>

        {/* Methods */}
        <div className="flex gap-2 mb-2">
          {(["ratio", "multiply", "sum", "difference"] as const).map(m => (
            <button key={m} onClick={() => setMethod(m)}
              className={`px-2 py-1 border rounded ${method === m ? "text-white" : ""}`}
              style={{ background: method === m ? ACCENT : "transparent", borderColor: "#e5e7eb" }}>
              {m}
            </button>
          ))}
          <label className="text-xs flex items-center gap-1 ml-3">
            <input type="checkbox" checked={normalizePercent} onChange={e => setNormalizePercent(e.target.checked)} /> Normalize %
          </label>
          <button onClick={previewJoin} className="ml-auto px-3 py-1 text-white rounded" style={{ background: ACCENT }}>
            {loadingPreview ? "Loading..." : "Preview"}
          </button>
        </div>

        <p className="text-xs italic mb-2">Derived = {formula}</p>

        {/* Preview table — ✅ correct nullish coalescing */}
        <div className="max-h-64 overflow-y-auto border rounded text-xs mb-4">
          <table className="w-full">
            <thead className="bg-gray-100">
              <tr>
                {(preview[0] ? Object.keys(preview[0]) : ["join_key", "place_name", "a", "b", "derived"])
                  .map((k: string) => (
                    <th key={k} className="p-1 text-left">{k}</th>
                  ))}
              </tr>
            </thead>
            <tbody>
              {preview.length === 0 ? (
                <tr><td colSpan={6} className="text-center italic text-gray-500 py-2">No preview data</td></tr>
              ) : (
                preview.map((r, i) => (
                  <tr key={i} className="border-t">
                    {Object.entries(r).map(([k, v], j) => (
                      <td key={j} className="p-1">{v ?? "—"}</td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-1 border rounded">Cancel</button>
          <button onClick={saveDerived} className="px-3 py-1 text-white rounded" style={{ background: ACCENT }}>Save</button>
        </div>
      </div>
    </div>
  );
}

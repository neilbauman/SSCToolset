"use client";
import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";

type Source = "core" | "gis" | "other" | "derived";
type Method = "ratio" | "multiply" | "sum" | "difference";

type DatasetOption = { id: string; title: string; source: Source; table: string; defaultCol?: string | null };
type TaxonomyMap = Record<string, string[]>;

type EditPayload = {
  id: string; title: string; description: string | null; admin_level: string; method: Method;
  use_scalar_b?: boolean | null; scalar_b_val?: number | null; table_a?: string | null; table_b?: string | null;
  col_a?: string | null; col_b?: string | null; decimals?: number | null; formula?: string | null;
  target_level?: string | null; taxonomy_categories?: string[]; taxonomy_terms?: string[]; is_parametric?: boolean;
};

type Props = { open: boolean; onClose: () => void; countryIso: string; editDataset?: EditPayload | null };
const ACCENT = "#640811";

export default function DerivedDatasetWizard({ open, onClose, countryIso, editDataset = null }: Props) {
  const [datasets, setDatasets] = useState<DatasetOption[]>([]);
  const [datasetA, setDatasetA] = useState<DatasetOption | null>(null);
  const [datasetB, setDatasetB] = useState<DatasetOption | null>(null);
  const [colA, setColA] = useState(""); const [colB, setColB] = useState("");
  const [method, setMethod] = useState<Method>("ratio");
  const [useScalarB, setUseScalarB] = useState(false); const [scalarB, setScalarB] = useState<number>(1);
  const [title, setTitle] = useState(""); const [desc, setDesc] = useState("");
  const [targetLevel, setTargetLevel] = useState("ADM3"); const [decimals, setDecimals] = useState(2);
  const [preview, setPreview] = useState<any[]>([]); const [loadingPreview, setLoadingPreview] = useState(false);
  const [taxonomyMap, setTaxonomyMap] = useState<TaxonomyMap>({});
  const [taxonomy, setTaxonomy] = useState<Record<string, Set<string>>>({});
  const [isParametric, setIsParametric] = useState(false);
  const [normalizePercent, setNormalizePercent] = useState(false);

  // ─── Load datasets dynamically ───
  useEffect(() => {
    if (!open) return;
    (async () => {
      const base: DatasetOption[] = [
        { id: "core-pop", title: "Population [core]", source: "core", table: "population_data", defaultCol: "population" },
        { id: "core-gis", title: "GIS [core]", source: "gis", table: "gis_features", defaultCol: "area_sqkm" },
      ];
      const { data: others } = await supabase.from("dataset_metadata")
        .select("id,title,country_iso").eq("country_iso", countryIso);
      if (others?.length) for (const d of others) {
        const table = `dataset_${d.id}`;
        const { data: tbl } = await supabase.from("pg_tables").select("tablename").eq("tablename", table).limit(1);
        base.push({
          id: d.id, title: d.title, source: "other",
          table: tbl?.length ? table : `dataset_values|${d.id}`, defaultCol: "value"
        });
      }
      const { data: derived } = await supabase.from("derived_dataset_metadata")
        .select("id,title").eq("country_iso", countryIso);
      if (derived?.length) derived.forEach(d => base.push({
        id: d.id, title: `Derived: ${d.title}`, source: "derived",
        table: `derived_${d.id}`, defaultCol: "derived"
      }));
      setDatasets(base);
    })();
  }, [open, countryIso]);

  // ─── Load taxonomy ───
  useEffect(() => {
    if (!open) return;
    (async () => {
      const { data } = await supabase.from("taxonomy_terms").select("category,name");
      if (!data) return;
      const grouped: TaxonomyMap = {}; data.forEach(({ category, name }) => {
        if (!grouped[category]) grouped[category] = []; grouped[category].push(name);
      }); setTaxonomyMap(grouped);
    })();
  }, [open]);

  // ─── Hydration ───
  useEffect(() => {
    if (!open) return;
    if (!editDataset) {
      setTitle(""); setDesc(""); setTargetLevel("ADM3"); setMethod("ratio");
      setUseScalarB(false); setScalarB(1); setColA(""); setColB(""); setDecimals(2);
      setDatasetA(null); setDatasetB(null); setPreview([]); setTaxonomy({});
      setIsParametric(false); setNormalizePercent(false); return;
    }
    setTitle(editDataset.title || ""); setDesc(editDataset.description || "");
    setTargetLevel(editDataset.target_level || editDataset.admin_level || "ADM3");
    setMethod((editDataset.method as Method) || "ratio");
    setUseScalarB(!!editDataset.use_scalar_b);
    setScalarB(editDataset.scalar_b_val ?? 1);
    setColA(editDataset.col_a || ""); setColB(editDataset.col_b || "");
    setDecimals(editDataset.decimals ?? 2);
    setIsParametric(!!editDataset.is_parametric);
    setNormalizePercent(!!(editDataset as any).normalize_percent);
    if (editDataset.taxonomy_categories?.length) {
      const map: Record<string, Set<string>> = {};
      editDataset.taxonomy_categories.forEach((c, i) =>
        map[c] = new Set(editDataset.taxonomy_terms?.filter((_, j) => j === i) ?? []));
      setTaxonomy(map);
    }
    if (datasets.length) {
      const A = datasets.find(d => d.table === editDataset.table_a);
      const B = datasets.find(d => d.table === editDataset.table_b);
      setDatasetA(A || null); setDatasetB(B || null);
    }
  }, [open, editDataset, datasets]);

  // ─── Helpers ───
  const methodSymbol = useMemo(() => ({ ratio: "÷", multiply: "×", sum: "+", difference: "−" }[method]), [method]);
  const computedFormula = useMemo(() => {
    const rhs = useScalarB ? String(scalarB) : `B.${colB}`; return `A.${colA} ${methodSymbol} ${rhs}`;
  }, [useScalarB, scalarB, colA, colB, methodSymbol]);
  const formatNumber = (v: number | null) =>
    v == null || isNaN(v) ? "" : v.toLocaleString(undefined, { maximumFractionDigits: decimals });
  const resolveTableName = (ds: DatasetOption | null) => {
    if (!ds) return null; if (ds.table.includes("|")) {
      const [, id] = ds.table.split("|");
      return `(select admin_pcode as pcode, admin_pcode as name, value from dataset_values where dataset_id='${id}')`;
    } return ds.table;
  };

  // ─── Preview ───
  async function previewJoin() {
    if (!datasetA || (!datasetB && !useScalarB)) { alert("Select Dataset A and B (or scalar)."); return; }
    const tableA = resolveTableName(datasetA); const tableB = useScalarB ? null : resolveTableName(datasetB);
    setLoadingPreview(true);
    const { data, error } = await supabase.rpc("simulate_join_preview_autoaggregate", {
      p_table_a: tableA, p_table_b: tableB, p_col_a: colA,
      p_col_b: useScalarB ? null : colB, p_country_iso: countryIso,
      p_method: method, p_target_level: targetLevel,
      p_use_scalar_b: useScalarB, p_scalar_b_val: useScalarB ? scalarB : null,
      p_normalize_percent: normalizePercent
    });
    setLoadingPreview(false);
    if (error) alert("Preview error: " + error.message); else setPreview(data || []);
  }

  // ─── Save ───
  async function saveDerived() {
    if (!datasetA || (!datasetB && !useScalarB)) { alert("Missing dataset selection."); return; }
    const cats = Object.keys(taxonomy); const terms = cats.flatMap(c => Array.from(taxonomy[c] || []));
    const payload = {
      p_country: countryIso, p_title: title || `Derived (${targetLevel})`, p_description: desc || null,
      p_admin_level: targetLevel, p_method: method, p_use_scalar_b: useScalarB,
      p_scalar_b_val: useScalarB ? scalarB : null,
      p_table_a: resolveTableName(datasetA), p_table_b: useScalarB ? null : resolveTableName(datasetB),
      p_col_a: colA, p_col_b: useScalarB ? null : colB, p_formula: computedFormula,
      p_target_level: targetLevel, p_taxonomy_categories: cats, p_taxonomy_terms: terms,
      p_decimals: decimals
    };
    const { error } = await supabase.rpc("create_derived_dataset_v2", payload);
    if (error) alert("Save failed: " + error.message); else { alert("✅ Derived dataset saved."); onClose(); }
  }

  if (!open) return null;

  // ─── UI ───
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-5 w-[95%] max-w-5xl max-h-[90vh] overflow-y-auto text-sm">
        <h2 className="text-lg font-semibold mb-3">{editDataset ? "Edit Derived Dataset" : "Create Derived Dataset"}</h2>
        <div className="flex gap-2 mb-3">
          <input className="border p-1 flex-1 rounded" placeholder="Title" value={title} onChange={e => setTitle(e.target.value)} />
          <input className="border p-1 flex-1 rounded" placeholder="Description" value={desc} onChange={e => setDesc(e.target.value)} />
          <select className="border p-1 rounded" value={targetLevel} onChange={e => setTargetLevel(e.target.value)}>
            {["ADM0", "ADM1", "ADM2", "ADM3", "ADM4"].map(l => <option key={l}>{l}</option>)}
          </select>
        </div>

        {/* A/B selection */}
        <div className="flex gap-2 mb-3">
          {(["A", "B"] as const).map(label => {
            const ds = label === "A" ? datasetA : datasetB;
            const setter = label === "A" ? setDatasetA : setDatasetB;
            if (label === "B" && useScalarB) return null;
            return (
              <select key={label} className="border p-1 rounded flex-1" value={ds?.id || ""}
                onChange={e => setter(datasets.find(d => d.id === e.target.value) || null)} disabled={!!editDataset}>
                <option value="">Select Dataset {label}</option>
                {["core", "gis", "other", "derived"].map(g => (
                  <optgroup key={g} label={g.toUpperCase()}>
                    {datasets.filter(d => d.source === g).map(d => (
                      <option key={d.id} value={d.id}>{d.title}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            );
          })}
        </div>

        {/* Columns & scalar */}
        <div className="flex gap-2 mb-3">
          <input className="border p-1 rounded w-40" value={colA} onChange={e => setColA(e.target.value)} placeholder="Column A" />
          {!useScalarB && <input className="border p-1 rounded w-40" value={colB} onChange={e => setColB(e.target.value)} placeholder="Column B" />}
          <label className="text-xs flex items-center gap-1 ml-auto">
            <input type="checkbox" checked={useScalarB} onChange={e => setUseScalarB(e.target.checked)} /> Use Scalar B
          </label>
          {useScalarB && <input type="number" className="border p-1 rounded w-24 text-right" value={scalarB} onChange={e => setScalarB(parseFloat(e.target.value || "0"))} />}
          <select className="border rounded text-xs p-1" value={decimals} onChange={e => setDecimals(parseInt(e.target.value))}>
            {[0, 1, 2, 3].map(d => <option key={d} value={d}>{d} dec</option>)}
          </select>
        </div>

        {/* Method & preview */}
        <div className="flex items-center gap-2 mb-2">
          {(["ratio", "multiply", "sum", "difference"] as const).map(m => (
            <button key={m} onClick={() => setMethod(m)} className={`px-2 py-1 border rounded ${method === m ? "text-white" : ""}`} style={{ background: method === m ? ACCENT : "transparent", borderColor: "#e5e7eb" }}>{m}</button>
          ))}
          <label className="text-xs flex items-center gap-1 ml-auto">
            <input type="checkbox" checked={normalizePercent} onChange={e => setNormalizePercent(e.target.checked)} /> Normalize %
          </label>
          <label className="text-xs flex items-center gap-1 ml-3">
            <input type="checkbox" checked={isParametric} onChange={e => setIsParametric(e.target.checked)} /> Parametric
          </label>
          <button onClick={previewJoin} className="ml-auto px-3 py-1 text-white rounded" style={{ background: ACCENT }}>
            {loadingPreview ? "Loading…" : "Preview"}
          </button>
        </div>

        <p className="text-xs italic mb-2">Derived = {computedFormula}</p>

        {/* Preview table */}
        <div className="max-h-52 overflow-y-auto border rounded text-xs mb-4">
          <table className="w-full">
            <thead className="bg-gray-100">
              <tr>{preview[0] && Object.keys(preview[0]).map(k => <th key={k} className="p-1 text-left">{k}</th>)}</tr>
            </thead>
            <tbody>
              {preview.length === 0 ? (
                <tr><td className="text-center italic text-gray-500 py-2" colSpan={6}>No preview data</td></tr>
              ) : preview.map((r, i) => (
                <tr key={i} className="border-t">{Object.entries(r).map(([k, v], j) => (
                  <td key={j} className="p-1">{typeof v === "number" ? formatNumber(v) : v?.toString() ?? "—"}</td>
                ))}</tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Taxonomy */}
        <h3 className="text-sm font-semibold mb-2">Assign Taxonomy</h3>
        <div className="grid grid-cols-4 gap-2 mb-4">
          {Object.keys(taxonomyMap).map(cat => {
            const isChecked = !!taxonomy[cat];
            return (
              <div key={cat} className="border rounded p-2">
                <label className="flex items-center gap-1 text-xs font-medium">
                  <input type="checkbox" checked={isChecked}
                    onChange={e => setTaxonomy(prev => {
                      const next = { ...prev };
                      if (e.target.checked) next[cat] = new Set<string>(); else delete next[cat];
                      return next;
                    })} />{cat}
                </label>
                {isChecked && (
                  <div className="ml-3 mt-1 max-h-24 overflow-y-auto">
                    {taxonomyMap[cat].map(term => (
                      <label key={term} className="flex items-center gap-1 text-xs">
                        <input type="checkbox" checked={!!taxonomy[cat]?.has(term)}
                          onChange={e => setTaxonomy(prev => {
                            const next = { ...prev }; if (!next[cat]) next[cat] = new Set<string>();
                            e.target.checked ? next[cat]!.add(term) : next[cat]!.delete(term); return next;
                          })} />{term}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-1 border rounded">Cancel</button>
          <button onClick={saveDerived} className="px-3 py-1 text-white rounded" style={{ background: ACCENT }}>
            {editDataset ? "Save Changes" : "Save Derived"}
          </button>
        </div>
      </div>
    </div>
  );
}

"use client";
import React, { useEffect, useMemo, useState, ChangeEvent } from "react";
import { X } from "lucide-react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";

type Method = "ratio" | "multiply" | "sum" | "difference";
type Source = "core" | "gis" | "other" | "derived";

interface DatasetOption {
  id: string;
  title: string;
  source: Source;
  table: string;
  defaultCol?: string;
}
interface EditPayload {
  id: string;
  title: string;
  description: string | null;
  admin_level: string;
  method: Method;
  use_scalar_b?: boolean | null;
  scalar_b_val?: number | null;
  table_a?: string | null;
  table_b?: string | null;
  col_a?: string | null;
  col_b?: string | null;
  decimals?: number | null;
  formula?: string | null;
  target_level?: string | null;
  taxonomy_categories?: string[];
  taxonomy_terms?: string[];
  normalize_percent?: boolean | null;
  is_parametric?: boolean | null;
}
interface Props {
  open: boolean;
  onClose: () => void;
  countryIso: string;
  editDataset?: EditPayload | null;
}

const ACCENT = "#640811";

export default function DerivedDatasetWizard({
  open,
  onClose,
  countryIso,
  editDataset = null,
}: Props) {
  const [datasets, setDatasets] = useState<DatasetOption[]>([]);
  const [datasetA, setDatasetA] = useState<DatasetOption | null>(null);
  const [datasetB, setDatasetB] = useState<DatasetOption | null>(null);
  const [colA, setColA] = useState("");
  const [colB, setColB] = useState("");
  const [method, setMethod] = useState<Method>("ratio");
  const [useScalarB, setUseScalarB] = useState(false);
  const [scalarB, setScalarB] = useState(1);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [targetLevel, setTargetLevel] = useState("ADM3");
  const [decimals, setDecimals] = useState(2);
  const [normalizePercent, setNormalizePercent] = useState(false);
  const [isParametric, setIsParametric] = useState(false);
  const [preview, setPreview] = useState<any[]>([]);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [taxonomyMap, setTaxonomyMap] = useState<Record<string, string[]>>({});
  const [taxonomy, setTaxonomy] = useState<Record<string, Set<string>>>({});

  // ---------- Load datasets ----------
  useEffect(() => {
    if (!open) return;
    (async () => {
      const base: DatasetOption[] = [
        { id: "core-pop", title: "Population [core]", source: "core", table: "population_data", defaultCol: "population" },
        { id: "core-gis", title: "GIS Features [core]", source: "gis", table: "gis_features", defaultCol: "area_sqkm" },
      ];
      const { data: others } = await supabase.from("dataset_metadata").select("id,title");
      others?.forEach((d) =>
        base.push({ id: d.id, title: d.title, source: "other", table: `dataset_values_${d.id}`, defaultCol: "value" })
      );
      const { data: derived } = await supabase.from("derived_dataset_metadata").select("id,title");
      derived?.forEach((d) =>
        base.push({ id: d.id, title: d.title, source: "derived", table: `derived_${d.id}`, defaultCol: "derived" })
      );
      setDatasets(base);
    })();
  }, [open, countryIso]);

  // ---------- Load taxonomy ----------
  useEffect(() => {
    if (!open) return;
    (async () => {
      const { data } = await supabase.from("taxonomy_terms").select("category,name");
      if (!data) return;
      const g: Record<string, string[]> = {};
      data.forEach(({ category, name }) => {
        if (!g[category]) g[category] = [];
        g[category].push(name);
      });
      setTaxonomyMap(g);
    })();
  }, [open]);

  // ---------- Hydrate edit ----------
  useEffect(() => {
    if (!open) return;
    if (!editDataset) {
      setTitle("");
      setDesc("");
      setTargetLevel("ADM3");
      setMethod("ratio");
      setUseScalarB(false);
      setScalarB(1);
      setColA("");
      setColB("");
      setDecimals(2);
      setDatasetA(null);
      setDatasetB(null);
      setPreview([]);
      setTaxonomy({});
      setIsParametric(false);
      return;
    }
    setTitle(editDataset.title || "");
    setDesc(editDataset.description || "");
    setTargetLevel(editDataset.target_level || "ADM3");
    setMethod(editDataset.method as Method || "ratio");
    setUseScalarB(!!editDataset.use_scalar_b);
    setScalarB(editDataset.scalar_b_val ?? 1);
    setColA(editDataset.col_a || "");
    setColB(editDataset.col_b || "");
    setDecimals(editDataset.decimals ?? 2);
    setIsParametric(!!editDataset.is_parametric);
    if (datasets.length > 0) {
      setDatasetA(
        datasets.find((d) => d.table === editDataset.table_a || d.id === editDataset.table_a) || null
      );
      setDatasetB(
        datasets.find((d) => d.table === editDataset.table_b || d.id === editDataset.table_b) || null
      );
    }
    if (editDataset.taxonomy_categories && editDataset.taxonomy_terms) {
      const n: Record<string, Set<string>> = {};
      editDataset.taxonomy_categories.forEach((cat) => {
        n[cat] = new Set(
          editDataset.taxonomy_terms?.filter((t) => taxonomyMap[cat]?.includes(t)) || []
        );
      });
      setTaxonomy(n);
    }
  }, [open, editDataset, datasets, taxonomyMap]);

  const symbol = useMemo(
    () => (method === "ratio" ? "÷" : method === "multiply" ? "×" : method === "sum" ? "+" : "−"),
    [method]
  );
  const formula = useMemo(
    () => `A.${colA} ${symbol} ${useScalarB ? scalarB : `B.${colB}`}`,
    [colA, colB, symbol, useScalarB, scalarB]
  );

  // ---------- Preview ----------
  async function previewJoin() {
    if (!datasetA || (!datasetB && !useScalarB))
      return alert("Select Dataset A and (Dataset B or scalar).");
    setLoadingPreview(true);
    const { data, error } = await supabase.rpc("simulate_join_preview_autoaggregate_simple", {
      p_dataset_a: datasetA.id,
      p_dataset_b: useScalarB ? null : datasetB?.id ?? null,
      p_col_a: colA || datasetA.defaultCol,
      p_col_b: useScalarB ? null : colB || datasetB?.defaultCol,
      p_country_iso: countryIso,
      p_method: method,
      p_target_level: targetLevel,
      p_use_scalar_b: useScalarB,
      p_scalar_b_val: useScalarB ? scalarB : null,
    });
    setLoadingPreview(false);
    if (error) return alert("Preview error: " + error.message);
    setPreview(data || []);
  }

  // ---------- Save ----------
  async function saveDerived() {
    if (!datasetA || (!datasetB && !useScalarB))
      return alert("Select Dataset A and (Dataset B or scalar).");
    const cats = Object.keys(taxonomy);
    const terms = cats.flatMap((c) => Array.from(taxonomy[c] || []));
    const payload = {
      p_country: countryIso,
      p_title: title || `Derived (${targetLevel})`,
      p_description: desc || null,
      p_admin_level: targetLevel,
      p_method: method,
      p_use_scalar_b: useScalarB,
      p_scalar_b_val: useScalarB ? scalarB : null,
      p_dataset_a: datasetA.id,
      p_dataset_b: useScalarB ? null : datasetB?.id ?? null,
      p_col_a: colA || datasetA.defaultCol,
      p_col_b: useScalarB ? null : colB || datasetB?.defaultCol,
      p_formula: formula,
      p_target_level: targetLevel,
      p_taxonomy_categories: cats,
      p_taxonomy_terms: terms,
      p_decimals: decimals,
      p_normalize_percent: normalizePercent,
      p_is_parametric: isParametric,
    };
    const { error } = await supabase.rpc("create_derived_dataset_v2", payload);
    if (error) return alert("Save failed: " + error.message);
    alert("✅ Saved successfully.");
    onClose();
  }

  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-5 w-[95%] max-w-6xl max-h-[90vh] overflow-y-auto text-sm">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-semibold">{editDataset ? "Edit Derived Dataset" : "Create Derived Dataset"}</h2>
          <button onClick={onClose}><X className="w-4 h-4 text-gray-500" /></button>
        </div>

        <div className="flex gap-2 mb-3">
          <input className="border p-1 flex-1 rounded" placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <input className="border p-1 flex-1 rounded" placeholder="Description" value={desc} onChange={(e) => setDesc(e.target.value)} />
          <select className="border p-1 rounded" value={targetLevel} onChange={(e) => setTargetLevel(e.target.value)}>
            {["ADM0", "ADM1", "ADM2", "ADM3", "ADM4"].map((l) => <option key={l}>{l}</option>)}
          </select>
        </div>

        <div className="flex gap-2 mb-3">
          {(["A", "B"] as const).map((lbl, i) =>
            !useScalarB || lbl === "A" ? (
              <select
                key={i}
                className="border p-1 rounded flex-1"
                value={(lbl === "A" ? datasetA?.id : datasetB?.id) || ""}
                onChange={(e) =>
                  lbl === "A"
                    ? setDatasetA(datasets.find((d) => d.id === e.target.value) || null)
                    : setDatasetB(datasets.find((d) => d.id === e.target.value) || null)
                }
              >
                <option value="">Select Dataset {lbl}</option>
                {["core", "gis", "other", "derived"].map((g) => (
                  <optgroup key={g} label={g.toUpperCase()}>
                    {datasets
                      .filter((d) => d.source === g)
                      .map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.title}
                        </option>
                      ))}
                  </optgroup>
                ))}
              </select>
            ) : null
          )}
        </div>

        <div className="flex flex-wrap gap-2 mb-3 items-center">
          <input className="border p-1 rounded w-40" value={colA} onChange={(e) => setColA(e.target.value)} placeholder="Column A" />
          {!useScalarB && (
            <input className="border p-1 rounded w-40" value={colB} onChange={(e) => setColB(e.target.value)} placeholder="Column B" />
          )}
          <label className="text-xs flex items-center gap-1 ml-auto">
            <input type="checkbox" checked={useScalarB} onChange={(e) => setUseScalarB(e.target.checked)} />Scalar B
          </label>
          {useScalarB && (
            <input
              type="number"
              className="border p-1 rounded w-24 text-right"
              value={scalarB}
              onChange={(e) => setScalarB(parseFloat(e.target.value || "0"))}
            />
          )}
          <select className="border rounded text-xs p-1" value={decimals} onChange={(e) => setDecimals(parseInt(e.target.value))}>
            {[0, 1, 2, 3].map((d) => (
              <option key={d}>{d} dec</option>
            ))}
          </select>
        </div>

        <div className="flex gap-2 mb-2 items-center flex-wrap">
          {(["ratio", "multiply", "sum", "difference"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMethod(m)}
              className={`px-2 py-1 border rounded ${method === m ? "text-white" : ""}`}
              style={{ background: method === m ? ACCENT : "transparent", borderColor: "#e5e7eb" }}
            >
              {m}
            </button>
          ))}
          <label className="text-xs flex items-center gap-1 ml-3">
            <input type="checkbox" checked={normalizePercent} onChange={(e) => setNormalizePercent(e.target.checked)} />Normalize %
          </label>
          <label className="text-xs flex items-center gap-1 ml-3">
            <input type="checkbox" checked={isParametric} onChange={(e) => setIsParametric(e.target.checked)} />Parametric
          </label>
          <button onClick={previewJoin} className="ml-auto px-3 py-1 text-white rounded" style={{ background: ACCENT }}>
            {loadingPreview ? "Loading..." : "Preview"}
          </button>
        </div>

        <p className="text-xs italic mb-2">Derived = {formula}</p>

        <div className="max-h-64 overflow-y-auto border rounded text-xs mb-4">
          <table className="w-full">
            <thead className="bg-gray-100 sticky top-0">
              <tr>{preview[0] && Object.keys(preview[0]).map((k) => <th key={k} className="p-1 text-left">{k}</th>)}</tr>
            </thead>
            <tbody>
              {preview.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center italic text-gray-500 py-2">
                    No preview data
                  </td>
                </tr>
              ) : (
                preview.map((r, i) => (
                  <tr key={i} className="border-t hover:bg-gray-50">
                    {Object.entries(r).map(([k, v], j) => (
                      <td key={j} className="p-1">
                        {v == null ? "—" : String(v)}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <h3 className="text-sm font-semibold mb-2">Assign Taxonomy</h3>
        <div className="overflow-x-auto mb-4">
          <div className="flex gap-3 min-w-max">
            {Object.keys(taxonomyMap).map((cat) => {
              const checked = !!taxonomy[cat];
              return (
                <div key={cat} className="border rounded p-2 min-w-[150px]">
                  <label className="flex items-center gap-1 text-xs font-medium">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) =>
                        setTaxonomy((p) => {
                          const n = { ...p };
                          if (e.target.checked) n[cat] = new Set<string>();
                          else delete n[cat];
                          return n;
                        })
                      }
                    />{" "}
                    {cat}
                  </label>
                  {checked && (
                    <div className="ml-2 mt-1 grid grid-cols-1">
                      {taxonomyMap[cat].map((term) => (
                        <label key={term} className="flex items-center gap-1 text-xs">
                          <input
                            type="checkbox"
                            checked={!!taxonomy[cat]?.has(term)}
                            onChange={(e) =>
                              setTaxonomy((p) => {
                                const n = { ...p };
                                if (!n[cat]) n[cat] = new Set<string>();
                                if (e.target.checked) n[cat]!.add(term);
                                else n[cat]!.delete(term);
                                return n;
                              })
                            }
                          />{" "}
                          {term}
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-1 border rounded">
            Cancel
          </button>
          <button onClick={saveDerived} className="px-3 py-1 text-white rounded" style={{ background: ACCENT }}>
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";

type Method = "ratio" | "multiply" | "sum" | "difference";
type Source = "core" | "base" | "derived";

type DatasetOption = {
  id: string;          // Either a UUID from dataset_metadata / derived_dataset_metadata, or a real table name for core
  title: string;
  source: Source;
  defaultCol?: string | null;
};

type TaxonomyMap = Record<string, string[]>;

type EditPayload = {
  id: string;
  title: string;
  description?: string | null;
  admin_level?: string | null;
  method?: Method | null;
  use_scalar_b?: boolean | null;
  scalar_b_val?: number | null;
  table_a?: string | null;
  table_b?: string | null;
  col_a?: string | null;
  col_b?: string | null;
  formula?: string | null;
  target_level?: string | null;
  decimals?: number | null;
  taxonomy_categories?: string[] | null;
  taxonomy_terms?: string[] | null;
  is_parametric?: boolean | null;
  normalize_percent?: boolean | null;
};

export default function DerivedDatasetWizard({
  open,
  onClose,
  countryIso,
  editDataset = null,
}: {
  open: boolean;
  onClose: () => void;
  countryIso: string;
  editDataset?: EditPayload | null;
}) {
  const ACCENT = "#640811";

  // State
  const [datasets, setDatasets] = useState<DatasetOption[]>([]);
  const [datasetA, setDatasetA] = useState<DatasetOption | null>(null);
  const [datasetB, setDatasetB] = useState<DatasetOption | null>(null);
  const [colA, setColA] = useState<string>("");
  const [colB, setColB] = useState<string>("");

  const [method, setMethod] = useState<Method>("ratio");
  const [useScalarB, setUseScalarB] = useState<boolean>(false);
  const [scalarB, setScalarB] = useState<number>(1);

  const [title, setTitle] = useState<string>("");
  const [desc, setDesc] = useState<string>("");
  const [targetLevel, setTargetLevel] = useState<string>("ADM3");
  const [decimals, setDecimals] = useState<number>(2);
  const [normalizePercent, setNormalizePercent] = useState<boolean>(false);

  const [preview, setPreview] = useState<any[]>([]);
  const [loadingPreview, setLoadingPreview] = useState<boolean>(false);

  const [taxonomyMap, setTaxonomyMap] = useState<TaxonomyMap>({});
  const [taxonomy, setTaxonomy] = useState<Record<string, Set<string>>>({});

  // Load dataset choices (Core -> Base -> Derived)
  useEffect(() => {
    if (!open) return;
    (async () => {
      // Core datasets: use real table names
      const core: DatasetOption[] = [
        { id: "population_data", title: "Population [core]", source: "core", defaultCol: "population" },
        { id: "gis_features", title: "GIS Features [core]", source: "core", defaultCol: "area_sqkm" },
      ];

      const options: DatasetOption[] = [...core];

      // Base (uploaded) datasets
      const { data: base } = await supabase
        .from("dataset_metadata")
        .select("id,title,country_iso")
        .eq("country_iso", countryIso);

      if (base) {
        base.forEach((d: any) =>
          options.push({ id: d.id, title: d.title, source: "base", defaultCol: "value" })
        );
      }

      // Derived datasets
      const { data: derived } = await supabase
        .from("derived_dataset_metadata")
        .select("id,title,country_iso")
        .eq("country_iso", countryIso);

      if (derived) {
        derived.forEach((d: any) =>
          options.push({ id: d.id, title: d.title, source: "derived", defaultCol: "derived" })
        );
      }

      // Sort alphabetically within the compiled list
      options.sort((a, b) => a.title.localeCompare(b.title));
      setDatasets(options);
    })();
  }, [open, countryIso]);

  // Load taxonomy (compact)
  useEffect(() => {
    if (!open) return;
    (async () => {
      const { data } = await supabase.from("taxonomy_terms").select("category,name");
      if (!data) return;
      const grouped: TaxonomyMap = {};
      for (const row of data as any[]) {
        const cat = row.category as string;
        const name = row.name as string;
        if (!grouped[cat]) grouped[cat] = [];
        grouped[cat].push(name);
      }
      // Optional: sort terms per category for compact UI
      for (const k of Object.keys(grouped)) grouped[k].sort((a, b) => a.localeCompare(b));
      setTaxonomyMap(grouped);
    })();
  }, [open]);

  // Hydrate fields when editing
  useEffect(() => {
    if (!open) return;
    if (!editDataset) {
      // fresh state
      setTitle("");
      setDesc("");
      setTargetLevel("ADM3");
      setMethod("ratio");
      setUseScalarB(false);
      setScalarB(1);
      setColA("");
      setColB("");
      setDecimals(2);
      setNormalizePercent(false);
      setDatasetA(null);
      setDatasetB(null);
      setPreview([]);
      setTaxonomy({});
      return;
    }

    // When datasets load, map table_a/table_b to options by id
    if (datasets.length === 0) return;

    setTitle(editDataset.title || "");
    setDesc(editDataset.description || "");
    setTargetLevel(editDataset.target_level || editDataset.admin_level || "ADM3");
    setMethod((editDataset.method || "ratio") as Method);
    setUseScalarB(!!editDataset.use_scalar_b);
    setScalarB(editDataset.scalar_b_val ?? 1);
    setColA(editDataset.col_a || "");
    setColB(editDataset.col_b || "");
    setDecimals(editDataset.decimals ?? 2);
    setNormalizePercent(!!editDataset.normalize_percent);

    const foundA =
      datasets.find((d) => d.id === (editDataset.table_a || "")) || null;
    const foundB =
      datasets.find((d) => d.id === (editDataset.table_b || "")) || null;

    setDatasetA(foundA);
    setDatasetB(foundB);

    // Taxonomy hydration (compact)
    const cats = (editDataset.taxonomy_categories || []) as string[];
    const terms = (editDataset.taxonomy_terms || []) as string[];
    if (cats.length > 0) {
      const next: Record<string, Set<string>> = {};
      cats.forEach((c) => (next[c] = new Set<string>()));
      terms.forEach((t) => {
        // Try to place term into the first category containing it
        const cat = Object.keys(taxonomyMap).find((c) =>
          (taxonomyMap[c] || []).includes(t)
        );
        if (cat) {
          if (!next[cat]) next[cat] = new Set<string>();
          next[cat].add(t);
        }
      });
      setTaxonomy(next);
    }
  }, [open, editDataset, datasets, taxonomyMap]);

  // Display formula
  const methodSymbol = useMemo(
    () => ({ ratio: "÷", multiply: "×", sum: "+", difference: "−" }[method]),
    [method]
  );

  const formula = useMemo(() => {
    const left = colA || (datasetA?.defaultCol || "?");
    const right = useScalarB
      ? String(scalarB)
      : `B.${colB || (datasetB?.defaultCol || "?")}`;
    return `A.${left} ${methodSymbol} ${right}`;
  }, [colA, colB, methodSymbol, useScalarB, scalarB, datasetA, datasetB]);

  // Preview
  async function previewJoin() {
    if (!datasetA || (!datasetB && !useScalarB)) {
      alert("Select Dataset A and (Dataset B or scalar).");
      return;
    }
    setLoadingPreview(true);
    const { data, error } = await supabase.rpc("simulate_join_preview_autoaggregate", {
      p_table_a: datasetA.id,
      p_table_b: useScalarB ? null : (datasetB ? datasetB.id : null),
      p_col_a: (colA || datasetA.defaultCol || "value"),
      p_col_b: useScalarB ? null : (colB || datasetB?.defaultCol || "value"),
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

  // Save
  async function saveDerived() {
    if (!datasetA || (!datasetB && !useScalarB)) {
      alert("Select Dataset A and (Dataset B or scalar).");
      return;
    }
    const cats = Object.keys(taxonomy);
    const terms = cats.flatMap((c) => Array.from(taxonomy[c] || []));
    const { error } = await supabase.rpc("create_derived_dataset_v2", {
      p_country: countryIso,
      p_title: title || `Derived (${targetLevel})`,
      p_description: desc || null,
      p_admin_level: targetLevel,
      p_method: method,
      p_use_scalar_b: useScalarB,
      p_scalar_b_val: useScalarB ? scalarB : null,
      p_table_a: datasetA.id,
      p_table_b: useScalarB ? null : (datasetB ? datasetB.id : null),
      p_col_a: (colA || datasetA.defaultCol || "value"),
      p_col_b: useScalarB ? null : (colB || datasetB?.defaultCol || "value"),
      p_formula: formula,
      p_target_level: targetLevel,
      p_taxonomy_categories: cats,
      p_taxonomy_terms: terms,
      p_decimals: decimals,
    });
    if (error) {
      alert("Save failed: " + error.message);
      return;
    }
    alert("✅ Derived dataset saved.");
    onClose();
  }

  if (!open) return null;

  // Helpers
  function renderDatasetSelect(label: "A" | "B") {
    const ds = label === "A" ? datasetA : datasetB;
    const setDs = label === "A" ? setDatasetA : setDatasetB;

    if (useScalarB && label === "B") return null;

    return (
      <select
        className="border p-1 rounded flex-1"
        value={ds?.id || ""}
        onChange={(e) => {
          const pick = datasets.find((d) => d.id === e.target.value) || null;
          setDs(pick);
          if (pick?.defaultCol) {
            if (label === "A") setColA((prev) => prev || pick.defaultCol || "");
            else setColB((prev) => prev || pick.defaultCol || "");
          }
        }}
      >
        <option value="">Select Dataset {label}</option>

        <optgroup label="Core datasets">
          {datasets
            .filter((d) => d.source === "core")
            .map((d) => (
              <option key={d.id} value={d.id}>
                {d.title}
              </option>
            ))}
        </optgroup>

        <optgroup label="Base datasets">
          {datasets
            .filter((d) => d.source === "base")
            .map((d) => (
              <option key={d.id} value={d.id}>
                {d.title}
              </option>
            ))}
        </optgroup>

        <optgroup label="Derived datasets">
          {datasets
            .filter((d) => d.source === "derived")
            .map((d) => (
              <option key={d.id} value={d.id}>
                {d.title}
              </option>
            ))}
        </optgroup>
      </select>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-5 w-[95%] max-w-6xl max-h-[90vh] overflow-y-auto text-sm">
        <h2 className="text-lg font-semibold mb-3">
          {editDataset ? "Edit Derived Dataset" : "Create Derived Dataset"}
        </h2>

        {/* Top meta row */}
        <div className="flex gap-2 mb-3">
          <input
            className="border p-1 flex-1 rounded"
            placeholder="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <input
            className="border p-1 flex-1 rounded"
            placeholder="Description"
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
          />
          <select
            className="border p-1 rounded"
            value={targetLevel}
            onChange={(e) => setTargetLevel(e.target.value)}
          >
            {["ADM0", "ADM1", "ADM2", "ADM3", "ADM4"].map((lvl) => (
              <option key={lvl}>{lvl}</option>
            ))}
          </select>
          <select
            className="border rounded text-xs p-1"
            value={decimals}
            onChange={(e) => setDecimals(parseInt(e.target.value))}
            title="Decimal places for derived values"
          >
            {[0, 1, 2, 3].map((d) => (
              <option key={d} value={d}>
                {d} dec
              </option>
            ))}
          </select>
        </div>

        {/* Dataset pickers */}
        <div className="flex gap-2 mb-3">
          {renderDatasetSelect("A")}
          {renderDatasetSelect("B")}
        </div>

        {/* Columns + scalar */}
        <div className="flex gap-2 mb-3">
          <input
            className="border p-1 rounded w-40"
            value={colA}
            onChange={(e) => setColA(e.target.value)}
            placeholder={`Column A${datasetA?.defaultCol ? ` (e.g. ${datasetA.defaultCol})` : ""}`}
          />
          {!useScalarB && (
            <input
              className="border p-1 rounded w-40"
              value={colB}
              onChange={(e) => setColB(e.target.value)}
              placeholder={`Column B${datasetB?.defaultCol ? ` (e.g. ${datasetB.defaultCol})` : ""}`}
            />
          )}
          <label className="text-xs flex items-center gap-1 ml-auto">
            <input
              type="checkbox"
              checked={useScalarB}
              onChange={(e) => setUseScalarB(e.target.checked)}
            />
            Use Scalar B
          </label>
          {useScalarB && (
            <input
              type="number"
              className="border p-1 rounded w-24 text-right"
              value={Number.isFinite(scalarB) ? scalarB : 0}
              onChange={(e) => setScalarB(parseFloat(e.target.value || "0"))}
            />
          )}
        </div>

        {/* Method row */}
        <div className="flex gap-2 mb-2">
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
            <input
              type="checkbox"
              checked={normalizePercent}
              onChange={(e) => setNormalizePercent(e.target.checked)}
            />
            Normalize %
          </label>
          <button
            onClick={previewJoin}
            className="ml-auto px-3 py-1 text-white rounded"
            style={{ background: ACCENT }}
          >
            {loadingPreview ? "Loading..." : "Preview"}
          </button>
        </div>

        <p className="text-xs italic mb-2 break-all">Derived = {formula}</p>

        {/* Preview: compact vertically with scroll */}
        <div className="max-h-56 overflow-y-auto border rounded text-xs mb-4">
          <table className="w-full">
            <thead className="bg-gray-100 sticky top-0">
              <tr>
                {(preview[0]
                  ? Object.keys(preview[0])
                  : ["join_key", "place_name", "a", "b", "derived"]
                ).map((k: string) => (
                  <th key={k} className="p-1 text-left whitespace-nowrap">
                    {k}
                  </th>
                ))}
              </tr>
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
                  <tr key={i} className="border-t">
                    {Object.entries(r).map(([k, v], j) => (
                      <td key={j} className="p-1 whitespace-nowrap">
                        {v !== null && v !== undefined ? String(v) : "-"}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Taxonomy: compact grid with internal scroll per category */}
        <h3 className="text-sm font-semibold mb-2">Assign Taxonomy</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-4">
          {Object.keys(taxonomyMap).map((cat) => {
            const checked = !!taxonomy[cat];
            return (
              <div key={cat} className="border rounded p-2 max-h-32 overflow-y-auto">
                <label className="flex items-center gap-1 text-xs font-medium mb-1">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => {
                      setTaxonomy((prev) => {
                        const next = { ...prev };
                        if (e.target.checked) next[cat] = new Set<string>();
                        else delete next[cat];
                        return next;
                      });
                    }}
                  />
                  {cat}
                </label>
                {checked && (
                  <div className="ml-3 space-y-1">
                    {(taxonomyMap[cat] || []).map((term) => (
                      <label key={term} className="flex items-center gap-1 text-xs">
                        <input
                          type="checkbox"
                          checked={!!taxonomy[cat]?.has(term)}
                          onChange={(e) => {
                            setTaxonomy((prev) => {
                              const next = { ...prev };
                              if (!next[cat]) next[cat] = new Set<string>();
                              if (e.target.checked) next[cat].add(term);
                              else next[cat].delete(term);
                              return next;
                            });
                          }}
                        />
                        {term}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-1 border rounded">
            Cancel
          </button>
          <button
            onClick={saveDerived}
            className="px-3 py-1 text-white rounded"
            style={{ background: ACCENT }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

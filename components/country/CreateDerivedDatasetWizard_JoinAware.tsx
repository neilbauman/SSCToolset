// components/country/CreateDerivedDatasetWizard_JoinAware.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";

type Source = "core" | "other" | "derived" | "gis";
type Method = "ratio" | "multiply" | "sum" | "difference";

type DatasetOption = {
  id: string;         // for selects
  title: string;      // label shown
  source: Source;     // grouping
  table: string;      // table to pass to RPCs
};

type EditPayload = {
  id: string;
  title: string;
  description: string | null;
  admin_level: string;
  method: Method;
  use_scalar_b?: boolean | null;
  scalar_b_val?: number | null;
  dataset_a_id?: string | null;
  dataset_b_id?: string | null;
  table_a?: string | null;
  table_b?: string | null;
  col_a?: string | null;
  col_b?: string | null;
  decimals?: number | null;
  formula?: string | null;
  is_parametric?: boolean | null;
  source_level?: string | null;
  target_level?: string | null;
  dynamic_resolution?: boolean | null;
  dependencies?: any;
  taxonomy_categories?: string[] | null;
  taxonomy_terms?: string[] | null;
  country_iso?: string | null;
};

type Props = {
  open: boolean;
  onClose: () => void;
  countryIso: string;
  editDataset?: EditPayload | null; // if provided, wizard pre-populates and updates
};

const ACCENT = "#640811";

export default function CreateDerivedDatasetWizard_JoinAware({
  open,
  onClose,
  countryIso,
  editDataset = null,
}: Props) {
  // ---------- options state ----------
  const [datasets, setDatasets] = useState<DatasetOption[]>([]);
  const [datasetA, setDatasetA] = useState<DatasetOption | null>(null);
  const [datasetB, setDatasetB] = useState<DatasetOption | null>(null);

  // columns
  const [colA, setColA] = useState("population");
  const [colB, setColB] = useState("area_sqkm");

  // math
  const [method, setMethod] = useState<Method>("ratio");
  const [decimals, setDecimals] = useState(3);

  // scalar mode
  const [useScalarB, setUseScalarB] = useState(false);
  const [scalarB, setScalarB] = useState<number>(1);
  const [scalarRollup, setScalarRollup] = useState(true); // aggregate scalar up to target

  // meta
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [targetLevel, setTargetLevel] = useState("ADM3");
  const [isParametric, setIsParametric] = useState(true);

  // taxonomy
  const [categoriesMap, setCategoriesMap] = useState<Record<string, string[]>>({});
  // taxonomy as sets to avoid dupes and keep toggles cheap
  const [taxonomy, setTaxonomy] = useState<Record<string, Set<string>>>({});

  // UI
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [preview, setPreview] = useState<
    { out_pcode: string | null; place_name: string | null; a: number | null; b: number | null; derived: number | null; completeness_warning: string | null }[]
  >([]);

  // ---------- load dataset options ----------
  useEffect(() => {
    if (!open) return;

    (async () => {
      const all: DatasetOption[] = [
        { id: "core-admin", title: "Administrative Units [core]", source: "core", table: "admin_units" },
        { id: "core-pop", title: "Population Data [core]", source: "core", table: "population_data" },
        { id: "core-gis", title: "GIS Features [core]", source: "gis", table: "gis_features" },
      ];

      // other datasets
      const { data: others } = await supabase
        .from("dataset_metadata")
        .select("id,title")
        .eq("country_iso", countryIso);

      if (others?.length) {
        for (const d of others) {
          all.push({
            id: d.id,
            title: d.title,
            source: "other",
            table: `dataset_${d.id}`,
          });
        }
      }

      // derived datasets
      const { data: derived } = await supabase
        .from("derived_dataset_metadata")
        .select("id,title")
        .eq("country_iso", countryIso);

      if (derived?.length) {
        for (const d of derived) {
          all.push({
            id: d.id,
            title: d.title,
            source: "derived",
            table: `derived_${d.id}`,
          });
        }
      }

      setDatasets(all);
    })();
  }, [open, countryIso]);

  // ---------- load taxonomy ----------
  useEffect(() => {
    if (!open) return;

    (async () => {
      const { data } = await supabase.from("taxonomy_terms").select("category,name");
      if (!data) return;

      const grouped: Record<string, string[]> = {};
      data.forEach(({ category, name }) => {
        if (!grouped[category]) grouped[category] = [];
        grouped[category].push(name);
      });
      setCategoriesMap(grouped);
    })();
  }, [open]);

  // ---------- if editing, hydrate ----------
  useEffect(() => {
    if (!open) return;
    if (!editDataset) {
      // defaults for new
      setTitle("");
      setDesc("");
      setTargetLevel("ADM3");
      setMethod("ratio");
      setUseScalarB(false);
      setScalarB(1);
      setScalarRollup(true);
      setIsParametric(true);
      setColA("population");
      setColB("area_sqkm");
      setDecimals(3);
      setDatasetA(null);
      setDatasetB(null);
      setPreview([]);
      setTaxonomy({});
      return;
    }

    // hydrate from editDataset
    setTitle(editDataset.title || "");
    setDesc(editDataset.description || "");
    setTargetLevel(editDataset.target_level || editDataset.admin_level || "ADM3");
    setMethod((editDataset.method as Method) || "ratio");
    setUseScalarB(!!editDataset.use_scalar_b);
    setScalarB(editDataset.scalar_b_val ?? 1);
    setIsParametric(editDataset.is_parametric ?? true);
    setDecimals(editDataset.decimals ?? 3);
    setScalarRollup(true); // default on when using scalar; we can’t infer from older records

    if (editDataset.col_a) setColA(editDataset.col_a);
    if (editDataset.col_b) setColB(editDataset.col_b);

    // best-effort match of tables to options
    if (editDataset.table_a) {
      const foundA = datasets.find((d) => d.table === editDataset.table_a);
      setDatasetA(foundA || null);
    }
    if (editDataset.table_b) {
      const foundB = datasets.find((d) => d.table === editDataset.table_b);
      setDatasetB(foundB || null);
    }

    // taxonomy
    const catArr = editDataset.taxonomy_categories || [];
    const termArr = editDataset.taxonomy_terms || [];
    const next: Record<string, Set<string>> = {};
    for (const cat of catArr) next[cat] = new Set<string>();
    for (const t of termArr) {
      // place into first category that has the term; if none, create loose "Uncategorized"
      let placed = false;
      for (const cat of Object.keys(categoriesMap)) {
        if (categoriesMap[cat]?.includes(t)) {
          if (!next[cat]) next[cat] = new Set<string>();
          next[cat].add(t);
          placed = true;
          break;
        }
      }
      if (!placed) {
        if (!next["Uncategorized"]) next["Uncategorized"] = new Set<string>();
        next["Uncategorized"].add(t);
      }
    }
    setTaxonomy(next);
  }, [open, editDataset, datasets, categoriesMap]);

  // ---------- helpers ----------
  const methodSymbol = useMemo(() => {
    switch (method) {
      case "ratio":
        return "÷";
      case "multiply":
        return "×";
      case "sum":
        return "+";
      case "difference":
        return "−";
    }
  }, [method]);

  const computedFormula = useMemo(() => {
    const rhs = useScalarB ? String(scalarB) : `B.${colB}`;
    return `A.${colA} ${methodSymbol} ${rhs}`;
  }, [useScalarB, scalarB, colA, colB, methodSymbol]);

  // ---------- preview ----------
  async function previewJoin() {
    if (!datasetA || (!datasetB && !useScalarB)) {
      alert("Select Dataset A and (Dataset B or a scalar).");
      return;
    }
    setLoadingPreview(true);

    const { data, error } = await supabase.rpc("simulate_join_preview_autoaggregate", {
      p_table_a: datasetA.table,
      p_table_b: useScalarB ? null : datasetB?.table ?? null,
      p_country: countryIso,
      p_target_level: targetLevel,
      p_method: method,
      p_col_a: colA,
      p_col_b: useScalarB ? null : colB,
      p_use_scalar_b: useScalarB,
      p_scalar_b_val: useScalarB ? scalarB : null,
      p_is_parametric: isParametric,
      p_scalar_rollup: useScalarB ? scalarRollup : null,
    });

    setLoadingPreview(false);
    if (error) {
      alert("Preview error: " + error.message);
      return;
    }
    setPreview((data as any[]) || []);
  }

  // ---------- save ----------
  async function saveDerived() {
    if (!datasetA || (!datasetB && !useScalarB)) {
      alert("Select Dataset A and (Dataset B or a scalar).");
      return;
    }

    const txCategories = Object.keys(taxonomy);
    const txTerms = txCategories.flatMap((c) => Array.from(taxonomy[c] || []));

    const payload: Record<string, any> = {
      p_country_iso: countryIso,
      p_title:
        title ||
        (method === "ratio"
          ? `Ratio (${targetLevel})`
          : `${method[0].toUpperCase()}${method.slice(1)} (${targetLevel})`),
      p_description: desc || null,
      p_admin_level: targetLevel,
      p_table_a: datasetA.table,
      p_table_b: useScalarB ? null : datasetB?.table ?? null,
      p_col_a: colA,
      p_col_b: useScalarB ? null : colB,
      p_use_scalar_b: useScalarB,
      p_scalar_b_val: useScalarB ? scalarB : null,
      p_method: method,
      p_decimals: decimals,
      p_taxonomy_categories: txCategories,
      p_taxonomy_terms: txTerms,
      p_formula: computedFormula,
      p_is_parametric: isParametric,
      p_scalar_rollup: useScalarB ? scalarRollup : null,
    };

    // if editing, pass the record id to update
    if (editDataset?.id) payload.p_existing_id = editDataset.id;

    const { error } = await supabase.rpc("create_derived_dataset", payload);
    if (error) {
      alert("Save failed: " + error.message);
      return;
    }
    alert(editDataset ? "✅ Changes saved." : "✅ Derived dataset created.");
    onClose();
  }

  if (!open) return null;

  // ---------- UI ----------
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-5 w-[95%] max-w-5xl max-h-[90vh] overflow-y-auto text-sm">
        <h2 className="text-lg font-semibold mb-3">Create Derived Dataset</h2>

        {/* Title / Description / Target Level */}
        <div className="flex flex-wrap gap-2 mb-3">
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
        </div>

        {/* Dataset pickers */}
        <div className="flex flex-wrap gap-2 mb-2">
          <div className="flex-1">
            <label className="font-medium text-xs">Dataset A</label>
            <select
              className="border p-1 rounded w-full"
              value={datasetA?.id || ""}
              onChange={(e) =>
                setDatasetA(datasets.find((x) => x.id === e.target.value) || null)
              }
            >
              <option value="">Select Dataset A</option>
              {(["core", "gis", "other", "derived"] as const).map((group) => (
                <optgroup key={group} label={group.toUpperCase()}>
                  {datasets
                    .filter((d) => d.source === group)
                    .map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.title}
                      </option>
                    ))}
                </optgroup>
              ))}
            </select>
          </div>

          {!useScalarB && (
            <div className="flex-1">
              <label className="font-medium text-xs">Dataset B</label>
              <select
                className="border p-1 rounded w-full"
                value={datasetB?.id || ""}
                onChange={(e) =>
                  setDatasetB(datasets.find((x) => x.id === e.target.value) || null)
                }
              >
                <option value="">Select Dataset B</option>
                {(["core", "gis", "other", "derived"] as const).map((group) => (
                  <optgroup key={group} label={group.toUpperCase()}>
                    {datasets
                      .filter((d) => d.source === group)
                      .map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.title}
                        </option>
                      ))}
                  </optgroup>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Columns + Scalar + Parametric */}
        <div className="flex flex-wrap items-end gap-3 mb-2">
          <div>
            <label className="text-xs font-medium">Column A</label>
            <input
              className="border p-1 rounded w-40"
              value={colA}
              onChange={(e) => setColA(e.target.value)}
              placeholder="e.g., population"
            />
          </div>

          {!useScalarB && (
            <div>
              <label className="text-xs font-medium">Column B</label>
              <input
                className="border p-1 rounded w-40"
                value={colB}
                onChange={(e) => setColB(e.target.value)}
                placeholder="e.g., area_sqkm"
              />
            </div>
          )}

          <div className="flex items-center gap-2">
            <label className="text-xs">
              <input
                type="checkbox"
                checked={useScalarB}
                onChange={(e) => setUseScalarB(e.target.checked)}
              />{" "}
              Use scalar B
            </label>
            {useScalarB && (
              <>
                <input
                  type="number"
                  value={Number.isFinite(scalarB) ? scalarB : 0}
                  onChange={(e) =>
                    setScalarB(parseFloat(e.target.value || "0"))
                  }
                  className="border rounded w-24 text-right p-1"
                />
                <label className="text-xs">
                  <input
                    type="checkbox"
                    checked={scalarRollup}
                    onChange={(e) => setScalarRollup(e.target.checked)}
                  />{" "}
                  Aggregate scalar up to target
                </label>
              </>
            )}
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <label className="text-xs">
              <input
                type="checkbox"
                checked={isParametric}
                onChange={(e) => setIsParametric(e.target.checked)}
              />{" "}
              Parametric
            </label>

            <select
              className="border rounded text-xs p-1"
              value={decimals}
              onChange={(e) => setDecimals(parseInt(e.target.value))}
              title="Decimals"
            >
              {[0, 1, 2, 3].map((d) => (
                <option key={d} value={d}>
                  {d} dec
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Method + Preview */}
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs">Method:</span>
          {(["ratio", "multiply", "sum", "difference"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMethod(m)}
              className={`px-2 py-1 border rounded ${
                method === m ? "text-white" : ""
              }`}
              style={{
                background: method === m ? ACCENT : "transparent",
                borderColor: "#e5e7eb",
              }}
            >
              {m}
            </button>
          ))}
          <button
            onClick={previewJoin}
            className="ml-auto px-3 py-1 text-white rounded"
            style={{ background: ACCENT }}
          >
            {loadingPreview ? "Loading..." : "Preview"}
          </button>
        </div>

        <p className="text-xs italic mb-2">
          Derived = {computedFormula}
        </p>

        {/* Preview Table */}
        <div className="max-h-56 overflow-y-auto border rounded mb-4 text-xs">
          <table className="w-full">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-1 text-left">Pcode</th>
                <th className="p-1 text-left">Name</th>
                <th className="p-1 text-right">A</th>
                <th className="p-1 text-right">B</th>
                <th className="p-1 text-right">Derived</th>
                <th className="p-1 text-left">Note</th>
              </tr>
            </thead>
            <tbody>
              {preview.map((r, i) => (
                <tr key={i} className="border-t">
                  <td className="p-1">{r.out_pcode ?? ""}</td>
                  <td className="p-1">{r.place_name ?? ""}</td>
                  <td className="p-1 text-right">
                    {r.a === null || r.a === undefined ? "" : r.a}
                  </td>
                  <td className="p-1 text-right">
                    {r.b === null || r.b === undefined ? "" : r.b}
                  </td>
                  <td className="p-1 text-right">
                    {r.derived === null || r.derived === undefined
                      ? ""
                      : Number.isFinite(r.derived)
                      ? r.derived?.toFixed(Math.min(6, Math.max(0, decimals)))
                      : r.derived}
                  </td>
                  <td className="p-1">{r.completeness_warning ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Taxonomy */}
        <h3 className="text-sm font-semibold mb-2">Assign Taxonomy</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {Object.keys(categoriesMap).map((cat) => {
            const isChecked = !!taxonomy[cat];
            return (
              <div key={cat} className="border rounded p-2">
                <label className="flex items-center gap-1 text-xs font-medium">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={(e) =>
                      setTaxonomy((prev) => {
                        const next = { ...prev };
                        if (e.target.checked) {
                          if (!next[cat]) next[cat] = new Set<string>();
                        } else {
                          delete next[cat];
                        }
                        return next;
                      })
                    }
                  />{" "}
                  {cat}
                </label>
                {isChecked && (
                  <div className="ml-3 mt-1 grid grid-cols-1">
                    {categoriesMap[cat].map((term) => (
                      <label key={term} className="flex items-center gap-1 text-xs">
                        <input
                          type="checkbox"
                          checked={!!taxonomy[cat]?.has(term)}
                          onChange={(e) =>
                            setTaxonomy((prev) => {
                              const next = { ...prev };
                              if (!next[cat]) next[cat] = new Set<string>();
                              if (e.target.checked) next[cat]!.add(term);
                              else next[cat]!.delete(term);
                              return next;
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

        {/* Footer */}
        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onClose} className="px-3 py-1 border rounded">
            Cancel
          </button>
          <button
            onClick={saveDerived}
            className="px-3 py-1 text-white rounded"
            style={{ background: ACCENT }}
          >
            {editDataset ? "Save Changes" : "Save Derived"}
          </button>
        </div>
      </div>
    </div>
  );
}

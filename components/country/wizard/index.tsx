"use client";

import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";

type Source = "other" | "derived";
type Method = "ratio" | "multiply" | "sum" | "difference";
type DatasetOption = {
  id: string;                 // UUID (canonical) — used for RPCs
  title: string;              // Human title
  source: Source;             // "other" (dataset_metadata) or "derived" (derived_dataset_metadata)
  defaultCol?: string | null; // Optional hint for UI
};
type TaxonomyMap = Record<string, string[]>;

type EditPayload = {
  id: string;
  title: string;
  description: string | null;
  admin_level: string;
  method: Method;
  use_scalar_b?: boolean | null;
  scalar_b_val?: number | null;
  table_a?: string | null;     // stored as UUID or title in metadata; we map it to option.id
  table_b?: string | null;
  col_a?: string | null;
  col_b?: string | null;
  decimals?: number | null;
  formula?: string | null;
  target_level?: string | null;
  taxonomy_categories?: string[];
  taxonomy_terms?: string[];
  is_parametric?: boolean | null;
  normalize_percent?: boolean | null;
};

type Props = {
  open: boolean;
  onClose: () => void;
  countryIso: string;           // ISO3 code used by RPCs
  editDataset?: EditPayload | null;
};

const ACCENT = "#640811";

export default function DerivedDatasetWizard({ open, onClose, countryIso, editDataset = null }: Props) {
  const [datasets, setDatasets] = useState<DatasetOption[]>([]);
  const [datasetA, setDatasetA] = useState<DatasetOption | null>(null);
  const [datasetB, setDatasetB] = useState<DatasetOption | null>(null);

  const [colA, setColA] = useState("");
  const [colB, setColB] = useState("");

  const [method, setMethod] = useState<Method>("ratio");
  const [useScalarB, setUseScalarB] = useState(false);
  const [scalarB, setScalarB] = useState<number>(1);

  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");

  const [targetLevel, setTargetLevel] = useState("ADM3");
  const [decimals, setDecimals] = useState(2);
  const [isParametric, setIsParametric] = useState(true);
  const [normalizePercent, setNormalizePercent] = useState(false);

  const [preview, setPreview] = useState<any[]>([]);
  const [loadingPreview, setLoadingPreview] = useState(false);

  const [taxonomyMap, setTaxonomyMap] = useState<TaxonomyMap>({});
  const [taxonomy, setTaxonomy] = useState<Record<string, Set<string>>>({});

  // Load datasets from DB (only real ones)
  useEffect(() => {
    if (!open) return;
    (async () => {
      const options: DatasetOption[] = [];

      // Base datasets (dataset_metadata)
      const { data: base, error: baseErr } = await supabase
        .from("dataset_metadata")
        .select("id,title,country_iso")
        .eq("country_iso", countryIso);

      if (baseErr) {
        console.error(baseErr);
      } else {
        base?.forEach((d) => {
          options.push({
            id: d.id,
            title: d.title,
            source: "other",
            defaultCol: "value",
          });
        });
      }

      // Derived datasets (derived_dataset_metadata)
      const { data: derived, error: drvErr } = await supabase
        .from("derived_dataset_metadata")
        .select("id,title,country_iso")
        .eq("country_iso", countryIso);

      if (drvErr) {
        console.error(drvErr);
      } else {
        derived?.forEach((d) => {
          options.push({
            id: d.id,
            title: d.title,
            source: "derived",
            defaultCol: "derived",
          });
        });
      }

      // Sort for a nicer UX
      options.sort((a, b) => a.title.localeCompare(b.title));
      setDatasets(options);
    })();
  }, [open, countryIso]);

  // Load taxonomy terms
  useEffect(() => {
    if (!open) return;
    (async () => {
      const { data, error } = await supabase
        .from("taxonomy_terms")
        .select("category,name");

      if (error) {
        console.error(error);
        return;
      }
      if (!data) return;

      const grouped: TaxonomyMap = {};
      data.forEach(({ category, name }: any) => {
        if (!grouped[category]) grouped[category] = [];
        grouped[category].push(name);
      });
      setTaxonomyMap(grouped);
    })();
  }, [open]);

  // Hydrate editor state when editing an existing derived dataset
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
      setIsParametric(true);
      setNormalizePercent(false);
      return;
    }

    setTitle(editDataset.title || "");
    setDesc(editDataset.description || "");
    setTargetLevel(editDataset.target_level || editDataset.admin_level || "ADM3");
    setMethod((editDataset.method as Method) || "ratio");
    setUseScalarB(!!editDataset.use_scalar_b);
    setScalarB(editDataset.scalar_b_val ?? 1);
    setColA(editDataset.col_a || "");
    setColB(editDataset.col_b || "");
    setDecimals(editDataset.decimals ?? 2);
    setIsParametric(!!editDataset.is_parametric);
    setNormalizePercent(!!editDataset.normalize_percent);

    if (datasets.length > 0) {
      // edit payload might store table_a/table_b as UUID or Title.
      // We attempt to match by id first, else by title.
      const foundA = datasets.find(
        (d) => d.id === editDataset.table_a || d.title === editDataset.table_a
      );
      const foundB = datasets.find(
        (d) => d.id === editDataset.table_b || d.title === editDataset.table_b
      );
      setDatasetA(foundA || null);
      setDatasetB(foundB || null);
    }
  }, [open, editDataset, datasets]);

  // Derivation string
  const methodSymbol = useMemo(
    () => (method === "ratio" ? "÷" : method === "multiply" ? "×" : method === "sum" ? "+" : "−"),
    [method]
  );
  const computedFormula = useMemo(
    () => `A.${colA || "?"} ${methodSymbol} ${useScalarB ? scalarB : `B.${colB || "?"}`}`,
    [useScalarB, scalarB, colA, colB, methodSymbol]
  );

  // Helper to default column inputs when selecting datasets
  useEffect(() => {
    if (datasetA && !colA) setColA(datasetA.defaultCol || "value");
  }, [datasetA]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (datasetB && !colB) setColB(datasetB.defaultCol || "value");
  }, [datasetB]); // eslint-disable-line react-hooks/exhaustive-deps

  // Preview
  async function previewJoin() {
    if (!datasetA || (!datasetB && !useScalarB)) {
      alert("Select Dataset A and (Dataset B or scalar).");
      return;
    }
    setLoadingPreview(true);

    const { data, error } = await supabase.rpc("simulate_join_preview_autoaggregate", {
      // IMPORTANT: pass canonical IDs the RPC expects (UUID or title)
      p_table_a: datasetA.id,
      p_table_b: useScalarB ? null : datasetB?.id ?? null,
      p_col_a: colA || "value",
      p_col_b: useScalarB ? null : (colB || "value"),
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
      console.error(error);
      setPreview([]);
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

    const payload = {
      p_country: countryIso,
      p_title: title || `Derived (${targetLevel})`,
      p_description: desc || null,
      p_admin_level: targetLevel,
      p_method: method,
      p_use_scalar_b: useScalarB,
      p_scalar_b_val: useScalarB ? scalarB : null,
      // Persist IDs or titles — RPC resolves both via dataset_metadata
      p_table_a: datasetA.id,
      p_table_b: useScalarB ? null : datasetB?.id ?? null,
      p_col_a: colA || "value",
      p_col_b: useScalarB ? null : (colB || "value"),
      p_formula: computedFormula,
      p_target_level: targetLevel,
      p_taxonomy_categories: cats,
      p_taxonomy_terms: terms,
      p_decimals: decimals,
    };

    const { error } = await supabase.rpc("create_derived_dataset_v2", payload);
    if (error) {
      alert("Save failed: " + error.message);
      console.error(error);
      return;
    }
    alert("✅ Derived dataset saved.");
    onClose();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-5 w-[95%] max-w-6xl max-h-[90vh] overflow-y-auto text-sm">
        <h2 className="text-lg font-semibold mb-3">
          {editDataset ? "Edit Derived Dataset" : "Create Derived Dataset"}
        </h2>

        {/* Title / Description / Target Level */}
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
        </div>

        {/* Dataset pickers */}
        <div className="flex gap-2 mb-3">
          {([
            ["A", datasetA, setDatasetA],
            ["B", datasetB, setDatasetB],
          ] as [string, DatasetOption | null, React.Dispatch<React.SetStateAction<DatasetOption | null>>][]).map(
            ([label, ds, setter], i) =>
              !useScalarB || label === "A" ? (
                <select
                  key={i}
                  className="border p-1 rounded flex-1"
                  value={(ds as any)?.id || ""}
                  onChange={(e) => {
                    const next = datasets.find((d) => d.id === e.target.value) || null;
                    setter(next);
                    if (label === "A" && next?.defaultCol && !colA) setColA(next.defaultCol);
                    if (label === "B" && next?.defaultCol && !colB) setColB(next.defaultCol);
                  }}
                  disabled={!!editDataset}
                >
                  <option value="">Select Dataset {label}</option>
                  <optgroup label="Base datasets">
                    {datasets
                      .filter((d) => d.source === "other")
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
              ) : null
          )}
        </div>

        {/* Columns, method, scalar mode, decimals */}
        <div className="flex gap-2 mb-3">
          <input
            className="border p-1 rounded w-40"
            value={colA}
            onChange={(e) => setColA(e.target.value)}
            placeholder="Column A (e.g. value)"
          />
          {!useScalarB && (
            <input
              className="border p-1 rounded w-40"
              value={colB}
              onChange={(e) => setColB(e.target.value)}
              placeholder="Column B (e.g. value)"
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
              onChange={(e) =>
                setScalarB(Number.isFinite(parseFloat(e.target.value)) ? parseFloat(e.target.value) : 0)
              }
            />
          )}
          <select
            className="border rounded text-xs p-1"
            value={decimals}
            onChange={(e) => setDecimals(parseInt(e.target.value))}
          >
            {[0, 1, 2, 3].map((d) => (
              <option key={d} value={d}>
                {d} dec
              </option>
            ))}
          </select>
        </div>

        {/* Method / Flags / Preview */}
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
              checked={isParametric}
              onChange={(e) => setIsParametric(e.target.checked)}
            />
            Parametric
          </label>
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

        <p className="text-xs italic mb-2">Derived = {computedFormula}</p>

        {/* Preview table */}
        <div className="max-h-64 overflow-y-auto border rounded text-xs mb-4">
          <table className="w-full">
            <thead className="bg-gray-100">
              <tr>
                {preview[0]
                  ? Object.keys(preview[0]).map((k) => (
                      <th key={k} className="p-1 text-left">
                        {k}
                      </th>
                    ))
                  : ["join_key", "place_name", "a", "b", "derived"].map((k) => (
                      <th key={k} className="p-1 text-left">
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
                      <td key={j} className="p-1">
                        {v ?? "—"}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Taxonomy */}
        <h3 className="text-sm font-semibold mb-2">Assign Taxonomy</h3>
        <div className="grid grid-cols-3 gap-2 mb-4">
          {Object.keys(taxonomyMap).map((cat) => {
            const checked = !!taxonomy[cat];
            return (
              <div key={cat} className="border rounded p-2">
                <label className="flex items-center gap-1 text-xs font-medium">
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
                  />{" "}
                  {cat}
                </label>
                {checked && (
                  <div className="ml-3 mt-1 grid grid-cols-1">
                    {taxonomyMap[cat].map((term) => (
                      <label key={term} className="flex items-center gap-1 text-xs">
                        <input
                          type="checkbox"
                          checked={!!taxonomy[cat]?.has(term)}
                          onChange={(e) => {
                            setTaxonomy((prev) => {
                              const next = { ...prev };
                              if (!next[cat]) next[cat] = new Set<string>();
                              if (e.target.checked) next[cat]!.add(term);
                              else next[cat]!.delete(term);
                              return next;
                            });
                          }}
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

        {/* Actions */}
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

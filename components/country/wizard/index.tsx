"use client";

import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";

/** ──────────────────────────────────────────────────────────────────────────
 *  Types
 *  ────────────────────────────────────────────────────────────────────────── */
type Source = "core" | "other" | "derived" | "gis";
type Method = "ratio" | "multiply" | "sum" | "difference";

type DatasetOption = {
  id: string;              // "core-pop" | "core-gis" | <uuid>
  title: string;
  source: Source;
  table: string;           // table name for client display (dataset_<uuid> or core table)
  defaultCol?: string | null;
};

type TaxonomyMap = Record<string, string[]>;

type EditPayload = {
  id: string;
  title: string;
  description: string | null;
  admin_level: string;
  method: string;          // be forgiving on input shape
  use_scalar_b?: boolean | null;
  scalar_b_val?: number | null;
  table_a?: string | null; // real table names
  table_b?: string | null;
  col_a?: string | null;
  col_b?: string | null;
  target_level?: string | null;
  decimals?: number | null;
};

type Props = {
  open: boolean;
  onClose: () => void;
  countryIso: string;
  editDataset?: EditPayload | null;
};

const ACCENT = "#640811";
const isUUID = (s: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);

/** ──────────────────────────────────────────────────────────────────────────
 *  Component
 *  ────────────────────────────────────────────────────────────────────────── */
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
  const [targetLevel, setTargetLevel] = useState("ADM3");
  const [decimals, setDecimals] = useState(2);

  const [useScalarB, setUseScalarB] = useState(false);
  const [scalarB, setScalarB] = useState<number>(1);
  const [normalizePercent, setNormalizePercent] = useState(false);

  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");

  const [taxonomyMap, setTaxonomyMap] = useState<TaxonomyMap>({});
  const [taxonomy, setTaxonomy] = useState<Record<string, Set<string>>>({});

  const [preview, setPreview] = useState<any[]>([]);
  const [loadingPreview, setLoadingPreview] = useState(false);

  /** ─── Load datasets (core + country user datasets) ─── */
  useEffect(() => {
    if (!open) return;
    (async () => {
      const base: DatasetOption[] = [
        {
          id: "core-pop",
          title: "Population Data [core]",
          source: "core",
          table: "population_data",
          defaultCol: "population",
        },
        {
          id: "core-gis",
          title: "GIS Features [core]",
          source: "gis",
          table: "gis_features",
          defaultCol: "area_sqkm",
        },
      ];

      try {
        // Keep selection minimal to avoid 400s from RLS/columns
        const { data, error } = await supabase
          .from("dataset_metadata")
          .select("id,title,default_numeric_column")
          .eq("country_iso", countryIso);

        if (error) {
          console.warn("Supabase dataset_metadata error:", error.message);
        } else if (data?.length) {
          for (const d of data) {
            base.push({
              id: d.id, // uuid
              title: d.title,
              source: "other",
              table: `dataset_${d.id}`,
              defaultCol: d.default_numeric_column || "value",
            });
          }
        }
      } catch (e: any) {
        console.warn("dataset load failed:", e?.message || e);
      }

      setDatasets(base);
    })();
  }, [open, countryIso]);

  /** ─── Load taxonomy terms ─── */
  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        const { data, error } = await supabase
          .from("taxonomy_terms")
          .select("category,name");

        if (error) {
          console.warn("taxonomy_terms error:", error.message);
          return;
        }
        const grouped: TaxonomyMap = {};
        (data || []).forEach(({ category, name }: any) => {
          if (!grouped[category]) grouped[category] = [];
          grouped[category].push(name);
        });
        setTaxonomyMap(grouped);
      } catch (e: any) {
        console.warn("taxonomy load failed:", e?.message || e);
      }
    })();
  }, [open]);

  /** ─── Hydrate edit mode or reset on open ─── */
  useEffect(() => {
    if (!open) return;

    // No edit payload → reset
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
      setNormalizePercent(false);
      setTaxonomy({});
      return;
    }

    // With edit payload
    setTitle(editDataset.title || "");
    setDesc(editDataset.description || "");
    setTargetLevel(editDataset.target_level || editDataset.admin_level || "ADM3");
    const m = (["ratio", "multiply", "sum", "difference"] as const).includes(
      editDataset.method as Method
    )
      ? (editDataset.method as Method)
      : "ratio";
    setMethod(m);
    setUseScalarB(!!editDataset.use_scalar_b);
    setScalarB(editDataset.scalar_b_val ?? 1);
    setColA(editDataset.col_a || "");
    setColB(editDataset.col_b || "");
    setDecimals(editDataset.decimals ?? 2);
  }, [open, editDataset]);

  // When datasets list arrives, complete edit hydration
  useEffect(() => {
    if (!open || !editDataset || datasets.length === 0) return;
    const foundA =
      datasets.find((d) => d.table === editDataset.table_a) ||
      datasets.find((d) => editDataset.table_a?.endsWith(d.id)) ||
      null;
    const foundB =
      datasets.find((d) => d.table === editDataset.table_b) ||
      datasets.find((d) => editDataset.table_b?.endsWith(d.id)) ||
      null;

    setDatasetA(foundA);
    setDatasetB(foundB);
    if (!editDataset.col_a && foundA?.defaultCol) setColA(foundA.defaultCol);
    if (!editDataset.col_b && foundB?.defaultCol) setColB(foundB.defaultCol);
  }, [datasets, open, editDataset]);

  /** ─── Autofill column names from defaults when choosing datasets ─── */
  useEffect(() => {
    if (datasetA && !colA) setColA(datasetA.defaultCol || "value");
  }, [datasetA]);
  useEffect(() => {
    if (datasetB && !colB) setColB(datasetB.defaultCol || "value");
  }, [datasetB]);

  /** ─── Derived formula text ─── */
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
    const rhs = useScalarB ? String(scalarB) : `B.${colB || "value"}`;
    return `A.${colA || "value"} ${methodSymbol} ${rhs}`;
  }, [useScalarB, scalarB, colA, colB, methodSymbol]);

  /** ─── Preview (tries v3 UUID RPC, falls back to legacy) ─── */
  async function previewJoin() {
    if (!datasetA || (!datasetB && !useScalarB)) {
      alert("Select Dataset A and (Dataset B or a scalar) to preview.");
      return;
    }
    setLoadingPreview(true);
    setPreview([]);

    const aId = datasetA.id;
    const bId = datasetB?.id ?? "";

    // Prefer v3 if we have UUIDs for both (or scalar in place of B)
    const canUseV3 = isUUID(aId) && (useScalarB || isUUID(bId));

    try {
      if (canUseV3) {
        // v3 signature you shared:
        // p_country_iso text, p_table_a uuid, p_table_b uuid, p_method text,
        // p_normalize_percent boolean, p_target_admin_level text,
        // returns: pcode, name, a, b, derived, col_a_used, col_b_used
        const { data, error } = await supabase.rpc("resolve_parametric_dataset_v3", {
          p_country_iso: countryIso,
          p_table_a: aId,
          p_table_b: useScalarB ? null : bId,
          p_method: method,
          p_normalize_percent: normalizePercent,
          p_target_admin_level: targetLevel,
        });
        if (error) throw error;
        setPreview(data || []);
        return;
      }

      // Fallback: legacy preview RPC (works with table names + scalar flags)
      const { data, error } = await supabase.rpc("simulate_join_preview_autoaggregate", {
        p_table_a: datasetA.table,
        p_table_b: useScalarB ? null : datasetB?.table ?? null,
        p_country: countryIso,
        p_target_level: targetLevel,
        p_method: method,
        p_col_a: colA || "value",
        p_col_b: useScalarB ? null : colB || "value",
        p_use_scalar_b: useScalarB,
        p_scalar_b_val: useScalarB ? scalarB : null,
      });
      if (error) throw error;
      setPreview(data || []);
    } catch (err: any) {
      alert(
        `Preview failed: ${err?.message || err}.` +
          (canUseV3
            ? " (Tried v3 UUID RPC.)"
            : " (Tried legacy preview RPC; it may be missing in this DB.)")
      );
      console.error(err);
    } finally {
      setLoadingPreview(false);
    }
  }

  /** ─── Save (unchanged; uses your stored procedure v2) ─── */
  async function saveDerived() {
    if (!datasetA || (!datasetB && !useScalarB)) {
      alert("Select Dataset A and (Dataset B or a scalar) before saving.");
      return;
    }
    const payload = {
      p_country: countryIso,
      p_title: title || `Derived (${targetLevel})`,
      p_description: desc || null,
      p_admin_level: targetLevel,
      p_method: method,
      p_use_scalar_b: useScalarB,
      p_scalar_b_val: useScalarB ? scalarB : null,
      p_table_a: datasetA.table,
      p_table_b: useScalarB ? null : datasetB?.table ?? null,
      p_col_a: colA || "value",
      p_col_b: useScalarB ? null : colB || "value",
      p_formula: computedFormula,
      p_target_level: targetLevel,
      p_taxonomy_categories: Object.keys(taxonomy),
      p_taxonomy_terms: Object.keys(taxonomy).flatMap((c) =>
        Array.from(taxonomy[c] || [])
      ),
      p_decimals: decimals,
    };

    const { error } = await supabase.rpc("create_derived_dataset_v2", payload);
    if (error) {
      alert("Save failed: " + error.message);
      return;
    }
    alert(editDataset ? "✅ Changes saved." : "✅ Derived dataset created.");
    onClose();
  }

  if (!open) return null;

  /** ─── UI ─── */
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-4 w-[95%] max-w-5xl max-h-[92vh] overflow-y-auto text-sm">
        <h2 className="text-lg font-semibold mb-3">Create Derived Dataset</h2>

        {/* Title / Description / Level */}
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

        {/* Datasets row */}
        <div className="flex gap-2 mb-2">
          <select
            className="border p-1 rounded flex-1"
            value={datasetA?.id || ""}
            onChange={(e) =>
              setDatasetA(datasets.find((d) => d.id === e.target.value) || null)
            }
          >
            <option value="">Select Dataset A</option>
            {datasets.map((d) => (
              <option key={d.id} value={d.id}>
                {d.title}
              </option>
            ))}
          </select>
          <input
            className="border p-1 rounded w-44"
            value={colA}
            onChange={(e) => setColA(e.target.value)}
            placeholder="Column A"
          />

          {!useScalarB && (
            <>
              <select
                className="border p-1 rounded flex-1"
                value={datasetB?.id || ""}
                onChange={(e) =>
                  setDatasetB(datasets.find((d) => d.id === e.target.value) || null)
                }
              >
                <option value="">Select Dataset B</option>
                {datasets.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.title}
                  </option>
                ))}
              </select>
              <input
                className="border p-1 rounded w-44"
                value={colB}
                onChange={(e) => setColB(e.target.value)}
                placeholder="Column B"
              />
            </>
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
              value={scalarB}
              onChange={(e) => setScalarB(parseFloat(e.target.value || "0"))}
            />
          )}

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

        {/* Methods + Preview controls */}
        <div className="flex items-center gap-2 mb-2">
          {(["ratio", "multiply", "sum", "difference"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMethod(m)}
              className={`px-2 py-1 border rounded ${method === m ? "text-white" : ""}`}
              style={{
                background: method === m ? ACCENT : "transparent",
                borderColor: "#e5e7eb",
              }}
            >
              {m}
            </button>
          ))}
          <label className="text-xs flex items-center gap-1 ml-2">
            <input
              type="checkbox"
              checked={normalizePercent}
              onChange={(e) => setNormalizePercent(e.target.checked)}
            />
            Normalize (%) divisor
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

        {/* Preview Table */}
        <div className="max-h-64 overflow-y-auto border rounded text-xs mb-4">
          <table className="w-full">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-1 text-left">Pcode</th>
                <th className="p-1 text-left">Name</th>
                <th className="p-1 text-right">A</th>
                <th className="p-1 text-right">B</th>
                <th className="p-1 text-right">Derived</th>
              </tr>
            </thead>
            <tbody>
              {preview.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center italic text-gray-500 py-2">
                    No preview data
                  </td>
                </tr>
              ) : (
                preview.map((r: any, i: number) => (
                  <tr key={i} className="border-t">
                    <td className="p-1">{r.pcode ?? r.join_key ?? "—"}</td>
                    <td className="p-1">{r.name ?? r.place_name ?? "—"}</td>
                    <td className="p-1 text-right">
                      {r.a != null ? Number(r.a).toLocaleString(undefined, { maximumFractionDigits: decimals }) : ""}
                    </td>
                    <td className="p-1 text-right">
                      {r.b != null ? Number(r.b).toLocaleString(undefined, { maximumFractionDigits: decimals }) : ""}
                    </td>
                    <td className="p-1 text-right font-medium">
                      {r.derived != null ? Number(r.derived).toLocaleString(undefined, { maximumFractionDigits: decimals }) : ""}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Taxonomy */}
        <h3 className="text-sm font-semibold mb-2">Assign Taxonomy</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
          {Object.keys(taxonomyMap).map((cat) => {
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
                        if (e.target.checked) next[cat] = next[cat] ?? new Set<string>();
                        else delete next[cat];
                        return next;
                      })
                    }
                  />
                  {cat}
                </label>
                {isChecked && (
                  <div className="ml-3 mt-1 grid grid-cols-1">
                    {taxonomyMap[cat].map((term) => (
                      <label key={term} className="flex items-center gap-1 text-xs">
                        <input
                          type="checkbox"
                          checked={!!taxonomy[cat]?.has(term)}
                          onChange={(e) =>
                            setTaxonomy((prev) => {
                              const next = { ...prev };
                              next[cat] = next[cat] ?? new Set<string>();
                              if (e.target.checked) next[cat]!.add(term);
                              else next[cat]!.delete(term);
                              return next;
                            })
                          }
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

        {/* Footer */}
        <div className="flex justify-end gap-2">
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

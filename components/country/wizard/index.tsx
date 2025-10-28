"use client";

import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";

/** ───────────────────────── Types (local, deliberately loose to avoid drift) */
type Source = "core" | "gis" | "other" | "derived";
type Method = "ratio" | "multiply" | "sum" | "difference";

type DatasetOption = {
  id: string;           // stable id (uuid for user/derived; pseudo for core)
  title: string;
  source: Source;
  table: string;        // actual table identifier to send to RPCs
  defaultCol?: string | null;
};

type EditPayload = {
  id: string;
  title: string;
  description?: string | null;
  admin_level: string;
  method: Method | string; // tolerate legacy string
  // optional historical fields — we hydrate best-effort
  use_scalar_b?: boolean | null;
  scalar_b_val?: number | null;
  table_a?: string | null;
  table_b?: string | null;
  col_a?: string | null;
  col_b?: string | null;
  target_level?: string | null;
  taxonomy_categories?: string[] | null;
};

type Props = {
  open: boolean;
  onClose: () => void;
  countryIso: string;
  editDataset?: EditPayload | null;
};

/** ───────────────────────── Constants */
const ACCENT = "#640811";
const LEVELS = ["ADM0", "ADM1", "ADM2", "ADM3", "ADM4"] as const;

/** ───────────────────────── Component */
export default function DerivedDatasetWizard({
  open,
  onClose,
  countryIso,
  editDataset = null,
}: Props) {
  /** Datasets & selections */
  const [datasets, setDatasets] = useState<DatasetOption[]>([]);
  const [datasetA, setDatasetA] = useState<DatasetOption | null>(null);
  const [datasetB, setDatasetB] = useState<DatasetOption | null>(null);
  const [colA, setColA] = useState("");
  const [colB, setColB] = useState("");

  /** Behavior */
  const [method, setMethod] = useState<Method>("ratio");
  const [useScalarB, setUseScalarB] = useState(false);
  const [scalarB, setScalarB] = useState<number>(1);
  const [isParametric, setIsParametric] = useState<boolean>(true);
  const [targetLevel, setTargetLevel] = useState<(typeof LEVELS)[number]>("ADM3");
  const [decimals, setDecimals] = useState(2);

  /** Meta */
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");

  /** Preview */
  const [preview, setPreview] = useState<any[]>([]);
  const [loadingPreview, setLoadingPreview] = useState(false);

  /** Taxonomy */
  const [taxonomyMap, setTaxonomyMap] = useState<Record<string, string[]>>({});
  const [taxonomySel, setTaxonomySel] = useState<Record<string, string[]>>({});

  /** ───────────────────────── Load dataset options */
  useEffect(() => {
    if (!open) return;
    (async () => {
      const base: DatasetOption[] = [
        { id: "core-pop", title: "Population Data [core]", source: "core", table: "population_data", defaultCol: "population" },
        { id: "core-gis", title: "GIS Features [core]", source: "gis", table: "gis_features", defaultCol: "area_sqkm" },
      ];

      // user datasets
      const { data: others, error: e1 } = await supabase
        .from("dataset_metadata")
        .select("id,title,default_numeric_column")
        .eq("country_iso", countryIso);

      if (!e1 && others?.length) {
        for (const d of others) {
          base.push({
            id: d.id,
            title: d.title,
            source: "other",
            table: `dataset_${d.id}`,
            defaultCol: d.default_numeric_column || null,
          });
        }
      }

      // derived datasets
      const { data: derived, error: e2 } = await supabase
        .from("derived_dataset_metadata")
        .select("id,title")
        .eq("country_iso", countryIso);

      if (!e2 && derived?.length) {
        for (const d of derived) {
          base.push({
            id: d.id,
            title: d.title,
            source: "derived",
            table: `derived_${d.id}`,
            defaultCol: "derived",
          });
        }
      }

      setDatasets(base);
    })();
  }, [open, countryIso]);

  /** ───────────────────────── Load taxonomy */
  useEffect(() => {
    if (!open) return;
    (async () => {
      const { data } = await supabase.from("taxonomy_terms").select("category,name").order("category");
      if (!data) return;
      const grouped: Record<string, string[]> = {};
      data.forEach(({ category, name }) => {
        if (!grouped[category]) grouped[category] = [];
        grouped[category].push(name);
      });
      setTaxonomyMap(grouped);
    })();
  }, [open]);

  /** ───────────────────────── Hydrate for edit */
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
      setIsParametric(true);
      setTaxonomySel({});
      return;
    }

    setTitle(editDataset.title || "");
    setDesc(editDataset.description ?? "");
    setTargetLevel((editDataset.target_level as any) || editDataset.admin_level || "ADM3");
    setMethod((editDataset.method as Method) || "ratio");
    setUseScalarB(!!editDataset.use_scalar_b);
    setScalarB(editDataset.scalar_b_val ?? 1);
    setColA(editDataset.col_a || "");
    setColB(editDataset.col_b || "");
    setIsParametric(true); // old records default to parametric behavior

    // pick dataset A/B by matching table name (if present)
    if (datasets.length > 0) {
      const foundA = editDataset.table_a ? datasets.find(d => d.table === editDataset.table_a) : null;
      const foundB = editDataset.table_b ? datasets.find(d => d.table === editDataset.table_b) : null;
      setDatasetA(foundA || null);
      setDatasetB(foundB || null);
    }

    // taxonomy hydration (categories only – terms unknown historically)
    if (Array.isArray(editDataset.taxonomy_categories) && editDataset.taxonomy_categories.length) {
      const sel: Record<string, string[]> = {};
      editDataset.taxonomy_categories.forEach(c => (sel[c] = []));
      setTaxonomySel(sel);
    }
  }, [open, editDataset, datasets]);

  /** ───────────────────────── Auto-fill default columns when dataset chosen */
  useEffect(() => {
    if (datasetA && !colA) setColA(datasetA.defaultCol || "value");
  }, [datasetA]);
  useEffect(() => {
    if (datasetB && !colB) setColB(datasetB.defaultCol || "value");
  }, [datasetB]);

  /** ───────────────────────── Helpers */
  const methodSymbol = useMemo(() => {
    switch (method) {
      case "ratio": return "÷";
      case "multiply": return "×";
      case "sum": return "+";
      case "difference": return "−";
    }
  }, [method]);

  const computedFormula = useMemo(() => {
    const rhs = useScalarB ? String(scalarB) : `B.${colB || "?"}`;
    return `A.${colA || "?"} ${methodSymbol} ${rhs}`;
  }, [useScalarB, scalarB, colA, colB, methodSymbol]);

  const formatNumber = (v: number | null) =>
    v == null || isNaN(v as any) ? "" : Number(v).toLocaleString(undefined, { maximumFractionDigits: decimals });

  /** ───────────────────────── Preview (legacy RPC signature you confirmed) */
  async function previewJoin() {
    if (!datasetA || (!datasetB && !useScalarB)) {
      alert("Select Dataset A and (Dataset B or a scalar).");
      return;
    }
    if (!colA || (!useScalarB && !colB)) {
      alert("Please enter column names for A and B.");
      return;
    }

    setLoadingPreview(true);
    setPreview([]);

    const params = {
      p_table_a: datasetA.table,
      p_table_b: useScalarB ? null : datasetB?.table ?? null,
      p_col_a: colA,
      p_col_b: useScalarB ? null : (colB || null),
      p_country_iso: countryIso,
      p_method: method,
      p_target_level: targetLevel,
      p_use_scalar_b: useScalarB,
      p_scalar_b_val: useScalarB ? scalarB : null,
      p_limit: 250,
      p_normalize_percent: false,
    } as any;

    const { data, error } = await supabase.rpc("simulate_join_preview_autoaggregate", params);
    setLoadingPreview(false);
    if (error) {
      alert("Preview failed: " + error.message);
      return;
    }
    setPreview(data || []);
  }

  /** ───────────────────────── Save (match current DB signature order) */
  async function saveDerived() {
    if (!datasetA || (!datasetB && !useScalarB)) {
      alert("Select Dataset A and (Dataset B or a scalar).");
      return;
    }
    if (!colA || (!useScalarB && !colB)) {
      alert("Please enter column names for A and B.");
      return;
    }

    const payload = {
      p_title: title || `Derived (${targetLevel})`,
      p_table_a: datasetA.table,
      p_table_b: useScalarB ? null : datasetB?.table ?? null,
      p_col_a: colA,
      p_col_b: useScalarB ? null : colB,
      p_admin_level: targetLevel,
      p_method: method,
      p_is_parametric: isParametric,
      p_scalar_b_val: useScalarB ? scalarB : null,
      p_normalize_percent: false,
      p_debug: false,
    } as any;

    const { error } = await supabase.rpc("create_derived_dataset_v2", payload);
    if (error) {
      alert("Save failed: " + error.message);
      return;
    }
    alert(editDataset ? "✅ Changes saved." : "✅ Derived dataset created.");
    onClose();
  }

  if (!open) return null;

  /** ───────────────────────── Render */
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-5 w-[96%] max-w-6xl max-h-[92vh] overflow-y-auto text-sm">
        <h2 className="text-lg font-semibold mb-3">
          {editDataset ? "Edit Derived Dataset" : "Create Derived Dataset"}
        </h2>

        {/* Title / Description / Level / Parametric */}
        <div className="flex flex-col md:flex-row gap-2 mb-3">
          <input
            className="border p-2 rounded flex-1"
            placeholder="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <input
            className="border p-2 rounded flex-1"
            placeholder="Description"
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
          />
          <select
            className="border p-2 rounded w-32"
            value={targetLevel}
            onChange={(e) => setTargetLevel(e.target.value as any)}
          >
            {LEVELS.map((lvl) => (
              <option key={lvl}>{lvl}</option>
            ))}
          </select>
          <select
            className="border p-2 rounded w-36"
            value={isParametric ? "parametric" : "fixed"}
            onChange={(e) => setIsParametric(e.target.value === "parametric")}
            title="Computation mode"
          >
            <option value="parametric">Parametric</option>
            <option value="fixed">Fixed</option>
          </select>
        </div>

        {/* Dataset selectors (categorized) */}
        <div className="flex gap-2 mb-3">
          {([
            ["A", datasetA, setDatasetA],
            ["B", datasetB, setDatasetB],
          ] as const).map(([label, ds, setter], i) =>
            !useScalarB || label === "A" ? (
              <select
                key={label}
                className="border p-2 rounded flex-1"
                value={(ds as any)?.id || ""}
                onChange={(e) => setter(datasets.find((d) => d.id === e.target.value) || null)}
                disabled={!!editDataset}
              >
                <option value="">{`Select Dataset ${label}`}</option>
                {(["core", "gis", "other", "derived"] as Source[]).map((group) => {
                  const items = datasets.filter((d) => d.source === group);
                  return (
                    <optgroup key={group} label={group.toUpperCase()}>
                      {items.length === 0 ? (
                        <option value="" disabled>
                          {group.toUpperCase()}
                        </option>
                      ) : (
                        items.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.title}
                          </option>
                        ))
                      )}
                    </optgroup>
                  );
                })}
              </select>
            ) : (
              <div key={i} className="flex-1" />
            )
          )}
        </div>

        {/* Columns + Scalar + Decimals */}
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <input
            className="border p-2 rounded w-48"
            value={colA}
            onChange={(e) => setColA(e.target.value)}
            placeholder="Column A (e.g., population)"
          />
          {!useScalarB && (
            <input
              className="border p-2 rounded w-48"
              value={colB}
              onChange={(e) => setColB(e.target.value)}
              placeholder="Column B (e.g., area_sqkm)"
            />
          )}
          <label className="text-xs flex items-center gap-2 ml-auto mr-2">
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
              className="border p-2 rounded w-28 text-right"
              value={scalarB}
              onChange={(e) => setScalarB(parseFloat(e.target.value || "0"))}
            />
          )}
          <select
            className="border rounded text-xs p-2"
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

        {/* Method + Preview */}
        <div className="flex items-center gap-2 mb-2">
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
                {!useScalarB && <th className="p-1 text-right">B</th>}
                <th className="p-1 text-right">Derived</th>
              </tr>
            </thead>
            <tbody>
              {preview.length === 0 ? (
                <tr>
                  <td className="p-2 italic text-gray-500" colSpan={useScalarB ? 4 : 5}>
                    No preview data
                  </td>
                </tr>
              ) : (
                preview.map((r: any, i: number) => (
                  <tr key={i} className="border-t">
                    <td className="p-1">{r.join_key ?? r.pcode ?? "—"}</td>
                    <td className="p-1">{r.place_name ?? r.name ?? "—"}</td>
                    <td className="p-1 text-right">{formatNumber(r.a)}</td>
                    {!useScalarB && <td className="p-1 text-right">{formatNumber(r.b)}</td>}
                    <td className="p-1 text-right font-medium">{formatNumber(r.derived)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Taxonomy */}
        <h3 className="text-sm font-semibold mb-2">Assign Taxonomy</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mb-4">
          {Object.keys(taxonomyMap).map((cat) => {
            const selected = taxonomySel[cat] || [];
            const enabled = cat in taxonomySel;
            return (
              <div key={cat} className="border rounded p-2">
                <label className="flex items-center gap-2 text-xs font-medium">
                  <input
                    type="checkbox"
                    checked={enabled}
                    onChange={(e) =>
                      setTaxonomySel((prev) => {
                        const next = { ...prev };
                        if (e.target.checked) next[cat] = next[cat] || [];
                        else delete next[cat];
                        return next;
                      })
                    }
                  />
                  {cat}
                </label>
                {enabled && (
                  <div className="ml-4 mt-2 flex flex-col gap-1">
                    {taxonomyMap[cat].map((term) => {
                      const checked = selected.includes(term);
                      return (
                        <label key={term} className="flex items-center gap-2 text-xs">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) =>
                              setTaxonomySel((prev) => {
                                const next = { ...prev };
                                const list = new Set(next[cat] || []);
                                if (e.target.checked) list.add(term);
                                else list.delete(term);
                                next[cat] = Array.from(list);
                                return next;
                              })
                            }
                          />
                          {term}
                        </label>
                      );
                    })}
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

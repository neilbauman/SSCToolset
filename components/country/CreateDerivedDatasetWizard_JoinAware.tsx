"use client";

import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";

type Source = "core" | "other" | "derived" | "gis";
type Method = "ratio" | "multiply" | "sum" | "difference";

type DatasetOption = {
  id: string;
  title: string;
  source: Source;
  table: string;
};

type EditPayload = {
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
};

type Props = {
  open: boolean;
  onClose: () => void;
  countryIso: string;
  editDataset?: EditPayload | null;
};

const ACCENT = "#640811";

export default function CreateDerivedDatasetWizard_JoinAware({
  open,
  onClose,
  countryIso,
  editDataset = null,
}: Props) {
  const [datasets, setDatasets] = useState<DatasetOption[]>([]);
  const [datasetA, setDatasetA] = useState<DatasetOption | null>(null);
  const [datasetB, setDatasetB] = useState<DatasetOption | null>(null);
  const [colA, setColA] = useState("population");
  const [colB, setColB] = useState("area_sqkm");
  const [method, setMethod] = useState<Method>("ratio");
  const [useScalarB, setUseScalarB] = useState(false);
  const [scalarB, setScalarB] = useState<number>(1);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [targetLevel, setTargetLevel] = useState("ADM3");
  const [decimals, setDecimals] = useState(2);
  const [preview, setPreview] = useState<any[]>([]);
  const [loadingPreview, setLoadingPreview] = useState(false);

  // ─────────────────────────────
  // Load dataset options
  // ─────────────────────────────
  useEffect(() => {
    if (!open) return;
    (async () => {
      const all: DatasetOption[] = [
        { id: "core-pop", title: "Population Data [core]", source: "core", table: "population_data" },
        { id: "core-gis", title: "GIS Features [core]", source: "gis", table: "gis_features" },
      ];

      const { data: others } = await supabase
        .from("dataset_metadata")
        .select("id,title")
        .eq("country_iso", countryIso);

      if (others?.length) {
        for (const d of others) {
          all.push({ id: d.id, title: d.title, source: "other", table: `dataset_${d.id}` });
        }
      }

      const { data: derived } = await supabase
        .from("derived_dataset_metadata")
        .select("id,title")
        .eq("country_iso", countryIso);

      if (derived?.length) {
        for (const d of derived) {
          all.push({ id: d.id, title: d.title, source: "derived", table: `derived_${d.id}` });
        }
      }

      setDatasets(all);
    })();
  }, [open, countryIso]);

  // ─────────────────────────────
  // Hydrate when editing
  // ─────────────────────────────
  useEffect(() => {
    if (!open) return;

    if (!editDataset) {
      setTitle("");
      setDesc("");
      setTargetLevel("ADM3");
      setMethod("ratio");
      setUseScalarB(false);
      setScalarB(1);
      setColA("population");
      setColB("area_sqkm");
      setDecimals(2);
      setDatasetA(null);
      setDatasetB(null);
      setPreview([]);
      return;
    }

    setTitle(editDataset.title || "");
    setDesc(editDataset.description || "");
    setTargetLevel(editDataset.target_level || editDataset.admin_level || "ADM3");
    setMethod((editDataset.method as Method) || "ratio");
    setUseScalarB(!!editDataset.use_scalar_b);
    setScalarB(editDataset.scalar_b_val ?? 1);
    setColA(editDataset.col_a || "population");
    setColB(editDataset.col_b || "area_sqkm");
    setDecimals(editDataset.decimals ?? 2);

    if (datasets.length > 0) {
      const foundA = datasets.find((d) => d.table === editDataset.table_a);
      const foundB = datasets.find((d) => d.table === editDataset.table_b);
      setDatasetA(foundA || null);
      setDatasetB(foundB || null);
    }
  }, [open, editDataset, datasets]);

  // ─────────────────────────────
  // Helpers
  // ─────────────────────────────
  const methodSymbol = useMemo(() => {
    switch (method) {
      case "ratio": return "÷";
      case "multiply": return "×";
      case "sum": return "+";
      case "difference": return "−";
    }
  }, [method]);

  const computedFormula = useMemo(() => {
    const rhs = useScalarB ? String(scalarB) : `B.${colB}`;
    return `A.${colA} ${methodSymbol} ${rhs}`;
  }, [useScalarB, scalarB, colA, colB, methodSymbol]);

  // ─────────────────────────────
  // Preview
  // ─────────────────────────────
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
    });
    setLoadingPreview(false);

    if (error) {
      alert("Preview error: " + error.message);
      return;
    }

    setPreview(data || []);
  }

  // ─────────────────────────────
  // Save
  // ─────────────────────────────
  async function saveDerived() {
    if (!datasetA || (!datasetB && !useScalarB)) {
      alert("Select Dataset A and (Dataset B or a scalar).");
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
      p_col_a: colA,
      p_col_b: useScalarB ? null : colB,
      p_formula: computedFormula,
      p_source_level: "variable",
      p_target_level: targetLevel,
      p_dynamic_resolution: true,
      p_decimals: decimals,
    };

    const { error } = await supabase.rpc("create_derived_dataset", payload);
    if (error) {
      alert("Save failed: " + error.message);
      return;
    }

    alert(editDataset ? "✅ Changes saved." : "✅ Derived dataset created.");
    onClose();
  }

  if (!open) return null;

  // ─────────────────────────────
  // UI
  // ─────────────────────────────
  const formatNumber = (value: number | null) => {
    if (value == null || isNaN(value)) return "";
    return value.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: decimals,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-5 w-[95%] max-w-5xl max-h-[90vh] overflow-y-auto text-sm">
        <h2 className="text-lg font-semibold mb-3">
          {editDataset ? "Edit Derived Dataset" : "Create Derived Dataset"}
        </h2>

        {/* Title / Description */}
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

        {/* Dataset Selectors */}
        <div className="flex gap-2 mb-3">
          <select
            className="border p-1 rounded flex-1"
            value={datasetA?.id || ""}
            onChange={(e) => setDatasetA(datasets.find((d) => d.id === e.target.value) || null)}
            disabled={!!editDataset}
          >
            <option value="">Select Dataset A</option>
            {datasets.map((d) => (
              <option key={d.id} value={d.id}>
                {d.title}
              </option>
            ))}
          </select>

          {!useScalarB && (
            <select
              className="border p-1 rounded flex-1"
              value={datasetB?.id || ""}
              onChange={(e) => setDatasetB(datasets.find((d) => d.id === e.target.value) || null)}
              disabled={!!editDataset}
            >
              <option value="">Select Dataset B</option>
              {datasets.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.title}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Columns + Scalar */}
        <div className="flex gap-2 mb-3">
          <input
            className="border p-1 rounded w-40"
            value={colA}
            onChange={(e) => setColA(e.target.value)}
          />
          {!useScalarB && (
            <input
              className="border p-1 rounded w-40"
              value={colB}
              onChange={(e) => setColB(e.target.value)}
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

        {/* Method + Preview */}
        <div className="flex items-center gap-2 mb-3">
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
                <th className="p-1 text-right">B</th>
                <th className="p-1 text-right">Derived</th>
              </tr>
            </thead>
            <tbody>
              {preview.map((r, i) => (
                <tr key={i} className="border-t">
                  <td className="p-1">{r.join_key}</td>
                  <td className="p-1">{r.place_name ?? "—"}</td>
                  <td className="p-1 text-right">{formatNumber(r.a)}</td>
                  <td className="p-1 text-right">{formatNumber(r.b)}</td>
                  <td className="p-1 text-right font-medium">{formatNumber(r.derived)}</td>
                </tr>
              ))}
            </tbody>
          </table>
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

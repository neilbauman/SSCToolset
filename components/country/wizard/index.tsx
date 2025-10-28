"use client";

import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";

type Source = "core" | "other" | "derived" | "gis";
type Method = "ratio" | "multiply" | "sum" | "difference";

type DatasetOption = {
  id: string; // UUID or "core-*"
  title: string;
  source: Source;
  table: string;
  defaultCol?: string | null;
};

type EditPayload = {
  id: string;
  title: string;
  description: string | null;
  admin_level: string;
  method: Method;
  table_a?: string | null;
  table_b?: string | null;
  col_a?: string | null;
  col_b?: string | null;
};

type Props = {
  open?: boolean;
  onClose: () => void;
  countryIso: string;
  editDataset?: EditPayload | null;
};

const ACCENT = "#640811";

export default function DerivedDatasetWizard({
  open = true,
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
  const [preview, setPreview] = useState<any[]>([]);
  const [loadingPreview, setLoadingPreview] = useState(false);

  // ───────────── Load datasets ─────────────
  useEffect(() => {
    if (!countryIso) return;
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
        const { data, error } = await supabase
          .from("dataset_metadata")
          .select("id, title, default_numeric_column, country_iso")
          .eq("country_iso", countryIso);

        if (error) {
          console.warn("⚠️ Supabase error loading datasets:", error.message);
        }

        if (data?.length) {
          data.forEach((d) => {
            base.push({
              id: d.id,
              title: d.title,
              source: "other",
              table: `dataset_${d.id}`,
              defaultCol: d.default_numeric_column || "value",
            });
          });
        }
      } catch (err: any) {
        console.error("Dataset load failed:", err.message);
      }

      setDatasets(base);
    })();
  }, [countryIso]);

  // ───────────── Hydrate edit mode ─────────────
  useEffect(() => {
    if (!editDataset || datasets.length === 0) return;
    const foundA = datasets.find((d) => d.table === editDataset.table_a) || null;
    const foundB = datasets.find((d) => d.table === editDataset.table_b) || null;

    setDatasetA(foundA);
    setDatasetB(foundB);
    setColA(editDataset.col_a || foundA?.defaultCol || "");
    setColB(editDataset.col_b || foundB?.defaultCol || "");
    setMethod(editDataset.method || "ratio");
    setTargetLevel(editDataset.admin_level || "ADM3");
  }, [editDataset, datasets]);

  // ───────────── Formula ─────────────
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
    return `A.${colA || "value"} ${methodSymbol} B.${colB || "value"}`;
  }, [colA, colB, methodSymbol]);

  // ───────────── Preview ─────────────
  async function previewJoin() {
    if (!datasetA || !datasetB) {
      alert("Select both Dataset A and B before previewing.");
      return;
    }

    setLoadingPreview(true);
    const isCoreA = datasetA.id.startsWith("core-");
    const isCoreB = datasetB.id.startsWith("core-");

    try {
      const { data, error } = await supabase.rpc("resolve_parametric_dataset_v3", {
        p_country_iso: countryIso,
        p_table_a: isCoreA ? null : datasetA.id,
        p_table_b: isCoreB ? null : datasetB.id,
        p_method: method,
        p_normalize_percent: false,
        p_target_admin_level: targetLevel,
      });

      if (error) throw error;
      setPreview(data || []);
    } catch (err: any) {
      alert("Preview failed: " + err.message);
      console.error(err);
    } finally {
      setLoadingPreview(false);
    }
  }

  // ───────────── Save ─────────────
  async function saveDerived() {
    if (!datasetA || !datasetB) {
      alert("Select both datasets before saving.");
      return;
    }

    const payload = {
      p_country: countryIso,
      p_title: `Derived: ${datasetA.table}_${method}_${datasetB.table}`,
      p_admin_level: targetLevel,
      p_method: method,
      p_table_a: datasetA.table,
      p_table_b: datasetB.table,
      p_col_a: colA,
      p_col_b: colB,
      p_formula: computedFormula,
    };

    const { error } = await supabase.rpc("create_derived_dataset_v2", payload);
    if (error) {
      alert("Save failed: " + error.message);
      return;
    }

    alert("✅ Derived dataset created.");
    onClose();
  }

  if (!open) return null;

  // ───────────── UI ─────────────
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-5 w-[95%] max-w-5xl max-h-[90vh] overflow-y-auto text-sm">
        <h2 className="text-lg font-semibold mb-3 text-[#640811]">
          {editDataset ? "Edit Derived Dataset" : "Create Derived Dataset"}
        </h2>

        {/* Dataset selectors */}
        <div className="flex gap-2 mb-3">
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
            className="border p-1 rounded w-40"
            value={colA}
            onChange={(e) => setColA(e.target.value)}
            placeholder="Column A"
          />

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
            className="border p-1 rounded w-40"
            value={colB}
            onChange={(e) => setColB(e.target.value)}
            placeholder="Column B"
          />
        </div>

        {/* Method + Preview */}
        <div className="flex items-center gap-2 mb-3">
          {(["ratio", "multiply", "sum", "difference"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMethod(m)}
              className={`px-2 py-1 border rounded ${
                method === m ? "text-white" : ""
              }`}
              style={{
                background: method === m ? ACCENT : "transparent",
                borderColor: "#ddd",
              }}
            >
              {m}
            </button>
          ))}
          <select
            className="border p-1 rounded ml-auto"
            value={targetLevel}
            onChange={(e) => setTargetLevel(e.target.value)}
          >
            {["ADM0", "ADM1", "ADM2", "ADM3", "ADM4"].map((lvl) => (
              <option key={lvl}>{lvl}</option>
            ))}
          </select>
          <button
            onClick={previewJoin}
            className="ml-2 px-3 py-1 rounded text-white"
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
                    <td className="p-1">{r.pcode}</td>
                    <td className="p-1">{r.name}</td>
                    <td className="p-1 text-right">{r.a?.toLocaleString()}</td>
                    <td className="p-1 text-right">{r.b?.toLocaleString()}</td>
                    <td className="p-1 text-right font-medium text-[#640811]">
                      {r.derived?.toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
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
            Save Derived
          </button>
        </div>
      </div>
    </div>
  );
}

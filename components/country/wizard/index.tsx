"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/supabaseBrowser";
import { Play, Save } from "lucide-react";

export default function CreateDerivedDatasetWizard_JoinAware({
  countryIso,
  onClose,
  editDataset,
}: {
  countryIso: string;
  onClose: () => void;
  editDataset?: any;
}) {
  const supabase = supabaseBrowser;

  const [datasets, setDatasets] = useState<any[]>([]);
  const [datasetA, setDatasetA] = useState("");
  const [datasetB, setDatasetB] = useState("");
  const [colA, setColA] = useState("");
  const [colB, setColB] = useState("");
  const [method, setMethod] = useState("multiply");
  const [targetLevel, setTargetLevel] = useState("ADM3");
  const [useScalarB, setUseScalarB] = useState(false);
  const [scalarBVal, setScalarBVal] = useState<number | null>(null);
  const [normalizePercent, setNormalizePercent] = useState(false);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Load datasets
  const loadDatasets = async () => {
    const { data, error } = await supabase
      .from("dataset_metadata")
      .select("id, title, admin_level, method")
      .eq("country_iso", countryIso);
    if (error) console.error(error);
    else setDatasets(data || []);
  };

  useEffect(() => {
    loadDatasets();
  }, [countryIso]);

  // Preview join result
  const handlePreview = async () => {
    if (!datasetA || !colA || (!datasetB && !useScalarB)) {
      alert("Please select Dataset A and B (or scalar).");
      return;
    }

    setLoading(true);
    setPreviewData([]);

    try {
      const { data, error } = await supabase.rpc("resolve_parametric_dataset_v2", {
        derived_dataset_id: editDataset?.id || "00000000-0000-0000-0000-000000000000",
        p_country_iso: countryIso,
        p_scalar_b_val: scalarBVal,
        p_normalize_percent: normalizePercent,
        p_debug: false,
      });

      if (error) {
        console.error(error);
        alert("Preview failed: " + error.message);
        return;
      }

      setPreviewData(data || []);
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Create derived dataset
  const handleCreate = async () => {
    if (!datasetA || !colA || (!datasetB && !useScalarB)) {
      alert("Please complete all required fields.");
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.rpc("create_derived_dataset_v2", {
        p_table_a: datasetA,
        p_table_b: datasetB || null,
        p_col_a: colA,
        p_col_b: colB || null,
        p_country_iso: countryIso,
        p_method: method,
        p_target_level: targetLevel,
        p_is_parametric: true,
        p_scalar_b_val: scalarBVal,
        p_use_scalar_b: useScalarB,
        p_normalize_percent: normalizePercent,
      });

      if (error) {
        console.error(error);
        alert("Creation failed: " + error.message);
        return;
      }

      alert("✅ Derived dataset created successfully!");
      // Auto-close wizard after a short delay
      setTimeout(() => onClose(), 800);
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold text-[#640811] mb-4">
        Create Derived Dataset
      </h2>

      <div className="grid grid-cols-2 gap-6">
        {/* Dataset A */}
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700">
            Dataset A
          </label>
          <select
            className="w-full border rounded px-3 py-2"
            value={datasetA}
            onChange={(e) => setDatasetA(e.target.value)}
          >
            <option value="">Select dataset...</option>
            {datasets.map((d) => (
              <option key={d.id} value={d.id}>
                {d.title}
              </option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Column name (e.g. population)"
            value={colA}
            onChange={(e) => setColA(e.target.value)}
            className="mt-2 w-full border rounded px-3 py-2"
          />
        </div>

        {/* Dataset B */}
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700">
            Dataset B
          </label>
          <select
            className="w-full border rounded px-3 py-2"
            value={datasetB}
            onChange={(e) => setDatasetB(e.target.value)}
            disabled={useScalarB}
          >
            <option value="">Select dataset...</option>
            {datasets.map((d) => (
              <option key={d.id} value={d.id}>
                {d.title}
              </option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Column name (e.g. area_sqkm)"
            value={colB}
            onChange={(e) => setColB(e.target.value)}
            className="mt-2 w-full border rounded px-3 py-2"
            disabled={useScalarB}
          />

          <label className="flex items-center gap-2 mt-2 text-sm">
            <input
              type="checkbox"
              checked={useScalarB}
              onChange={(e) => setUseScalarB(e.target.checked)}
            />
            Use scalar instead
          </label>

          {useScalarB && (
            <input
              type="number"
              placeholder="Scalar value"
              value={scalarBVal ?? ""}
              onChange={(e) => setScalarBVal(parseFloat(e.target.value))}
              className="mt-2 w-full border rounded px-3 py-2"
            />
          )}
        </div>
      </div>

      {/* Method & Options */}
      <div className="grid grid-cols-2 gap-6 mt-6 items-end">
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700">
            Method
          </label>
          <select
            className="w-full border rounded px-3 py-2"
            value={method}
            onChange={(e) => setMethod(e.target.value)}
          >
            <option value="multiply">Multiply (A × B)</option>
            <option value="ratio">Ratio (A ÷ B)</option>
            <option value="sum">Sum (A + B)</option>
            <option value="difference">Difference (A - B)</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 text-gray-700">
            Target Admin Level
          </label>
          <select
            className="w-full border rounded px-3 py-2"
            value={targetLevel}
            onChange={(e) => setTargetLevel(e.target.value)}
          >
            <option value="ADM2">ADM2</option>
            <option value="ADM3">ADM3</option>
            <option value="ADM4">ADM4</option>
          </select>

          <label className="flex items-center gap-2 mt-2 text-sm">
            <input
              type="checkbox"
              checked={normalizePercent}
              onChange={(e) => setNormalizePercent(e.target.checked)}
            />
            Normalize (%) divisor
          </label>
        </div>
      </div>

      {/* Buttons */}
      <div className="mt-8 flex justify-end gap-3">
        <button
          onClick={handlePreview}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 border rounded text-gray-700 hover:bg-gray-100"
        >
          <Play className="w-4 h-4" />
          Preview
        </button>

        <button
          onClick={handleCreate}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-[#640811] text-white rounded hover:bg-[#50050d]"
        >
          <Save className="w-4 h-4" />
          {loading ? "Creating..." : "Create"}
        </button>
      </div>

      {/* Preview Table */}
      {previewData.length > 0 && (
        <div className="mt-6 border rounded-md overflow-auto max-h-96 text-sm">
          <table className="min-w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                {Object.keys(previewData[0]).map((k) => (
                  <th key={k} className="px-2 py-1 text-left font-medium">
                    {k}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {previewData.map((r, i) => (
                <tr key={i} className="border-t">
                  {Object.entries(r).map(([k, v], j) => (
                    <td key={j} className="px-2 py-1">
                      {typeof v === "number"
                        ? Number(v).toLocaleString(undefined, {
                            maximumFractionDigits: 2,
                          })
                        : v?.toString() ?? "—"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

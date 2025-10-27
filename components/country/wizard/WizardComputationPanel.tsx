// /components/country/wizard/WizardComputationPanel.tsx
"use client";

import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/supabaseBrowser";

export default function WizardComputationPanel({
  countryIso,
  onPreview,
  onComplete,
}: {
  countryIso: string;
  onPreview: (data: any[]) => void;
  onComplete?: (data: any) => void;
}) {
  const supabase = supabaseBrowser();
  const [method, setMethod] = useState("multiply");
  const [targetLevel, setTargetLevel] = useState("ADM3");
  const [normalizePercent, setNormalizePercent] = useState(false);
  const [useScalar, setUseScalar] = useState(false);
  const [scalarValue, setScalarValue] = useState(1);
  const [loading, setLoading] = useState(false);

  const runPreview = async () => {
    setLoading(true);

    try {
      const { data, error } = await supabase
        .rpc("simulate_join_preview_autoaggregate", {
          p_table_a: "population_data",
          p_table_b: "poverty_rate",
          p_col_a: "population",
          p_col_b: "poverty_rate",
          p_country_iso: countryIso,
          p_method: method,
          p_target_level: targetLevel,
          p_use_scalar_b: useScalar,
          p_scalar_b_val: scalarValue,
          p_normalize_percent: normalizePercent,
        });

      if (error) throw error;
      onPreview(data || []);
    } catch (err: any) {
      console.error("Preview error:", err.message);
      alert("Failed to preview derived dataset: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 border rounded-lg bg-white shadow-sm">
      <h2 className="text-lg font-semibold mb-3">Computation Settings</h2>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium">Computation Method</label>
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            className="mt-1 w-full border rounded px-2 py-1"
          >
            <option value="multiply">Multiply</option>
            <option value="ratio">Ratio (A / B)</option>
            <option value="sum">Sum (A + B)</option>
            <option value="difference">Difference (A - B)</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium">Target Level</label>
          <select
            value={targetLevel}
            onChange={(e) => setTargetLevel(e.target.value)}
            className="mt-1 w-full border rounded px-2 py-1"
          >
            <option value="ADM4">ADM4</option>
            <option value="ADM3">ADM3</option>
            <option value="ADM2">ADM2</option>
          </select>
        </div>

        <div className="col-span-2 flex items-center gap-2 mt-2">
          <input
            type="checkbox"
            checked={normalizePercent}
            onChange={(e) => setNormalizePercent(e.target.checked)}
          />
          <label className="text-sm">Normalize B as Percentage (divide by 100)</label>
        </div>

        <div className="col-span-2 flex items-center gap-2 mt-2">
          <input
            type="checkbox"
            checked={useScalar}
            onChange={(e) => setUseScalar(e.target.checked)}
          />
          <label className="text-sm">Use Scalar for Dataset B</label>
          {useScalar && (
            <input
              type="number"
              value={scalarValue}
              onChange={(e) => setScalarValue(parseFloat(e.target.value))}
              className="ml-2 border rounded px-2 py-1 w-24"
            />
          )}
        </div>
      </div>

      <div className="mt-4 flex justify-end gap-3">
        <button
          onClick={runPreview}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          {loading ? "Running..." : "Preview Derived Dataset"}
        </button>
      </div>
    </div>
  );
}

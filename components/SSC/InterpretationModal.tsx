"use client";

import { useState, useEffect } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { X, Plus, Trash2 } from "lucide-react";

interface Props {
  open: boolean;
  dataset: any;
  instanceId: string;
  onClose: () => void;
  onUpdated: () => void;
}

export default function InterpretationModal({
  open,
  dataset,
  instanceId,
  onClose,
  onUpdated,
}: Props) {
  const [method, setMethod] = useState(dataset?.norm_method || "winsor_5_95");
  const [higherIsWorse, setHigherIsWorse] = useState(
    dataset?.higher_is_better === false
  );
  const [thresholds, setThresholds] = useState<number[]>(
    dataset?.norm_params?.thresholds || []
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (dataset) {
      setMethod(dataset.norm_method || "winsor_5_95");
      setHigherIsWorse(dataset.higher_is_better === false);
      setThresholds(dataset.norm_params?.thresholds || []);
    }
  }, [dataset]);

  const saveInterpretation = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("ssc_dataset_catalog")
        .update({
          norm_method: method,
          higher_is_better: !higherIsWorse,
          norm_params:
            method.includes("threshold") || method.includes("band")
              ? { thresholds }
              : {},
        })
        .eq("metric", dataset.metric)
        .eq("source_note", dataset.source_note);

      if (error) throw error;
      onUpdated();
      onClose();
    } catch (err) {
      console.error("Failed to save interpretation:", err);
    } finally {
      setSaving(false);
    }
  };

  if (!open || !dataset) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-40 flex justify-center items-start p-6 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-lg p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
        >
          <X className="h-5 w-5" />
        </button>

        <h2 className="text-xl font-semibold mb-4">
          Interpretation — {dataset.metric}
        </h2>

        {/* Method Selector */}
        <div className="mb-4">
          <label className="block font-medium mb-1">
            Normalization Method
          </label>
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            className="w-full border rounded p-2"
          >
            <option value="winsor_5_95">Winsorized Gradient (Continuous)</option>
            <option value="linear_1to4_to_1to5">
              Linear 1–4 to 1–5 (Continuous)
            </option>
            <option value="threshold_bands">
              Threshold Bands (Categorical)
            </option>
          </select>
          <p className="text-xs text-gray-500 mt-1">
            Gradient methods create continuous 1–5 scaling. Threshold methods
            assign discrete categories (e.g., Rural = 3, Urban = 1).
          </p>
        </div>

        {/* Directionality */}
        <div className="mb-4">
          <label className="inline-flex items-center">
            <input
              type="checkbox"
              checked={higherIsWorse}
              onChange={(e) => setHigherIsWorse(e.target.checked)}
              className="mr-2"
            />
            Higher values = worse (vulnerability)
          </label>
        </div>

        {/* Threshold bands */}
        {method.includes("threshold") || method.includes("band") ? (
          <div className="mb-4">
            <label className="block font-medium mb-2">
              Threshold Bands
            </label>
            <p className="text-xs text-gray-500 mb-2">
              Define numeric thresholds to split continuous values into bands.
              For example: 300 (rural ↦ 3), 1500 (urban ↦ 1). Values between are
              assigned intermediate categories.
            </p>

            {thresholds.map((t, idx) => (
              <div key={idx} className="flex items-center mb-2">
                <input
                  type="number"
                  className="border rounded p-2 w-full"
                  value={t}
                  onChange={(e) => {
                    const newVals = [...thresholds];
                    newVals[idx] = parseFloat(e.target.value);
                    setThresholds(newVals);
                  }}
                />
                <button
                  onClick={() =>
                    setThresholds(thresholds.filter((_, i) => i !== idx))
                  }
                  className="ml-2 text-red-500 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}

            <button
              onClick={() => setThresholds([...thresholds, 0])}
              className="text-blue-600 text-sm mt-1 flex items-center"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Threshold
            </button>
          </div>
        ) : null}

        {/* Save */}
        <div className="flex justify-end mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 mr-3 rounded border border-gray-300 hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            disabled={saving}
            onClick={saveInterpretation}
            className="px-4 py-2 rounded bg-[color:var(--gsc-green)] text-white font-medium hover:bg-green-700"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

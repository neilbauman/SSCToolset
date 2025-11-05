"use client";

import { useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";

interface Band {
  op: string;
  value?: number;
  min?: number;
  max?: number;
  score: number;
}

interface Props {
  open: boolean;
  dataset: any;
  instanceId: string;
  onClose: () => void;
  onUpdated?: () => void;
}

export default function InterpretationModal({
  open,
  dataset,
  instanceId,
  onClose,
  onUpdated,
}: Props) {
  const [method, setMethod] = useState(dataset.norm_method || "winsor_5_95");
  const [higherIsWorse, setHigherIsWorse] = useState(
    dataset.higher_is_better || false
  );
  const [bands, setBands] = useState<Band[]>(
    dataset.norm_params?.bands || [
      { op: "<", value: 300, score: 3 },
      { op: "between", min: 300, max: 1500, score: 2 },
      { op: ">=", value: 1500, score: 1 },
    ]
  );
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  const addBand = () =>
    setBands([
      ...bands,
      { op: "<", value: 0, score: 3 },
    ]);

  const removeBand = (idx: number) => {
    const updated = [...bands];
    updated.splice(idx, 1);
    setBands(updated);
  };

  const updateBand = (idx: number, field: keyof Band, value: any) => {
    const updated = [...bands];
    (updated[idx] as any)[field] = value;
    setBands(updated);
  };

  const save = async () => {
    setSaving(true);
    try {
      const norm_params =
        method.includes("threshold") || method.includes("band")
          ? { bands }
          : {};

      const dataType = method.includes("threshold") ? "categorical" : "gradient";

      const { error } = await supabase.rpc("save_interpretation", {
        p_metric: dataset.metric,
        p_source_note: dataset.source_note,
        p_pillar: dataset.pillar || "ssc_p3",
        p_norm_method: method,
        p_norm_params: norm_params,
        p_higher_is_better: higherIsWorse,
        p_data_type: dataType,
      });

      if (error) throw error;

      if (onUpdated) onUpdated();
      onClose();
    } catch (err) {
      console.error(err);
      alert("Failed to save interpretation.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className={`fixed inset-0 flex items-center justify-center bg-black/50 z-50 ${
        open ? "" : "hidden"
      }`}
    >
      <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full p-6">
        <h2 className="text-lg font-semibold mb-1">
          Interpretation — {dataset.metric}
        </h2>
        <p className="text-sm text-gray-500 mb-4">
          Define how values are converted to 1–5 scores.
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Normalization Method
            </label>
            <select
              className="border rounded px-2 py-1 w-full"
              value={method}
              onChange={(e) => setMethod(e.target.value)}
            >
              <option value="winsor_5_95">
                Winsorized Gradient (Continuous)
              </option>
              <option value="linear_1to4_to_1to5">
                Linear 1–4 to 1–5 (Continuous)
              </option>
              <option value="threshold_bands">Threshold Bands</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Gradient methods produce continuous scaling. Threshold bands assign
              discrete scores (1–5).
            </p>
          </div>

          <div>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={higherIsWorse}
                onChange={(e) => setHigherIsWorse(e.target.checked)}
              />
              <span className="text-sm">
                Higher values = worse (vulnerability)
              </span>
            </label>
          </div>

          {method.includes("threshold") && (
            <div>
              <h3 className="font-medium text-sm mt-2">Threshold Bands</h3>
              <p className="text-xs text-gray-500 mb-2">
                Define thresholds to split continuous values into bands.
              </p>
              {bands.map((b, i) => (
                <div
                  key={i}
                  className="flex items-center space-x-2 mb-1 text-sm"
                >
                  <select
                    className="border rounded px-2 py-1"
                    value={b.op}
                    onChange={(e) => updateBand(i, "op", e.target.value)}
                  >
                    <option value="<">{"<"}</option>
                    <option value="between">between</option>
                    <option value=">=">{">="}</option>
                  </select>

                  {b.op === "between" ? (
                    <>
                      <input
                        type="number"
                        value={b.min || 0}
                        onChange={(e) =>
                          updateBand(i, "min", parseFloat(e.target.value))
                        }
                        className="border rounded px-2 py-1 w-20"
                      />
                      <span>–</span>
                      <input
                        type="number"
                        value={b.max || 0}
                        onChange={(e) =>
                          updateBand(i, "max", parseFloat(e.target.value))
                        }
                        className="border rounded px-2 py-1 w-20"
                      />
                    </>
                  ) : (
                    <input
                      type="number"
                      value={b.value || 0}
                      onChange={(e) =>
                        updateBand(i, "value", parseFloat(e.target.value))
                      }
                      className="border rounded px-2 py-1 w-20"
                    />
                  )}

                  <span className="ml-2">Score:</span>
                  <input
                    type="number"
                    value={b.score}
                    min={1}
                    max={5}
                    onChange={(e) =>
                      updateBand(i, "score", parseInt(e.target.value))
                    }
                    className="border rounded px-2 py-1 w-16"
                  />

                  <button
                    onClick={() => removeBand(i)}
                    className="text-red-600 text-xs ml-2"
                  >
                    Remove
                  </button>
                </div>
              ))}
              <button
                onClick={addBand}
                className="text-sm text-blue-600 mt-2 hover:underline"
              >
                + Add Band
              </button>
            </div>
          )}
        </div>

        <div className="flex justify-end space-x-2 mt-6">
          <button
            onClick={onClose}
            className="px-3 py-1 border rounded text-sm text-gray-600"
          >
            Cancel
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="px-3 py-1 bg-[color:var(--gsc-green)] text-white rounded text-sm"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

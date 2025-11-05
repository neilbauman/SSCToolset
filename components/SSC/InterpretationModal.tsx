"use client";

import { useState, useEffect } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { X, Plus, Trash2 } from "lucide-react";

type Props = {
  open: boolean;
  dataset: any;
  instanceId: string;
  onClose: () => void;
  onUpdated?: () => void;
};

type Band = {
  op: "<" | ">" | "<=" | ">=" | "between";
  min?: number;
  max?: number;
  value?: number;
  score: number;
};

export default function InterpretationModal({
  open,
  dataset,
  instanceId,
  onClose,
  onUpdated,
}: Props) {
  const [saving, setSaving] = useState(false);
  const [method, setMethod] = useState(dataset.norm_method || "winsor_5_95");
  const [higherIsWorse, setHigherIsWorse] = useState(
    dataset.higher_is_better || false
  );
  const [bands, setBands] = useState<Band[]>([]);

  useEffect(() => {
    if (!open) return;
    const params = dataset.norm_params || {};
    if (params.bands) {
      setBands(params.bands);
    } else if (params.thresholds) {
      // legacy threshold pair
      const [min, max] = params.thresholds;
      setBands([
        { op: "<", value: min, score: 3 },
        { op: "between", min, max, score: 2 },
        { op: ">=", value: max, score: 1 },
      ]);
    } else {
      setBands([]);
    }
  }, [dataset, open]);

  if (!open) return null;

  const addBand = () =>
    setBands([...bands, { op: "<", value: 0, score: 3 }]);

  const removeBand = (i: number) =>
    setBands(bands.filter((_, idx) => idx !== i));

  const updateBand = (i: number, next: Partial<Band>) => {
    setBands((prev) => {
      const clone = [...prev];
      clone[i] = { ...clone[i], ...next };
      return clone;
    });
  };

  const save = async () => {
    setSaving(true);
    try {
      let norm_params: any = {};
      if (method.includes("threshold")) {
        norm_params = { bands };
      }

      const { error } = await supabase
        .from("ssc_dataset_catalog")
        .update({
          norm_method: method,
          norm_params,
          higher_is_better: higherIsWorse,
          data_type: method.includes("threshold")
            ? "categorical"
            : "gradient",
          updated_at: new Date().toISOString(),
        })
        .eq("metric", dataset.metric)
        .eq("source_note", dataset.source_note);

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white w-full max-w-3xl rounded-lg shadow-lg overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center border-b px-4 py-3">
          <div>
            <h2 className="text-lg font-semibold">
              Interpretation — {dataset.metric}
            </h2>
            <p className="text-xs text-gray-500">
              Define how values are converted to 1–5 scores.
            </p>
          </div>
          <button
            className="p-1 rounded hover:bg-gray-100"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Normalization Method
            </label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="border rounded px-3 py-2 w-72 text-sm"
            >
              <option value="winsor_5_95">
                Winsorized Gradient (Continuous)
              </option>
              <option value="linear_1to4_to_1to5">
                Linear 1–4 → 1–5 (Continuous)
              </option>
              <option value="threshold_bands">
                Threshold Bands (Categorical)
              </option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Gradient methods produce continuous 1–5 scaling.
              Threshold bands assign discrete scores.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <input
              id="dir"
              type="checkbox"
              checked={higherIsWorse}
              onChange={(e) => setHigherIsWorse(e.target.checked)}
              className="h-4 w-4"
            />
            <label htmlFor="dir" className="text-sm text-gray-700">
              Higher values = worse (vulnerability)
            </label>
          </div>

          {/* Threshold Bands Editor */}
          {method.includes("threshold") && (
            <div>
              <h3 className="font-medium mb-1">Threshold Bands</h3>
              <p className="text-xs text-gray-500 mb-3">
                Define thresholds for discrete scoring. Example: {"<"}300 → 3, between 300–1500 → 2, ≥1500 → 1.
              </p>
              <div className="overflow-x-auto border rounded">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="p-2 text-left">Operator</th>
                      <th className="p-2 text-left">Min / Value</th>
                      <th className="p-2 text-left">Max</th>
                      <th className="p-2 text-left">Score (1–5)</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {bands.map((b, i) => (
                      <tr key={i} className="border-t">
                        <td className="p-2">
                          <select
                            value={b.op}
                            onChange={(e) =>
                              updateBand(i, { op: e.target.value as Band["op"] })
                            }
                            className="border rounded px-2 py-1"
                          >
                            <option value="<">&lt;</option>
                            <option value="<=">&lt;=</option>
                            <option value=">">&gt;</option>
                            <option value=">=">&gt;=</option>
                            <option value="between">between</option>
                          </select>
                        </td>
                        <td className="p-2">
                          {b.op === "between" ? (
                            <input
                              type="number"
                              value={b.min ?? ""}
                              onChange={(e) =>
                                updateBand(i, {
                                  min: Number(e.target.value),
                                })
                              }
                              className="border rounded px-2 py-1 w-24"
                            />
                          ) : (
                            <input
                              type="number"
                              value={b.value ?? ""}
                              onChange={(e) =>
                                updateBand(i, {
                                  value: Number(e.target.value),
                                })
                              }
                              className="border rounded px-2 py-1 w-24"
                            />
                          )}
                        </td>
                        <td className="p-2">
                          {b.op === "between" ? (
                            <input
                              type="number"
                              value={b.max ?? ""}
                              onChange={(e) =>
                                updateBand(i, {
                                  max: Number(e.target.value),
                                })
                              }
                              className="border rounded px-2 py-1 w-24"
                            />
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="p-2">
                          <select
                            value={b.score}
                            onChange={(e) =>
                              updateBand(i, {
                                score: Number(e.target.value),
                              })
                            }
                            className="border rounded px-2 py-1 w-20"
                          >
                            {[1, 2, 3, 4, 5].map((s) => (
                              <option key={s} value={s}>
                                {s}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="p-2 text-right">
                          <button
                            onClick={() => removeBand(i)}
                            className="text-red-600 hover:underline text-xs"
                          >
                            <Trash2 className="inline h-3 w-3 mr-1" />
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                    {!bands.length && (
                      <tr>
                        <td
                          colSpan={5}
                          className="text-center text-gray-400 py-2"
                        >
                          No bands defined.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <button
                onClick={addBand}
                className="mt-3 flex items-center gap-2 text-sm border rounded px-3 py-1 hover:bg-gray-50"
              >
                <Plus className="h-4 w-4" />
                Add Band
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end items-center gap-2 border-t px-4 py-3">
          <button
            className="border rounded px-4 py-2 text-sm hover:bg-gray-50"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="px-4 py-2 rounded bg-[color:var(--gsc-green)] text-white text-sm hover:opacity-90 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

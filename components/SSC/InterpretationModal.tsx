"use client";

import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { X, Plus, Trash2, RotateCcw, Play } from "lucide-react";

type DatasetRow = {
  metric: string;
  source_note: string;
  pillar: string;
  data_type: "gradient" | "categorical";
  norm_method: string | null;
  norm_params: any | null;
  higher_is_better: boolean | null;
  admin_level?: string | null;
};

type Band = {
  op: "<" | ">=" | "between";
  value?: number; // for < or >=
  min?: number; // for between
  max?: number; // for between
  score: number; // 1-5
};

type Props = {
  open: boolean;
  dataset: DatasetRow;
  instanceId: string;
  onClose: () => void;
  onUpdated: () => void;
};

export default function InterpretationModal({
  open,
  dataset,
  instanceId,
  onClose,
  onUpdated,
}: Props) {
  const [saving, setSaving] = useState(false);
  const [applying, setApplying] = useState(false);

  // Local working state (so you can change without persisting immediately)
  const [method, setMethod] = useState<string>("winsor_5_95");
  const [higherIsWorse, setHigherIsWorse] = useState<boolean>(true);
  const [bands, setBands] = useState<Band[]>([]);
  const [dataType, setDataType] = useState<"gradient" | "categorical">("gradient");

  useEffect(() => {
    if (!open || !dataset) return;
    // seed from catalog
    setMethod(dataset.norm_method || "winsor_5_95");
    setHigherIsWorse(dataset.higher_is_better !== false); // default to higher = worse unless explicitly false
    setDataType(dataset.data_type || "gradient");

    const np = dataset.norm_params || {};
    if (np.bands && Array.isArray(np.bands)) {
      setBands(
        np.bands.map((b: any) => ({
          op: b.op,
          value: b.value != null ? Number(b.value) : undefined,
          min: b.min != null ? Number(b.min) : undefined,
          max: b.max != null ? Number(b.max) : undefined,
          score: Number(b.score),
        }))
      );
    } else if (np.thresholds && Array.isArray(np.thresholds)) {
      // legacy thresholds -> convert to bands example
      // e.g. [300, 1500] => <300 => 3, between => 2, >=1500 => 1
      const t = np.thresholds.map((n: any) => Number(n)).sort((a: number, b: number) => a - b);
      if (t.length === 2) {
        setBands([
          { op: "<", value: t[0], score: 3 },
          { op: "between", min: t[0], max: t[1], score: 2 },
          { op: ">=", value: t[1], score: 1 },
        ]);
      } else {
        setBands([]);
      }
    } else {
      // if no params, keep any existing bands or use empty
      setBands((prev) => prev.length ? prev : []);
    }
  }, [open, dataset]);

  const addBand = () => {
    setBands((b) => [...b, { op: "<", value: 0, score: 3 }]);
  };

  const removeBand = (idx: number) => {
    setBands((b) => b.filter((_, i) => i !== idx));
  };

  const resetToDefault = () => {
    // Simple default used often for population density
    setMethod("threshold_bands");
    setDataType("gradient");
    setHigherIsWorse(true);
    setBands([
      { op: "<", value: 300, score: 3 },
      { op: "between", min: 300, max: 1500, score: 2 },
      { op: ">=", value: 1500, score: 1 },
    ]);
  };

  const normParams = useMemo(() => {
    if (method === "threshold_bands") {
      return { bands: bands };
    }
    return {}; // winsor/linear do not need params here
  }, [method, bands]);

  const saveCatalog = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("ssc_dataset_catalog")
        .update({
          data_type: dataType,
          norm_method: method,
          norm_params: normParams,
          higher_is_better: higherIsWorse,
        })
        .eq("metric", dataset.metric)
        .eq("source_note", dataset.source_note);
      if (error) throw error;
      onUpdated();
      alert("Saved interpretation settings.");
    } finally {
      setSaving(false);
    }
  };

  const applyNow = async () => {
    setApplying(true);
    try {
      // Ensure catalog is saved first so RPC reads latest settings
      await saveCatalog();

      // Dispatch correct RPC
      if (method === "threshold_bands") {
        const { error } = await supabase.rpc(
          "apply_threshold_bands_for_dataset_instance",
          {
            p_instance_id: instanceId,
            p_metric: dataset.metric,
            p_source_note: dataset.source_note,
          }
        );
        if (error) throw error;
      } else if (
        method === "winsor_5_95" ||
        method === "linear_1to4_to_1to5" ||
        method === "linear_1to4_to_1to5_invert" ||
        method === "winsor_5_95_invert"
      ) {
        const { error } = await supabase.rpc(
          "apply_normalization_for_dataset_instance",
          {
            p_instance_id: instanceId,
            p_metric: dataset.metric,
            p_source_note: dataset.source_note,
          }
        );
        if (error) throw error;
      } else {
        // fallback to the classification RPC if ever used
        const { error } = await supabase.rpc(
          "apply_threshold_classification_for_dataset_instance",
          {
            p_instance_id: instanceId,
            p_metric: dataset.metric,
            p_source_note: dataset.source_note,
          }
        );
        if (error) throw error;
      }

      alert("Applied to instance.");
    } finally {
      setApplying(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/40 z-40 flex items-center justify-center p-3">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        <header className="px-4 py-2 border-b flex items-center justify-between">
          <h3 className="font-semibold text-sm">
            Interpret: {dataset.metric} —{" "}
            <span className="text-gray-600">{dataset.source_note}</span>{" "}
            <span className="text-gray-500">
              ({dataset.admin_level || "—"})
            </span>
          </h3>
          <button
            onClick={onClose}
            className="text-gray-600 hover:text-black p-1 rounded"
            title="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="p-4 space-y-4 overflow-auto">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-gray-600 mb-1">
                Dataset type
              </label>
              <select
                value={dataType}
                onChange={(e) =>
                  setDataType(e.currentTarget.value as "gradient" | "categorical")
                }
                className="w-full border rounded px-2 py-1 text-sm"
              >
                <option value="gradient">Gradient</option>
                <option value="categorical">Categorical</option>
              </select>
            </div>

            <div>
              <label className="block text-xs text-gray-600 mb-1">Method</label>
              <select
                value={method}
                onChange={(e) => setMethod(e.currentTarget.value)}
                className="w-full border rounded px-2 py-1 text-sm"
              >
                <option value="winsor_5_95">Winsor (P5–P95) → 1–5</option>
                <option value="linear_1to4_to_1to5">Linear 1–4 → 1–5</option>
                <option value="threshold_bands">Threshold Bands (1–5)</option>
                <option value="winsor_5_95_invert">
                  Winsor (inverted high→low)
                </option>
                <option value="linear_1to4_to_1to5_invert">
                  Linear 1–4 → 1–5 (invert)
                </option>
              </select>
            </div>

            <div>
              <label className="block text-xs text-gray-600 mb-1">
                Direction (higher values)
              </label>
              <select
                value={higherIsWorse ? "worse" : "better"}
                onChange={(e) => setHigherIsWorse(e.currentTarget.value === "worse")}
                className="w-full border rounded px-2 py-1 text-sm"
              >
                <option value="worse">are worse (↑ → 5)</option>
                <option value="better">are better (↑ → 1)</option>
              </select>
            </div>
          </div>

          {method === "threshold_bands" && (
            <div className="border rounded p-3">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-sm">Threshold bands</h4>
                <div className="flex items-center gap-2">
                  <button
                    onClick={resetToDefault}
                    className="text-xs text-gray-700 hover:underline flex items-center gap-1"
                    title="Set common defaults"
                  >
                    <RotateCcw className="h-3 w-3" />
                    Use default (300 / 1500)
                  </button>
                  <button
                    onClick={addBand}
                    className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                    title="Add band"
                  >
                    <Plus className="h-3 w-3" />
                    Add band
                  </button>
                </div>
              </div>

              <div className="overflow-auto">
                <table className="w-full text-[13px]">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="p-2 text-left w-28">Operator</th>
                      <th className="p-2 text-left w-28">Value / Min</th>
                      <th className="p-2 text-left w-28">Max</th>
                      <th className="p-2 text-left w-28">Score (1–5)</th>
                      <th className="p-2 text-right w-12">Remove</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bands.map((b, i) => (
                      <tr key={i} className="border-t">
                        <td className="p-2">
                          <select
                            value={b.op}
                            onChange={(e) => {
                              const op = e.currentTarget.value as Band["op"];
                              setBands((all) =>
                                all.map((x, idx) =>
                                  idx === i
                                    ? {
                                        op,
                                        score: x.score,
                                        value:
                                          op !== "between"
                                            ? x.value ?? 0
                                            : undefined,
                                        min:
                                          op === "between"
                                            ? x.min ?? 0
                                            : undefined,
                                        max:
                                          op === "between"
                                            ? x.max ?? 0
                                            : undefined,
                                      }
                                    : x
                                )
                              );
                            }}
                            className="border rounded px-2 py-1 text-sm"
                          >
                            <option value="<">&lt;</option>
                            <option value=">=">&ge;</option>
                            <option value="between">between</option>
                          </select>
                        </td>
                        <td className="p-2">
                          {b.op === "between" ? (
                            <input
                              type="number"
                              value={b.min ?? 0}
                              onChange={(e) =>
                                setBands((all) =>
                                  all.map((x, idx) =>
                                    idx === i
                                      ? { ...x, min: Number(e.currentTarget.value) }
                                      : x
                                  )
                                )
                              }
                              className="border rounded px-2 py-1 w-24 text-sm"
                            />
                          ) : (
                            <input
                              type="number"
                              value={b.value ?? 0}
                              onChange={(e) =>
                                setBands((all) =>
                                  all.map((x, idx) =>
                                    idx === i
                                      ? { ...x, value: Number(e.currentTarget.value) }
                                      : x
                                  )
                                )
                              }
                              className="border rounded px-2 py-1 w-24 text-sm"
                            />
                          )}
                        </td>
                        <td className="p-2">
                          {b.op === "between" ? (
                            <input
                              type="number"
                              value={b.max ?? 0}
                              onChange={(e) =>
                                setBands((all) =>
                                  all.map((x, idx) =>
                                    idx === i
                                      ? { ...x, max: Number(e.currentTarget.value) }
                                      : x
                                  )
                                )
                              }
                              className="border rounded px-2 py-1 w-24 text-sm"
                            />
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            min={1}
                            max={5}
                            value={b.score}
                            onChange={(e) =>
                              setBands((all) =>
                                all.map((x, idx) =>
                                  idx === i
                                    ? { ...x, score: Number(e.currentTarget.value) }
                                    : x
                                )
                              )
                            }
                            className="border rounded px-2 py-1 w-20 text-sm"
                          />
                        </td>
                        <td className="p-2 text-right">
                          <button
                            onClick={() => removeBand(i)}
                            className="text-red-600 hover:underline"
                            title="Remove band"
                          >
                            <Trash2 className="inline h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {!bands.length && (
                      <tr>
                        <td colSpan={5} className="p-3 text-gray-500 text-center">
                          No bands defined. Click “Add band”.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <p className="text-xs text-gray-500 mt-2">
                Thresholds work for any dataset (not just categorical). They map raw values
                to 1–5 scores using the bands above; enable invertible patterns by swapping
                scores (e.g., make high values → higher scores).
              </p>
            </div>
          )}

          {method !== "threshold_bands" && (
            <div className="border rounded p-3">
              <h4 className="font-semibold text-sm mb-1">Notes</h4>
              <ul className="text-xs text-gray-600 list-disc pl-5 space-y-1">
                <li>
                  <strong>Winsor (P5–P95)</strong>: clamps to P5/P95 then scales to 1–5.
                </li>
                <li>
                  <strong>Linear 1–4 → 1–5</strong>: remaps an input that is already 1–4
                  onto a 1–5 scale (useful for typology SSCs).
                </li>
                <li>
                  “Invert” variants flip the direction (higher values → lower scores).
                </li>
              </ul>
            </div>
          )}
        </div>

        <footer className="p-3 border-t flex items-center justify-end gap-2">
          <button
            onClick={saveCatalog}
            disabled={saving || applying}
            className="px-3 py-1.5 rounded border text-sm hover:bg-gray-50 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save settings"}
          </button>
          <button
            onClick={applyNow}
            disabled={saving || applying}
            className="px-3 py-1.5 rounded bg-[color:var(--gsc-green)] text-white text-sm hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
            title="Apply to instance (persist scores)"
          >
            <Play className="h-3 w-3" />
            {applying ? "Applying…" : "Apply to Instance"}
          </button>
        </footer>
      </div>
    </div>
  );
}

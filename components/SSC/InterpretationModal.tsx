"use client";

import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";

type Props = {
  open: boolean;
  dataset: any; // from ssc_dataset_catalog row
  instanceId: string;
  onClose: () => void;
  onUpdated?: () => void;
};

type Band =
  | { op: "<" | "<=" | ">=" | ">" ; value: number; score: number }
  | { op: "between"; min: number; max: number; score: number };

const METHOD_LABELS: Record<string, string> = {
  winsor_5_95: "Winsorize 5–95% (gradient)",
  linear_1to4_to_1to5: "Linear (1–4 → 1–5) (categorical)",
  threshold_categorical: "Threshold (categorical)",
  threshold_bands: "Threshold Bands (gradient)",
};

const METHOD_OPTIONS = [
  { value: "winsor_5_95", label: METHOD_LABELS["winsor_5_95"] },
  { value: "linear_1to4_to_1to5", label: METHOD_LABELS["linear_1to4_to_1to5"] },
  { value: "threshold_categorical", label: METHOD_LABELS["threshold_categorical"] },
  { value: "threshold_bands", label: METHOD_LABELS["threshold_bands"] },
];

const SCORES = [1, 2, 3, 4, 5];

export default function InterpretationModal({
  open,
  dataset,
  instanceId,
  onClose,
  onUpdated,
}: Props) {
  const [saving, setSaving] = useState(false);

  // base method/direction/params from current row
  const initialMethod = useMemo(
    () => dataset?.norm_method || "winsor_5_95",
    [dataset]
  );
  const [method, setMethod] = useState<string>(initialMethod);

  // Historically “higher_is_better” in your table was displayed as “↑ higher = worse”.
  // To keep compatibility we preserve the same boolean flag:
  // true  => higher values are worse (vulnerability ↑)   (ascending risk)
  // false => lower values are worse (vulnerability ↑ when value ↓) (descending risk)
  const [higherIsWorse, setHigherIsWorse] = useState<boolean>(
    !!dataset?.higher_is_better
  );

  // Generic thresholds (kept for 'threshold_categorical' legacy)
  const [thresholds, setThresholds] = useState<number[]>(
    Array.isArray(dataset?.norm_params?.thresholds)
      ? dataset.norm_params.thresholds
      : []
  );

  // New: bands for gradient thresholding
  const [bands, setBands] = useState<Band[]>(
    Array.isArray(dataset?.norm_params?.bands)
      ? dataset.norm_params.bands
      : defaultBandsFor(dataset)
  );

  useEffect(() => {
    setMethod(initialMethod);
    setHigherIsWorse(!!dataset?.higher_is_better);
    setThresholds(
      Array.isArray(dataset?.norm_params?.thresholds)
        ? dataset.norm_params.thresholds
        : []
    );
    setBands(
      Array.isArray(dataset?.norm_params?.bands)
        ? dataset.norm_params.bands
        : defaultBandsFor(dataset)
    );
  }, [dataset, initialMethod]);

  if (!open) return null;

  const showDirectionToggle =
    method !== "threshold_bands" && method !== "threshold_categorical";

  const addThreshold = () => setThresholds((t) => [...t, 0]);

  const updateThreshold = (i: number, val: number) => {
    const next = [...thresholds];
    next[i] = val;
    setThresholds(next);
  };

  const removeThreshold = (i: number) =>
    setThresholds((t) => t.filter((_, idx) => idx !== i));

  // --- Bands helpers ---
  const addBand = () =>
    setBands((b) => [
      ...b,
      { op: "between", min: 0, max: 0, score: 3 } as Band,
    ]);

  const removeBand = (i: number) =>
    setBands((b) => b.filter((_, idx) => idx !== i));

  const updateBand = (i: number, patch: Partial<Band>) => {
    setBands((b) => {
      const next = [...b];
      next[i] = { ...(next[i] as any), ...patch } as Band;
      return next;
    });
  };

  const normalizedParams = useMemo(() => {
    if (method === "threshold_categorical") {
      return { thresholds };
    }
    if (method === "threshold_bands") {
      return { bands };
    }
    return {};
  }, [method, thresholds, bands]);

  const save = async () => {
    try {
      setSaving(true);

      // Build update payload
      const payload: any = {
        norm_method: method,
        norm_params: normalizedParams,
      };

      // For gradient (winsor) or linear: keep direction switch
      // For threshold_bands: score is explicitly carried by bands, so we ignore direction flag
      if (method === "threshold_bands") {
        payload.higher_is_better = null;
      } else {
        payload.higher_is_better = higherIsWorse ? true : false;
      }

      const { error } = await supabase
        .from("ssc_dataset_catalog")
        .update(payload)
        .eq("metric", dataset.metric)
        .eq("source_note", dataset.source_note);

      if (error) throw error;

      onUpdated?.();
      onClose();
    } catch (e) {
      console.error("Save interpretation failed:", e);
      alert("Failed to save interpretation. See console for details.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4">
      <div className="w-full max-w-3xl rounded-lg bg-white shadow-lg">
        <header className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="font-semibold text-lg">
            Interpretation — <span className="text-gray-600">{dataset?.metric}</span>
          </h2>
          <button
            onClick={onClose}
            className="rounded p-1 text-gray-500 hover:bg-gray-100"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="space-y-5 px-4 py-4 text-sm">
          {/* Method */}
          <div>
            <label className="block text-gray-700 mb-1">Normalization Method</label>
            <select
              value={method}
              onChange={(e) => setMethod(e.currentTarget.value)}
              className="w-full border rounded px-3 py-2"
            >
              {METHOD_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500">
              <strong>Threshold Bands (gradient)</strong> lets you define explicit
              value ranges (e.g., “&lt; 300”, “300–1500”, “≥ 1500”) and assign each a
              score from 1–5. Use this when you need banded rules while keeping the
              dataset treated as a gradient.
            </p>
          </div>

          {/* Direction toggle (hidden when bands define the scoring explicitly) */}
          {showDirectionToggle && (
            <div className="flex items-center gap-2">
              <input
                id="dir"
                type="checkbox"
                checked={higherIsWorse}
                onChange={(e) => setHigherIsWorse(e.currentTarget.checked)}
              />
              <label htmlFor="dir" className="text-gray-700">
                Higher values = worse (vulnerability)
              </label>
            </div>
          )}

          {/* Threshold categorical (legacy) */}
          {method === "threshold_categorical" && (
            <div>
              <label className="block text-gray-700 mb-2">Thresholds</label>
              <div className="space-y-2">
                {thresholds.map((t, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      type="number"
                      value={t}
                      onChange={(e) => updateThreshold(i, Number(e.currentTarget.value))}
                      className="w-full border rounded px-3 py-2"
                    />
                    <button
                      onClick={() => removeThreshold(i)}
                      className="text-red-600 text-sm hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
              <button
                onClick={addThreshold}
                className="mt-2 text-sm text-blue-600 hover:underline"
              >
                + Add Threshold
              </button>
              <p className="mt-1 text-xs text-gray-500">
                Interprets thresholds as discrete cut points (category mapping). For
                banded gradient rules, use <em>Threshold Bands (gradient)</em>.
              </p>
            </div>
          )}

          {/* Threshold bands (gradient) */}
          {method === "threshold_bands" && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-gray-700">Bands (value → score)</label>
                <button
                  onClick={addBand}
                  className="text-sm text-blue-600 hover:underline"
                >
                  + Add Band
                </button>
              </div>

              <div className="space-y-2">
                {bands.map((b, i) => {
                  const isBetween = (b as any).op === "between";
                  return (
                    <div
                      key={i}
                      className="grid grid-cols-12 gap-2 items-center border rounded p-2 bg-gray-50"
                    >
                      {/* Operator */}
                      <div className="col-span-3">
                        <select
                          className="w-full border rounded px-2 py-1"
                          value={b.op as any}
                          onChange={(e) => {
                            const op = e.currentTarget.value as Band["op"];
                            if (op === "between") {
                              updateBand(i, { op: "between", min: 0, max: 0 });
                            } else {
                              updateBand(i, { op, value: 0 });
                            }
                          }}
                        >
                          <option value="<">&lt;</option>
                          <option value="<=">&le;</option>
                          <option value="between">between</option>
                          <option value=">=">&ge;</option>
                          <option value=">">&gt;</option>
                        </select>
                      </div>

                      {/* Values */}
                      {isBetween ? (
                        <>
                          <div className="col-span-3">
                            <input
                              type="number"
                              className="w-full border rounded px-2 py-1"
                              value={(b as any).min ?? 0}
                              onChange={(e) =>
                                updateBand(i, { min: Number(e.currentTarget.value) } as any)
                              }
                              placeholder="min"
                            />
                          </div>
                          <div className="col-span-3">
                            <input
                              type="number"
                              className="w-full border rounded px-2 py-1"
                              value={(b as any).max ?? 0}
                              onChange={(e) =>
                                updateBand(i, { max: Number(e.currentTarget.value) } as any)
                              }
                              placeholder="max"
                            />
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="col-span-6">
                            <input
                              type="number"
                              className="w-full border rounded px-2 py-1"
                              value={(b as any).value ?? 0}
                              onChange={(e) =>
                                updateBand(i, { value: Number(e.currentTarget.value) } as any)
                              }
                              placeholder="value"
                            />
                          </div>
                        </>
                      )}

                      {/* Score */}
                      <div className="col-span-2">
                        <select
                          className="w-full border rounded px-2 py-1"
                          value={b.score}
                          onChange={(e) =>
                            updateBand(i, { score: Number(e.currentTarget.value) } as any)
                          }
                        >
                          {SCORES.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Remove */}
                      <div className="col-span-1 text-right">
                        <button
                          onClick={() => removeBand(i)}
                          className="text-red-600 text-sm hover:underline"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <p className="mt-2 text-xs text-gray-500">
                Bands are evaluated in order. The first matching band assigns the
                score. Define catch-all bands (e.g., “≥ 1500”) to avoid gaps.
              </p>
            </div>
          )}
        </div>

        <footer className="flex items-center justify-end gap-2 border-t px-4 py-3">
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded border text-sm hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="px-3 py-1.5 rounded bg-[color:var(--gsc-green)] text-white text-sm hover:opacity-90 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </footer>
      </div>
    </div>
  );
}

/**
 * Provide sensible defaults for banded scoring when none exist.
 * We detect common metrics and pre-fill bands for faster UX.
 */
function defaultBandsFor(dataset: any): Band[] {
  const metric = (dataset?.metric || "").toLowerCase();

  // Example: population_density desired default
  if (metric.includes("population_density")) {
    // <300 => 3, 300–1500 => 2, ≥1500 => 1  (user’s stated rule)
    return [
      { op: "<", value: 300, score: 3 },
      { op: "between", min: 300, max: 1500, score: 2 },
      { op: ">=", value: 1500, score: 1 },
    ];
  }

  // Otherwise, provide neutral template (three bands)
  return [
    { op: "<", value: 0, score: 3 },
    { op: "between", min: 0, max: 1, score: 2 },
    { op: ">=", value: 1, score: 1 },
  ];
}

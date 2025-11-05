"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";

type Props = {
  open: boolean;
  dataset: any;
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
  const [method, setMethod] = useState(dataset.norm_method || "winsor_5_95");
  const [higher, setHigher] = useState(!!dataset.higher_is_better);
  const [thresholds, setThresholds] = useState<number[]>(
    dataset.norm_params?.thresholds || []
  );
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  const addThreshold = () => setThresholds([...thresholds, 0]);
  const updateThreshold = (i: number, val: number) => {
    const next = [...thresholds];
    next[i] = val;
    setThresholds(next);
  };
  const removeThreshold = (i: number) =>
    setThresholds(thresholds.filter((_, idx) => idx !== i));

  const save = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("ssc_dataset_catalog")
        .update({
          norm_method: method,
          higher_is_better: higher,
          norm_params: { thresholds },
        })
        .eq("metric", dataset.metric)
        .eq("source_note", dataset.source_note);

      if (error) throw error;
      onUpdated();
      onClose();
    } catch (err) {
      console.error("Error saving interpretation:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg max-w-lg w-full p-4 relative">
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
        >
          <X className="h-5 w-5" />
        </button>

        <h2 className="text-lg font-semibold mb-4">
          Interpretation — {dataset.metric}
        </h2>

        <div className="space-y-3">
          <div>
            <label className="block text-sm text-gray-600 mb-1">
              Normalization Method
            </label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="border rounded px-3 py-1.5 w-full text-sm"
            >
              <option value="winsor_5_95">Winsor (5–95%)</option>
              <option value="linear_1to4_to_1to5">Linear 1–4 → 1–5</option>
              <option value="threshold_categorical">
                Threshold (categorical)
              </option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={higher}
              onChange={(e) => setHigher(e.target.checked)}
            />
            <label className="text-sm text-gray-700">
              Higher values = worse (vulnerability)
            </label>
          </div>

          {method === "threshold_categorical" && (
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Thresholds
              </label>
              {thresholds.map((t, i) => (
                <div key={i} className="flex items-center gap-2 mb-1">
                  <input
                    type="number"
                    value={t}
                    onChange={(e) =>
                      updateThreshold(i, parseFloat(e.target.value) || 0)
                    }
                    className="border rounded px-2 py-1 text-sm w-full"
                  />
                  <button
                    onClick={() => removeThreshold(i)}
                    className="text-red-500 text-xs"
                  >
                    Remove
                  </button>
                </div>
              ))}
              <button
                onClick={addThreshold}
                className="text-sm text-blue-600 hover:underline"
              >
                + Add Threshold
              </button>
            </div>
          )}
        </div>

        <div className="flex justify-end mt-4 gap-2">
          <button
            onClick={onClose}
            className="px-3 py-1.5 border rounded text-sm text-gray-600 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="px-3 py-1.5 bg-[color:var(--gsc-green)] text-white rounded text-sm hover:opacity-90 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

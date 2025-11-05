"use client";

import { useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { X } from "lucide-react";

type InterpretationModalProps = {
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
}: InterpretationModalProps) {
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
  const removeThreshold = (i: number) => {
    const next = thresholds.filter((_, idx) => idx !== i);
    setThresholds(next);
  };

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("ssc_dataset_catalog")
      .update({
        norm_method: method,
        higher_is_better: higher,
        norm_params: { thresholds },
      })
      .eq("metric", dataset.metric)
      .eq("source_note", dataset.source_note);

    if (!error) {
      onUpdated?.();
      onClose();
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-md shadow-lg">
        <header className="px-4 py-2 bg-[color:var(--gsc-green)] text-white flex justify-between items-center rounded-t-lg">
          <h3 className="font-semibold text-sm">Interpretation – {dataset.metric}</h3>
          <X onClick={onClose} className="h-4 w-4 cursor-pointer" />
        </header>

        <div className="p-4 space-y-4 text-sm">
          <div>
            <label className="block text-gray-600 mb-1">Normalization Method</label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="border rounded px-2 py-1 w-full"
            >
              <option value="winsor_5_95">1–5 (Winsorized)</option>
              <option value="linear_1to4_to_1to5">1–4 → 1–5 (Typology)</option>
              <option value="lookup">Categorical Lookup</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={higher}
              onChange={(e) => setHigher(e.target.checked)}
            />
            <label>Higher is better (uncheck to invert)</label>
          </div>

          {/* Thresholds */}
          <div>
            <label className="block text-gray-600 mb-2">Thresholds</label>
            {thresholds.map((t, i) => (
              <div key={i} className="flex items-center gap-2 mb-1">
                <input
                  type="number"
                  value={t}
                  onChange={(e) => updateThreshold(i, parseFloat(e.target.value))}
                  className="border rounded px-2 py-1 w-28"
                />
                <button
                  onClick={() => removeThreshold(i)}
                  className="text-red-500 text-xs hover:underline"
                >
                  Remove
                </button>
              </div>
            ))}
            <button
              onClick={addThreshold}
              className="text-[color:var(--gsc-green)] text-xs hover:underline mt-1"
            >
              + Add threshold
            </button>
          </div>
        </div>

        <footer className="p-3 flex justify-end bg-gray-50 rounded-b-lg">
          <button
            onClick={save}
            disabled={saving}
            className="px-3 py-1.5 bg-[color:var(--gsc-green)] text-white rounded text-sm hover:opacity-90"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </footer>
      </div>
    </div>
  );
}

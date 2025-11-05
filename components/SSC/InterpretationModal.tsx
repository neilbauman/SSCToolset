"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { X } from "lucide-react";

export default function InterpretationModal({ open, dataset, instanceId, onClose, onUpdated }: any) {
  const [method, setMethod] = useState(dataset.norm_method || "winsor_5_95");
  const [higher, setHigher] = useState(!!dataset.higher_is_better);
  const [thresholds, setThresholds] = useState<number[]>(
    dataset.norm_params?.thresholds || [300, 1500]
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setMethod(dataset.norm_method || "winsor_5_95");
    setHigher(!!dataset.higher_is_better);
    setThresholds(dataset.norm_params?.thresholds || [300, 1500]);
  }, [open, dataset]);

  if (!open) return null;

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

    if (!error) onUpdated?.();
    setSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-lg">
        <header className="px-4 py-2 bg-[color:var(--gsc-green)] text-white flex justify-between items-center rounded-t-lg">
          <h3 className="font-semibold text-sm">Interpretation – {dataset.metric}</h3>
          <X onClick={onClose} className="h-4 w-4 cursor-pointer" />
        </header>

        <div className="p-4 text-sm space-y-4">
          <div>
            <label className="block text-gray-700 font-medium mb-1">Method</label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="border rounded px-2 py-1 w-full"
            >
              <option value="winsor_5_95">Winsor 5–95 (Continuous)</option>
              <option value="threshold_categorical">Threshold (Categorical)</option>
            </select>
          </div>

          {method === "threshold_categorical" && (
            <div>
              <label className="block text-gray-700 font-medium mb-1">
                Thresholds (low–high)
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={thresholds[0]}
                  onChange={(e) =>
                    setThresholds([Number(e.target.value), thresholds[1]])
                  }
                  className="border rounded px-2 py-1 w-full"
                />
                <input
                  type="number"
                  value={thresholds[1]}
                  onChange={(e) =>
                    setThresholds([thresholds[0], Number(e.target.value)])
                  }
                  className="border rounded px-2 py-1 w-full"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Example: 300 → 1500 classifies: &lt;300=3, 300–1500=2, &gt;1500=1
              </p>
            </div>
          )}

          <div className="flex justify-between items-center pt-2">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={higher}
                onChange={(e) => setHigher(e.target.checked)}
              />
              <span>Higher values = higher vulnerability</span>
            </label>

            <button
              onClick={save}
              disabled={saving}
              className="px-3 py-1.5 rounded bg-[color:var(--gsc-green)] text-white text-sm hover:opacity-90 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

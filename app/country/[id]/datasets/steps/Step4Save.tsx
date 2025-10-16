"use client";

import { useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import {
  saveDataset,
  GradientRow,
  CategoricalRow,
  CategoryMapItem,
  DatasetType,
} from "@/lib/datasets/saveDataset";
import { CheckCircle2, Loader2 } from "lucide-react";

// Temporary stubs for removed types
type WizardMeta = any;
type Parsed = any;

type Step4Props = {
  meta: WizardMeta;
  parsed: Parsed;
  rows?: GradientRow[] | CategoricalRow[];
  categoryMap?: CategoryMapItem[];
  onBack: () => void;
  onFinish: () => void;
};

export default function Step4Save({
  meta,
  parsed,
  rows = [],
  categoryMap = [],
  onBack,
  onFinish,
}: Step4Props) {
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    try {
      const datasetType: DatasetType = meta?.dataset_type || "gradient";
      await saveDataset(meta, rows, categoryMap);
      setDone(true);
      setMessage(`Dataset saved successfully as ${datasetType}.`);
    } catch (err: any) {
      console.error(err);
      setMessage("Failed to save dataset.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 text-sm text-[var(--gsc-gray)]">
      <div className="rounded-xl border p-4 bg-[var(--gsc-beige)]">
        <h2 className="text-base font-semibold text-[var(--gsc-blue)] mb-2">
          Step 4 – Save Dataset
        </h2>
        <p className="mb-3">
          Review your dataset and click <strong>Save</strong> to upload it to
          Supabase. Once saved, it will appear in the dataset catalogue for{" "}
          {meta?.country_iso ?? "this country"}.
        </p>

        {saving ? (
          <div className="flex items-center gap-2 text-gray-500 text-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            Saving dataset…
          </div>
        ) : done ? (
          <div className="flex items-center gap-2 text-[var(--gsc-green)] text-sm">
            <CheckCircle2 className="h-5 w-5" />
            {message ?? "Dataset saved successfully."}
          </div>
        ) : (
          <button
            onClick={handleSave}
            className="px-4 py-2 rounded text-white"
            style={{ background: "var(--gsc-blue)" }}
          >
            Save Dataset
          </button>
        )}

        {message && !done && (
          <div
            className="mt-3 text-sm"
            style={{
              color: message.includes("Failed")
                ? "var(--gsc-red)"
                : "var(--gsc-green)",
            }}
          >
            {message}
          </div>
        )}
      </div>

      <div className="flex justify-between">
        <button
          onClick={onBack}
          className="px-3 py-2 rounded border text-sm"
          style={{ borderColor: "var(--gsc-light-gray)" }}
        >
          Back
        </button>
        {done && (
          <button
            onClick={onFinish}
            className="px-4 py-2 rounded text-white"
            style={{ background: "var(--gsc-green)" }}
          >
            Finish
          </button>
        )}
      </div>
    </div>
  );
}

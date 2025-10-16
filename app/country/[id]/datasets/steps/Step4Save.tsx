"use client";
import { useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { Loader2, CheckCircle2 } from "lucide-react";

export default function Step4Save({
  meta,
  parsed,
  onBack,
  onFinish,
}: {
  meta: any;
  parsed: { headers: string[]; rows: Record<string, string>[] } | null;
  onBack: () => void;
  onFinish: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSave() {
    setSaving(true);
    setMessage(null);

    try {
      if (!meta?.id && !meta?.dataset_id)
        throw new Error("Missing dataset metadata ID.");
      if (!parsed?.rows?.length)
        throw new Error("No parsed rows to insert.");

      const datasetId = meta.id || meta.dataset_id;
      const datasetType = meta.dataset_type || "gradient";
      const joinField = meta.join_field || "admin_pcode";
      const adminLevel = meta.admin_level || "ADM3";

      // Gradient / numeric / ADM0 datasets
      if (datasetType === "gradient" || datasetType === "adm0") {
        const records = parsed.rows.map((r) => ({
          dataset_id: datasetId,
          admin_pcode: r[joinField],
          admin_level: adminLevel,
          value: isNaN(Number(r.value)) ? null : Number(r.value),
          unit: meta.unit || null,
          created_at: new Date().toISOString(),
        }));

        const { error } = await supabase.from("dataset_values").insert(records);
        if (error) throw error;
      }

      // Categorical datasets
      else if (datasetType === "categorical") {
        const records = parsed.rows.flatMap((r) =>
          Object.entries(r).map(([label, val]) => {
            // Skip the join field column
            if (label === joinField) return null;
            return {
              dataset_id: datasetId,
              admin_pcode: r[joinField],
              admin_level: adminLevel,
              category_label: label,
              category_score: isNaN(Number(val)) ? null : Number(val),
              created_at: new Date().toISOString(),
            };
          }).filter(Boolean)
        );

        if (!records.length) throw new Error("No valid categorical rows found.");
        const { error } = await supabase.from("dataset_values_cat").insert(records);
        if (error) throw error;
      }

      // Update record count in metadata
      const { count } = await supabase
        .from(
          datasetType === "categorical" ? "dataset_values_cat" : "dataset_values"
        )
        .select("id", { count: "exact", head: true })
        .eq("dataset_id", datasetId);

      await supabase
        .from("dataset_metadata")
        .update({ record_count: count || 0, updated_at: new Date().toISOString() })
        .eq("id", datasetId);

      setDone(true);
      setMessage("Dataset saved successfully.");
    } catch (err: any) {
      console.error(err);
      setMessage(err.message || "Failed to save dataset.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-[var(--gsc-blue)]">
        Step 4 – Save Dataset
      </h3>

      <div
        className="rounded-lg p-4 border bg-white"
        style={{ borderColor: "var(--gsc-light-gray)" }}
      >
        <p className="text-sm text-[var(--gsc-gray)] mb-2">
          Review your dataset and click{" "}
          <strong className="text-[var(--gsc-blue)]">Save</strong> to upload it
          to Supabase. Once saved, it will appear in the dataset catalogue for
          this country.
        </p>

        {!done ? (
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 rounded text-white mt-2 inline-flex items-center gap-2"
            style={{
              background: saving
                ? "var(--gsc-light-gray)"
                : "var(--gsc-blue)",
            }}
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {saving ? "Saving..." : "Save Dataset"}
          </button>
        ) : (
          <div className="flex items-center gap-2 text-[var(--gsc-green)] font-medium">
            <CheckCircle2 className="h-5 w-5" />
            Dataset saved successfully.
          </div>
        )}

        {message && (
          <p
            className={`text-sm mt-3 ${
              message.includes("Failed") || message.includes("error")
                ? "text-[var(--gsc-red)]"
                : "text-[var(--gsc-green)]"
            }`}
          >
            {message}
          </p>
        )}
      </div>

      <div className="flex justify-between pt-5">
        <button
          onClick={onBack}
          className="px-3 py-2 rounded border"
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

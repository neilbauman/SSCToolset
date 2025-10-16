"use client";

import { useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { Loader2, CheckCircle2 } from "lucide-react";

export default function Step4Save({ meta, parsed, onBack, onFinish }: any) {
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function ensureMetadataId() {
    if (meta?.id) return meta.id;
    const { data, error } = await supabase
      .from("dataset_metadata")
      .insert({
        country_iso: meta.country_iso,
        title: meta.title || "Untitled",
        dataset_type: meta.dataset_type,
        data_format: meta.data_format,
        admin_level: meta.admin_level,
        join_field: meta.join_field,
        year: meta.year ? Number(meta.year) : null,
        unit: meta.unit || null,
        source_name: meta.source_name || null,
        source_url: meta.source_url || null,
        created_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    if (error) throw error;
    meta.id = data.id;
    return data.id;
  }

  async function handleSave() {
    try {
      setSaving(true);
      setMessage(null);
      setSuccess(false);

      const datasetId = await ensureMetadataId();
      if (!datasetId) throw new Error("Missing dataset metadata ID.");

      const isCategorical = meta.dataset_type === "categorical";
      const table = isCategorical ? "dataset_values_cat" : "dataset_values";
      const rows: any[] = [];

      if (isCategorical) {
        parsed?.rows?.forEach((r: any) => {
          meta.category_fields?.forEach((col: string) => {
            const raw = r[col];
            if (raw === undefined || raw === "") return;
            rows.push({
              dataset_id: datasetId,
              admin_pcode: r[meta.join_field],
              admin_level: meta.admin_level,
              category_label: col,
              category_score:
                !isNaN(Number(raw)) ? Number(raw) : null,
            });
          });
        });
      } else {
        parsed?.rows?.forEach((r: any) => {
          const raw = r[meta.value_field];
          if (raw === undefined || raw === "") return;
          const val = Number(String(raw).replace(/,/g, ""));
          if (isNaN(val)) return;
          rows.push({
            dataset_id: datasetId,
            admin_pcode: r[meta.join_field],
            admin_level: meta.admin_level,
            value: val,
            unit: meta.unit || null,
          });
        });
      }

      if (!rows.length)
        throw new Error("No valid data rows to insert.");

      const { error } = await supabase.from(table).insert(rows);
      if (error) throw error;

      await supabase
        .from("dataset_metadata")
        .update({ record_count: rows.length })
        .eq("id", datasetId);

      setSuccess(true);
      setMessage(`Saved ${rows.length} rows successfully.`);
      setTimeout(onFinish, 1500);
    } catch (err: any) {
      console.error(err);
      setMessage(err.message || "Failed to save dataset.");
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
        <p className="text-sm mb-3">
          Review your dataset and click <strong>Save</strong> to upload it to Supabase.
        </p>

        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 rounded text-white"
          style={{
            background: saving
              ? "var(--gsc-light-gray)"
              : "var(--gsc-blue)",
          }}
        >
          {saving ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Saving…
            </span>
          ) : (
            "Save Dataset"
          )}
        </button>

        {message && (
          <div
            className="mt-3 text-sm"
            style={{
              color: success ? "var(--gsc-green)" : "var(--gsc-red)",
            }}
          >
            {message}
          </div>
        )}

        {success && (
          <div className="flex items-center gap-2 mt-2 text-[var(--gsc-green)]">
            <CheckCircle2 className="h-4 w-4" /> Saved successfully.
          </div>
        )}
      </div>

      <div className="flex justify-between">
        <button onClick={onBack} className="px-3 py-2 rounded border">
          Back
        </button>
        <button onClick={onFinish} className="px-4 py-2 rounded border text-[var(--gsc-blue)]">
          Cancel
        </button>
      </div>
    </div>
  );
}

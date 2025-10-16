"use client";

import { useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { Loader2, CheckCircle2 } from "lucide-react";

type Parsed = { headers: string[]; rows: Record<string, string>[] } | null;

export default function Step4Save({
  meta,
  parsed,
  onBack,
  onFinish,
}: {
  meta: any;
  parsed: Parsed;
  onBack: () => void;
  onFinish: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function ensureMetadataId() {
    if (meta?.id) return meta.id;
    try {
      const payload = {
        country_iso: meta.country_iso,
        title: meta.title || "Untitled dataset",
        dataset_type: meta.dataset_type || "gradient",
        data_format: meta.data_format || "numeric",
        admin_level: meta.admin_level || "ADM3",
        join_field: meta.join_field || "admin_pcode",
        year: meta.year ? Number(meta.year) : null,
        unit: meta.unit || null,
        source_name: meta.source_name || null,
        source_url: meta.source_url || null,
        created_at: new Date().toISOString(),
      };
      const { data, error } = await supabase
        .from("dataset_metadata")
        .insert(payload)
        .select("id")
        .single();
      if (error) throw error;
      meta.id = data.id;
      return data.id;
    } catch (err: any) {
      console.error(err);
      throw new Error("Failed to create metadata ID.");
    }
  }

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    setSuccess(false);
    try {
      const datasetId = await ensureMetadataId();
      if (!datasetId) throw new Error("Missing dataset metadata ID.");

      // ADM0 case: one row
      if (meta.admin_level === "ADM0") {
        const valNum = Number(String(meta.adm0_value || "").replace(/,/g, ""));
        const row = {
          dataset_id: datasetId,
          admin_pcode: "ADM0",
          admin_level: "ADM0",
          value: isNaN(valNum) ? null : valNum,
          unit: meta.unit || null,
        };
        const { error } = await supabase.from("dataset_values").insert(row);
        if (error) throw error;
      }

      // Gradient / categorical file upload case
      if (parsed?.rows?.length) {
        const rows =
          meta.dataset_type === "categorical"
            ? parsed.rows.flatMap((r: any) =>
                Object.keys(r)
                  .filter((k) => k !== meta.join_field)
                  .map((col) => ({
                    dataset_id: datasetId,
                    admin_pcode: r[meta.join_field],
                    admin_level: meta.admin_level,
                    category_label: col,
                    category_score: r[col] ?? null,
                  }))
              )
            : parsed.rows.map((r: any) => ({
                dataset_id: datasetId,
                admin_pcode: r[meta.join_field],
                admin_level: meta.admin_level,
                value: Number(String(r.value || r[meta.value_field] || "").replace(/,/g, "")) || null,
                unit: meta.unit || null,
              }));

        if (rows.length > 0) {
          const table =
            meta.dataset_type === "categorical"
              ? "dataset_values_cat"
              : "dataset_values";
          const { error } = await supabase.from(table).insert(rows);
          if (error) throw error;

          await supabase
            .from("dataset_metadata")
            .update({ record_count: rows.length })
            .eq("id", datasetId);
        }
      }

      setSuccess(true);
      setMessage("Dataset saved successfully.");
      setTimeout(onFinish, 1000);
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
          Review your dataset and click{" "}
          <strong>Save</strong> to upload it to Supabase. Once saved, it will
          appear in the dataset catalogue for this country.
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
        <button
          onClick={onFinish}
          className="px-4 py-2 rounded border text-[var(--gsc-blue)]"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

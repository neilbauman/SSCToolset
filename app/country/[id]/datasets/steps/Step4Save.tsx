"use client";

import { useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";

export default function Step4Save({
  meta,
  parsed,
  back,
  onClose,
}: {
  meta: any;
  parsed: { headers: string[]; rows: Record<string, string>[] } | null;
  back: () => void;
  onClose: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSave() {
    try {
      if (!meta?.id) {
        setMessage("Missing dataset metadata ID.");
        return;
      }
      setSaving(true);
      setMessage(null);

      // 🧩 1️⃣ Save rows based on dataset type
      if (meta.dataset_type === "gradient") {
        const joinField = meta.join_field || "admin_pcode";
        const valueField =
          meta.value_field || parsed?.headers.find((h) => h !== joinField);
        const rows =
          parsed?.rows.map((r) => ({
            dataset_id: meta.id,
            admin_pcode: r[joinField],
            admin_level: meta.admin_level,
            value: Number(r[valueField]) || null,
            unit: meta.unit || null,
          })) || [];
        const clean = rows.filter(
          (r) => r.admin_pcode && typeof r.value === "number"
        );
        if (clean.length) {
          const { error } = await supabase.from("dataset_values").insert(clean);
          if (error) throw error;
        }
      }

      if (meta.dataset_type === "categorical") {
        const joinField = meta.join_field || "admin_pcode";
        const categoryCols: string[] = meta.category_fields || [];
        if (!categoryCols.length)
          throw new Error("No category columns selected.");

        const rows: any[] = [];
        parsed?.rows.forEach((r) => {
          categoryCols.forEach((col) => {
            const num = Number(r[col]);
            rows.push({
              dataset_id: meta.id,
              admin_pcode: r[joinField],
              admin_level: meta.admin_level,
              category_code: col.toLowerCase().replace(/\s+/g, "_"),
              category_label: col,
              category_score: isNaN(num) ? null : num,
            });
          });
        });

        const clean = rows.filter(
          (r) => r.admin_pcode && r.category_code && r.category_label
        );
        if (clean.length) {
          const { error } = await supabase
            .from("dataset_values_cat")
            .insert(clean);
          if (error) throw error;
        }
      }

      if (meta.dataset_type === "adm0") {
        const v = Number(meta.value_field ?? null);
        const row = {
          dataset_id: meta.id,
          admin_pcode: "ADM0",
          admin_level: "ADM0",
          value: v,
          unit: meta.unit || null,
        };
        const { error } = await supabase.from("dataset_values").insert(row);
        if (error) throw error;
      }

      // 🧩 2️⃣ Link dataset to indicator
      if (meta.indicator_id) {
        const link = {
          indicator_id: meta.indicator_id,
          dataset_id: meta.id,
        };
        const { error } = await supabase
          .from("indicator_dataset_links")
          .upsert(link, { onConflict: "indicator_id,dataset_id" });
        if (error) throw error;
      }

      setMessage("✅ Dataset successfully saved.");
      setTimeout(() => onClose(), 1200);
    } catch (e: any) {
      console.error(e);
      setMessage(e.message || "Failed to save dataset.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-xl border p-4 bg-[var(--gsc-beige)]">
      <h2 className="text-base font-semibold text-[var(--gsc-blue)] mb-2">
        Step 4 – Save Dataset
      </h2>
      <p className="text-sm mb-4">
        Click <strong>Save</strong> to upload parsed data rows to Supabase. Once
        saved, this dataset will appear in the catalogue for{" "}
        <strong>{meta.country_iso}</strong>.
      </p>

      <div className="flex justify-end gap-2">
        <button
          onClick={back}
          className="px-3 py-2 rounded border border-gray-400"
        >
          Back
        </button>
        <button
          disabled={saving}
          onClick={handleSave}
          className="px-4 py-2 rounded text-white"
          style={{
            background: saving ? "var(--gsc-light-gray)" : "var(--gsc-blue)",
          }}
        >
          {saving ? "Saving…" : "Save Dataset"}
        </button>
      </div>

      {message && (
        <div
          className="mt-4 text-sm"
          style={{
            color: message.includes("✅")
              ? "var(--gsc-green)"
              : "var(--gsc-red)",
          }}
        >
          {message}
        </div>
      )}
    </div>
  );
}

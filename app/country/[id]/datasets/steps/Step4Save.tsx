"use client";

import { useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { Loader2, CheckCircle2 } from "lucide-react";

type Step4SaveProps = {
  meta: any;
  parsed: any;
  back: () => void;
  onClose: () => void;
};

export default function Step4Save({ meta, parsed, back, onClose }: Step4SaveProps) {
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function save() {
    try {
      setSaving(true);
      setMessage(null);

      if (!meta?.dataset_id)
        throw new Error("Missing dataset metadata ID.");

      const id = meta.dataset_id;
      const type = meta.dataset_type;

      // ADM0 case — single national metric
      if (type === "adm0") {
        const val = Number(meta.adm0Value ?? null);
        if (isNaN(val)) throw new Error("Invalid ADM0 value.");
        const row = {
          dataset_id: id,
          admin_pcode: "ADM0",
          value: val,
          unit: meta.unit || null,
          admin_level: "ADM0",
        };
        const { error } = await supabase.from("dataset_values").insert(row);
        if (error) throw error;
        setMessage("Saved ADM0 dataset successfully.");
        return;
      }

      // Gradient datasets
      if (type === "gradient") {
        if (!parsed?.rows?.length) throw new Error("No parsed rows found.");
        const joinKey = meta.join_field;
        const valueKey = meta.value_field || meta.selectedValueCol || "value";

        const rows = parsed.rows
          .map((r: any) => {
            const val = Number(r[valueKey]);
            if (isNaN(val)) return null;
            return {
              dataset_id: id,
              admin_pcode: r[joinKey],
              value: val,
              unit: meta.unit || null,
              admin_level: meta.admin_level || null,
            };
          })
          .filter(Boolean);

        if (!rows.length) throw new Error("No numeric values to save.");
        const { error } = await supabase.from("dataset_values").insert(rows);
        if (error) throw error;
        setMessage(`Saved ${rows.length} gradient records successfully.`);
        return;
      }

      // Categorical datasets
      if (type === "categorical") {
        if (!parsed?.rows?.length) throw new Error("No parsed rows found.");
        const joinKey = meta.join_field;
        const categoryCols = meta.category_columns || [];

        let catRows: any[] = [];
        parsed.rows.forEach((r: any) => {
          categoryCols.forEach((col: string) => {
            const v = r[col];
            const num = v === "" ? null : Number(v);
            catRows.push({
  dataset_id: id,
  admin_pcode: r[joinKey],
  admin_level: meta.admin_level,
  category_code: col.toLowerCase().replace(/\s+/g, "_"),
  category_label: col,
  category_score: isNaN(num) ? null : num,
} as any);
          });
        });

        if (!catRows.length) throw new Error("No categorical rows to save.");
        const { error } = await supabase.from("dataset_values_cat").insert(catRows);
        if (error) throw error;
        setMessage(`Saved ${catRows.length} categorical records successfully.`);
        return;
      }

      throw new Error("Unrecognized dataset type.");

    } catch (err: any) {
      console.error(err);
      setMessage(err.message || "Failed to save dataset.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-base font-semibold text-[var(--gsc-blue)]">
        Step 4 – Save Dataset
      </h2>
      <p className="text-sm text-[var(--gsc-gray)]">
        Click <strong>Save</strong> to upload parsed data rows to Supabase. Once
        saved, this dataset will appear in the catalogue for{" "}
        <strong>{meta.country_iso}</strong>.
      </p>

      {message && (
        <div
          className={`text-sm border rounded p-2 ${
            message.toLowerCase().includes("fail") ||
            message.toLowerCase().includes("error")
              ? "border-[var(--gsc-red)] text-[var(--gsc-red)]"
              : "border-[var(--gsc-green)] text-[var(--gsc-green)]"
          }`}
        >
          {message}
        </div>
      )}

      <div className="flex justify-end gap-2">
        <button
          onClick={back}
          className="px-3 py-2 rounded border border-gray-300"
        >
          Back
        </button>
        <button
          onClick={save}
          disabled={saving}
          className="px-4 py-2 rounded text-white"
          style={{ background: "var(--gsc-blue)" }}
        >
          {saving ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving...
            </span>
          ) : (
            <>
              <CheckCircle2 className="h-4 w-4 inline mr-1" />
              Save Dataset
            </>
          )}
        </button>
      </div>
    </div>
  );
}

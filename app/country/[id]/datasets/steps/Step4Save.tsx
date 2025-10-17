"use client";

import { useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";

type WizardMeta = any;
type Parsed = { headers: string[]; rows: Record<string, string>[] };

export default function Step4Save({
  meta,
  parsed,
  back,
  onClose,
}: {
  meta: WizardMeta;
  parsed: Parsed | null;
  back: () => void;
  onClose: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSave() {
    try {
      setSaving(true);
      setMessage(null);

      if (!meta?.id) throw new Error("Missing dataset metadata ID.");
      const id = meta.id as string;

      // --- ADM0 datasets ----------------------------------------------------
      if (meta.dataset_type === "adm0") {
        const valueNum = Number(String(meta.adm0Value ?? "").replace(/,/g, ""));
        const v = isNaN(valueNum) ? null : valueNum;
        const row = {
          dataset_id: id,
          admin_pcode: "ADM0",
          value: v,
          unit: meta.unit || null,
          admin_level: "ADM0",
        };
        const { error } = await supabase.from("dataset_values").insert(row);
        if (error) throw error;
        setMessage("Saved ADM0 dataset successfully.");
        return;
      }

      // --- Gradient datasets -----------------------------------------------
      if (meta.dataset_type === "gradient" && parsed) {
        const joinKey = meta.join_field || parsed.headers[0];
        const otherCols = parsed.headers.filter((h) => h !== joinKey);

        // Find the first numeric-like column
        const testRow = parsed.rows[0] || {};
        const numericCol =
          otherCols.find((h) => !isNaN(Number(testRow[h]))) || otherCols[0];

        if (!numericCol)
          throw new Error("No numeric column found for gradient dataset.");

        const rows = parsed.rows.map((r) => {
          const val = Number(r[numericCol]);
          return {
            dataset_id: id,
            admin_pcode: r[joinKey],
            admin_level: meta.admin_level,
            value: isNaN(val) ? null : val,
            unit: meta.unit || null,
          };
        });

        const clean = rows.filter(
          (r) => r.admin_pcode && r.value !== null && !isNaN(Number(r.value))
        );
        if (!clean.length)
          throw new Error("No valid numeric rows found for gradient dataset.");

        const { error } = await supabase
          .from("dataset_values")
          .insert(clean as any);
        if (error) throw error;

        setMessage(`Saved ${clean.length} gradient rows.`);
        return;
      }

      // --- Categorical datasets --------------------------------------------
      if (meta.dataset_type === "categorical" && parsed) {
        const joinKey = meta.join_field || parsed.headers[0];
        const categoryCols = parsed.headers.filter((h) => h !== joinKey);

        let catRows: any[] = [];

        parsed.rows.forEach((r) => {
          categoryCols.forEach((col: string) => {
            const v = r[col];
            const num = v === "" ? null : Number(v);
            catRows.push(
              ({
                dataset_id: id,
                admin_pcode: r[joinKey],
                admin_level: meta.admin_level,
                category_code: col.toLowerCase().replace(/\s+/g, "_"),
                category_label: col,
                category_score: isNaN(num as any) ? null : num,
              } as any)
            );
          });
        });

        const clean = catRows.filter(
          (r) => r.admin_pcode && r.category_label && r.category_code
        );
        if (clean.length) {
          const { error } = await supabase
            .from("dataset_values_cat")
            .insert(clean);
          if (error) throw error;
        }

        setMessage(`Saved ${clean.length} categorical rows.`);
        return;
      }

      throw new Error("Unsupported dataset type or missing parsed data.");
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
          Click <strong>Save</strong> to upload parsed data rows to Supabase.
          Once saved, this dataset will appear in the catalogue for{" "}
          <strong>{meta.country_iso}</strong>.
        </p>

        {message && (
          <div
            className="mt-2 text-sm"
            style={{
              color: message.includes("Failed") || message.includes("Error")
                ? "var(--gsc-red)"
                : "var(--gsc-green)",
            }}
          >
            {message}
          </div>
        )}
      </div>

      <div className="flex justify-between items-center">
        <button
          onClick={back}
          className="px-4 py-2 rounded border border-gray-300"
        >
          Back
        </button>

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
          {saving ? "Saving…" : "Save Dataset"}
        </button>
      </div>
    </div>
  );
}

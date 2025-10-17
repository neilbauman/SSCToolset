"use client";
import { useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { Loader2, CheckCircle2 } from "lucide-react";

type Props = {
  meta: any;
  parsed: { headers: string[]; rows: Record<string, string>[] } | null;
  back: () => void;
  onClose: () => void;
};

export default function Step4Save({ meta, parsed, back, onClose }: Props) {
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [message, setMessage] = useState("");

  async function ensureMetaId() {
    if (meta.id) return meta.id;
    const { data, error } = await supabase
      .from("dataset_metadata")
      .insert({
        country_iso: meta.country_iso,
        title: meta.title || "Untitled dataset",
        dataset_type: meta.dataset_type,
        data_format: meta.data_format,
        admin_level: meta.admin_level,
        join_field: meta.join_field,
        year: meta.year ? Number(meta.year) : null,
        unit: meta.unit || null,
        source_name: meta.source_name || null,
        source_url: meta.source_url || null,
        indicator_id: meta.indicator_id || null,
        created_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    if (error) throw error;
    return data.id;
  }

  async function save() {
    try {
      setSaving(true);
      setMessage("Saving metadata...");
      const id = await ensureMetaId();

      // ADM0 direct value
      if (!parsed && meta.admin_level === "ADM0") {
        const val = Number(meta.adm0_value ?? "");
        const row = {
          dataset_id: id,
          admin_pcode: "ADM0",
          admin_level: "ADM0",
          value: isNaN(val) ? null : val,
          unit: meta.unit || null,
        };
        await supabase.from("dataset_values").insert(row);
      }

      // Gradient dataset: single numeric column
      if (parsed && meta.dataset_type === "gradient") {
        setMessage("Saving gradient dataset values...");
        const join = meta.join_field || "admin_pcode";
        const valCol = meta.value_field || parsed.headers.find((h) => h !== join);
        const rows = parsed.rows
          .map((r) => ({
            dataset_id: id,
            admin_pcode: r[join],
            admin_level: meta.admin_level,
            value: Number(String(r[valCol] ?? "").replace(/,/g, "")),
            unit: meta.unit || null,
          }))
          .filter((r) => r.admin_pcode && !isNaN(r.value));
        if (rows.length) await supabase.from("dataset_values").insert(rows);
      }

      // Categorical dataset: multiple columns → dataset_values_cat
      if (parsed && meta.dataset_type === "categorical") {
        setMessage("Saving categorical dataset values...");
        const join = meta.join_field || "admin_pcode";
        const cats = parsed.headers.filter((h) => h !== join);
        const rows: any[] = [];
        parsed.rows.forEach((r) =>
          cats.forEach((c) => {
            const v = String(r[c] ?? "").trim();
            if (v !== "")
              rows.push({
                dataset_id: id,
                admin_pcode: r[join],
                admin_level: meta.admin_level,
                category_label: c,
                value: isNaN(Number(v)) ? null : Number(v),
                unit: meta.unit || null,
              });
          })
        );
        if (rows.length) await supabase.from("dataset_values_cat").insert(rows);
      }

      setDone(true);
      setMessage("Dataset saved successfully.");
    } catch (e: any) {
      console.error(e);
      setMessage(e.message || "Error saving dataset.");
    } finally {
      setSaving(false);
    }
  }

  if (done)
    return (
      <div className="text-center text-[var(--gsc-green)] py-10">
        <CheckCircle2 className="h-10 w-10 mx-auto mb-3" />
        <div className="font-semibold mb-2">Dataset saved!</div>
        <button
          onClick={onClose}
          className="px-4 py-2 rounded text-white"
          style={{ background: "var(--gsc-blue)" }}
        >
          Close
        </button>
      </div>
    );

  return (
    <div className="flex flex-col gap-4 text-sm text-[var(--gsc-gray)]">
      <div className="rounded-xl border p-4 bg-[var(--gsc-beige)]">
        <h2 className="text-base font-semibold text-[var(--gsc-blue)] mb-2">
          Step 4 – Save Dataset
        </h2>
        <p className="text-sm mb-4">
          Review your selections and click <strong>Save</strong> to persist the
          dataset and its values.
        </p>
        {message && (
          <div
            className={`text-sm mb-3 ${
              message.includes("Error") ? "text-[var(--gsc-red)]" : "text-gray-600"
            }`}
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin inline mr-2" />}
            {message}
          </div>
        )}
      </div>

      <div className="flex justify-between pt-4">
        <button onClick={back} className="px-3 py-2 rounded border">
          Back
        </button>
        <button
          onClick={save}
          disabled={saving}
          className="px-4 py-2 rounded text-white"
          style={{ background: saving ? "var(--gsc-light-gray)" : "var(--gsc-blue)" }}
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
}

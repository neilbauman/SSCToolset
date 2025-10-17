"use client";
import { useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { Loader2, CheckCircle2 } from "lucide-react";

type ParsedRow = Record<string, string | number | null>;

export default function Step4Save({
  meta,
  parsed,
  back,
  onClose,
}: {
  meta: any;
  parsed: { headers: string[]; rows: ParsedRow[] } | null;
  back: () => void;
  onClose: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [msg, setMsg] = useState("");

  async function ensureMetaId() {
    if (meta.id) return meta.id;
    const { data, error } = await supabase
      .from("dataset_metadata")
      .insert({
        country_iso: meta.country_iso,
        title: meta.title,
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
      setMsg("Saving dataset values…");

      const datasetId = await ensureMetaId();
      const joinField = meta.join_field_csv || meta.join_field || "admin_pcode";
      let insertedCount = 0;

      // ADM0 SINGLE VALUE
      if (!parsed && meta.admin_level === "ADM0") {
        const val = Number(meta.adm0_value);
        const { error } = await supabase.from("dataset_values").insert({
          dataset_id: datasetId,
          admin_pcode: "ADM0",
          admin_level: "ADM0",
          value: isNaN(val) ? null : val,
          unit: meta.unit || null,
        });
        if (error) throw error;
        insertedCount = 1;
      }

      // GRADIENT DATASETS
      if (parsed && meta.dataset_type === "gradient") {
        const valCol =
          meta.category_columns?.[0] ||
          meta.value_field ||
          parsed.headers.find((h) => h.toLowerCase().includes("value")) ||
          parsed.headers[1];

        const rows = (parsed.rows || []).map((r: ParsedRow) => ({
          dataset_id: datasetId,
          admin_pcode: String(r[joinField] ?? "").trim(),
          admin_level: meta.admin_level,
          value: Number(String(r[valCol] ?? "").replace(/,/g, "")),
          unit: meta.unit || null,
        }));

        const clean = rows.filter(
          (r: any) => r.admin_pcode && !isNaN(r.value)
        );

        if (clean.length) {
          const { error } = await supabase
            .from("dataset_values")
            .insert(clean);
          if (error) throw error;
          insertedCount = clean.length;
        }
      }

      // CATEGORICAL DATASETS
      if (parsed && meta.dataset_type === "categorical") {
        const join = joinField;
        const cats =
          meta.category_columns ||
          parsed.headers.filter((h: string) => h !== join);

        const rows: any[] = [];
        parsed.rows.forEach((r: ParsedRow) => {
          cats.forEach((c: string) => {
            const raw = String(r[c] ?? "").trim();
            const num = Number(raw.replace(/,/g, ""));
            rows.push({
              dataset_id: datasetId,
              admin_pcode: String(r[join] ?? "").trim(),
              admin_level: meta.admin_level,
              category_code: null,
              category_label: c,
              category_score: isNaN(num) ? null : num,
            });
          });
        });

        const valid = rows.filter((r) => r.admin_pcode);
        if (valid.length) {
          const { error } = await supabase
            .from("dataset_values_cat")
            .insert(valid);
          if (error) throw error;
          insertedCount = valid.length;
        }
      }

      // UPDATE RECORD COUNT
      await supabase
        .from("dataset_metadata")
        .update({ record_count: insertedCount })
        .eq("id", datasetId);

      setDone(true);
      setMsg(`Saved ${insertedCount} records successfully.`);
    } catch (e: any) {
      console.error(e);
      setMsg(e.message || "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  if (done)
    return (
      <div className="text-center text-[var(--gsc-green)] py-10">
        <CheckCircle2 className="h-10 w-10 mx-auto mb-2" />
        <div>Dataset saved successfully.</div>
        <div className="text-xs text-gray-500 mt-1">{msg}</div>
        <button
          onClick={onClose}
          className="mt-4 px-4 py-2 rounded text-white"
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
        <p className="mb-3">
          Click <strong>Save</strong> to upload parsed data rows to Supabase.
          Once saved, this dataset will appear in the catalogue for{" "}
          <strong>{meta.country_iso}</strong>.
        </p>
        {msg && (
          <div
            className={`text-sm ${
              msg.includes("fail") || msg.includes("error")
                ? "text-[var(--gsc-red)]"
                : "text-[var(--gsc-green)]"
            }`}
          >
            {msg}
          </div>
        )}
      </div>

      <div className="flex justify-between">
        <button onClick={back} className="px-3 py-2 rounded border">
          Back
        </button>
        <button
          disabled={saving}
          onClick={save}
          className="px-4 py-2 rounded text-white"
          style={{
            background: saving ? "var(--gsc-light-gray)" : "var(--gsc-blue)",
          }}
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 inline animate-spin mr-2" />
              Saving…
            </>
          ) : (
            "Save Dataset"
          )}
        </button>
      </div>
    </div>
  );
}

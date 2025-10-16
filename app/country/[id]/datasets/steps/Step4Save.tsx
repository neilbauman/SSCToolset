"use client";

import { useMemo, useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { CheckCircle2, Loader2 } from "lucide-react";

type Parsed = { headers: string[]; rows: Record<string, string>[] };

function toNumber(raw: unknown): number | null {
  if (raw == null) return null;
  const s = String(raw).trim();
  if (!s) return null;
  // Remove thousands separators, handle percentages like "12.3%"
  const cleaned = s.replace(/,/g, "").replace(/\s+/g, "").replace(/%$/, "");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

async function chunkedInsert<T>(
  table: string,
  rows: T[],
  chunkSize = 1000
): Promise<void> {
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const { error } = await supabase.from(table).insert(chunk);
    if (error) throw error;
  }
}

export default function Step4Save({
  meta,
  parsed,
  back,
  onClose,
}: {
  meta: any;
  parsed: Parsed | null;
  back: () => void;
  onClose: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const datasetType: "adm0" | "gradient" | "categorical" = (meta.dataset_type ||
    "gradient") as any;
  const adminLevel: string = meta.admin_level || "ADM0";
  const joinField: string = meta.join_field || "admin_pcode";
  const unit: string | null = meta.unit || null;
  const dataFormat: string = meta.data_format || "numeric";
  const indicatorId: string | null = meta.indicator_id || null;
  const title: string = meta.title || "";
  const year: number | null =
    meta.year != null && String(meta.year).trim() !== ""
      ? Number(meta.year)
      : null;
  const sourceName: string | null =
    meta.source_name && String(meta.source_name).trim()
      ? meta.source_name
      : null;
  const sourceUrl: string | null =
    meta.source_url && String(meta.source_url).trim()
      ? meta.source_url
      : null;

  const previewSummary = useMemo(() => {
    if (datasetType === "adm0") {
      const v =
        meta.adm0_value != null ? toNumber(meta.adm0_value) : (null as number | null);
      return `ADM0 value: ${v ?? "—"} ${unit ?? ""}`.trim();
    }
    if (!parsed) return "No parsed data.";
    const total = parsed.rows?.length ?? 0;
    if (datasetType === "gradient") {
      return `Gradient rows to parse: ${total} (join: ${joinField}, value: ${meta.value_field || "—"})`;
    }
    const cats = (meta.category_fields as string[]) || [];
    return `Categorical rows to parse: ${total} (join: ${joinField}, categories: ${cats.join(
      ", "
    ) || "—"})`;
  }, [datasetType, meta, parsed, unit, joinField]);

  async function doSave() {
    setErr(null);
    setSaving(true);
    try {
      if (!meta.dataset_id) throw new Error("Missing dataset_id in wizard state.");

      // 1) Update dataset metadata (finalize all fields)
      {
        const payload: any = {
          title,
          admin_level: adminLevel,
          dataset_type: datasetType,
          data_format: dataFormat,
          join_field: datasetType === "adm0" ? "admin_pcode" : joinField || null,
          indicator_id: indicatorId || null,
          unit,
          year,
          source_name: sourceName,
          source_url: sourceUrl,
          updated_at: new Date().toISOString(),
        };
        const { error: updErr } = await supabase
          .from("dataset_metadata")
          .update(payload)
          .eq("id", meta.dataset_id);
        if (updErr) throw updErr;
      }

      let insertedCount = 0;

      // 2) Insert values by dataset type
      if (datasetType === "adm0") {
        // Single national value
        const val = toNumber(meta.adm0_value);
        if (val == null)
          throw new Error("ADM0 value is required and must be numeric.");
        const row = {
          dataset_id: meta.dataset_id,
          admin_pcode: "ADM0",
          value: val,
          unit,
          admin_level: "ADM0",
        };
        const { error } = await supabase.from("dataset_values").insert(row);
        if (error) throw error;
        insertedCount = 1;
      } else if (datasetType === "gradient") {
        if (!parsed) throw new Error("No parsed CSV loaded.");
        const valueField: string = meta.value_field;
        if (!valueField)
          throw new Error("Value column not selected in Step 2.");
        const rows = (parsed.rows || []).map((r) => {
          const pcode = r[joinField];
          const v = toNumber(r[valueField]);
          return {
            dataset_id: meta.dataset_id,
            admin_pcode: pcode,
            admin_level: adminLevel,
            value: v,
            unit,
          };
        });

        // Filter: require pcode and numeric value (dataset_values.value is NOT NULL)
        const clean = rows.filter(
          (r) =>
            r.admin_pcode &&
            r.admin_pcode !== "" &&
            r.value != null &&
            Number.isFinite(r.value as number)
        );
        if (!clean.length) throw new Error("No valid numeric rows found to save.");
        await chunkedInsert("dataset_values", clean, 1000);
        insertedCount = clean.length;
      } else if (datasetType === "categorical") {
        if (!parsed) throw new Error("No parsed CSV loaded.");
        const cats: string[] = (meta.category_fields as string[]) || [];
        if (!cats.length)
          throw new Error("No category columns selected in Step 2.");

        // Build rows: one record per (row x category column)
        const out: any[] = [];
        for (const r of parsed.rows || []) {
          const pcode = r[joinField];
          if (!pcode) continue;
          for (const c of cats) {
            const rawVal = r[c];
            const score = toNumber(rawVal); // may be null (nullable column)
            out.push({
              dataset_id: meta.dataset_id,
              admin_pcode: pcode,
              admin_level: adminLevel,
              category_code: c,
              category_label: c,
              category_score: score,
            });
          }
        }
        // Require at least pcode + labels; score may be null
        const clean = out.filter((x) => !!x.admin_pcode && !!x.category_label);
        if (!clean.length) throw new Error("No valid categorical rows found.");
        await chunkedInsert("dataset_values_cat", clean, 1000);
        insertedCount = clean.length;
      }

      // 3) Update record_count for dataset_metadata
      {
        const { error: updErr2 } = await supabase
          .from("dataset_metadata")
          .update({ record_count: insertedCount })
          .eq("id", meta.dataset_id);
        if (updErr2) throw updErr2;
      }

      // 4) Auto-close on success
      onClose();
    } catch (e: any) {
      setErr(e.message || "Save failed.");
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
        <p className="mb-2">
          Your dataset will be written to Supabase using the selections from the
          previous steps. This may take a moment for large files.
        </p>

        <div className="rounded-md border bg-white p-3 text-xs">
          <div><strong>Type:</strong> {datasetType}</div>
          <div><strong>Admin Level:</strong> {adminLevel}</div>
          <div><strong>Join Field:</strong> {datasetType === "adm0" ? "N/A" : joinField || "—"}</div>
          <div><strong>Indicator:</strong> {indicatorId || "—"}</div>
          <div><strong>Unit:</strong> {unit || "—"}</div>
          <div><strong>Format:</strong> {dataFormat}</div>
          <div className="mt-1 text-[var(--gsc-gray)]">{previewSummary}</div>
        </div>

        {err && (
          <div className="mt-3 text-sm text-[var(--gsc-red)]">
            {err}
          </div>
        )}
      </div>

      <div className="flex justify-between">
        <button onClick={back} className="px-3 py-2 rounded border">
          Back
        </button>
        <button
          onClick={doSave}
          disabled={saving}
          className="px-4 py-2 rounded text-white inline-flex items-center gap-2"
          style={{ background: "var(--gsc-blue)" }}
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving…
            </>
          ) : (
            <>
              <CheckCircle2 className="h-4 w-4" />
              Save Dataset
            </>
          )}
        </button>
      </div>
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import type { Parsed } from "@/components/country/AddDatasetModal";

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
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const summary = useMemo(() => {
    return {
      title: meta.title,
      type: meta.dataset_type || (meta.admin_level === "ADM0" ? "adm0" : ""),
      admin: meta.admin_level,
      valueField: meta.value_field,
      catFields: meta.category_fields ?? [],
      csvJoin: meta.csv_join_field,
      rows: parsed?.rows?.length ?? 0,
    };
  }, [meta, parsed]);

  async function save() {
    setSaving(true);
    setError(null);

    try {
      // 1) create metadata first (with indicator_id so taxonomy can resolve)
      const payload: any = {
        country_iso: meta.country_iso,
        title: meta.title.trim(),
        dataset_type: (meta.dataset_type || (meta.admin_level === "ADM0" ? "adm0" : "")) || null,
        data_format: meta.data_format || null,
        admin_level: meta.admin_level || null,
        join_field: meta.join_field || "admin_pcode", // join in admins table
        year: meta.year ? Number(meta.year) : null,
        unit: meta.unit || null,
        source_name: meta.source_name || null,
        source_url: meta.source_url || null,
        indicator_id: meta.indicator_id || null,
        created_at: new Date().toISOString(),
      };

      const { data: metaRow, error: mErr } = await supabase
        .from("dataset_metadata")
        .insert(payload)
        .select("*")
        .single();

      if (mErr) throw mErr;
      const datasetId: string = metaRow.id;

      // 2) ADM0 (no file) -> single row
      if (!parsed && meta.admin_level === "ADM0") {
        // Only numeric/percentage allowed by schema (value is NOT NULL).
        // Convert percent "12%" or "12.3" strings to numbers.
        const num = Number(String(meta.adm0_value ?? "").replace(/,/g, "").replace(/%/g, ""));
        if (isNaN(num)) throw new Error("ADM0 value must be numeric.");
        const row = {
          dataset_id: datasetId,
          admin_pcode: "ADM0",
          admin_level: "ADM0",
          value: num,
          unit: payload.unit,
          category_label: null,
        };
        const { error: vErr } = await supabase.from("dataset_values").insert(row);
        if (vErr) throw vErr;

        // optional: update record_count
        await supabase.from("dataset_metadata").update({ record_count: 1 }).eq("id", datasetId);

        setDone(true);
        return;
      }

      // 3) file-based paths
      if (!parsed || !parsed.headers?.length) {
        throw new Error("CSV was not parsed or is empty.");
      }

      const headers = parsed.headers;
      const rows = parsed.rows;
      const csvJoin = meta.csv_join_field;
      if (!csvJoin && meta.admin_level !== "ADM0") {
        throw new Error("Please choose the CSV join field (Pcode column).");
      }

      if (meta.dataset_type === "gradient") {
        const vField = meta.value_field || headers.find((h: string) => h !== csvJoin);
        if (!vField) throw new Error("Please choose the value column.");

        const toNum = (s: string): number => {
          const n = Number(String(s ?? "").replace(/,/g, "").replace(/%/g, ""));
          return n;
        };

        const bulk = rows
          .map((r) => {
            const p = String(r[csvJoin] ?? "").trim();
            const v = toNum(r[vField]);
            if (!p || isNaN(v)) return null;
            return {
              dataset_id: datasetId,
              admin_pcode: p,
              admin_level: meta.admin_level,
              value: v,
              unit: payload.unit,
              category_label: null,
            };
          })
          .filter(Boolean) as any[];

        if (!bulk.length) throw new Error("No valid numeric rows were found to insert.");

        const { error: insErr } = await supabase.from("dataset_values").insert(bulk);
        if (insErr) throw insErr;

        await supabase.from("dataset_metadata").update({ record_count: bulk.length }).eq("id", datasetId);
        setDone(true);
        return;
      }

      if (meta.dataset_type === "categorical") {
        const catCols: string[] = Array.isArray(meta.category_fields) ? meta.category_fields : [];
        if (!catCols.length) throw new Error("Select at least one category column.");

        // 3a) Insert per-category mappings (code,label) once
        const mapRows = catCols.map((col) => ({
          dataset_id: datasetId,
          code: col.toLowerCase().replace(/\s+/g, "_"),
          label: col,
          score: null as number | null,
        }));
        await supabase.from("dataset_category_maps").insert(mapRows as any[]);

        // 3b) Insert all categorized values
        const toNum = (s: string): number | null => {
          const n = Number(String(s ?? "").replace(/,/g, "").replace(/%/g, ""));
          return isNaN(n) ? null : n;
        };

        const catRows: any[] = [];
        for (const r of rows) {
          const p = String(r[csvJoin] ?? "").trim();
          if (!p) continue;

          for (const col of catCols) {
            const score = toNum(r[col]);
            // null is allowed by schema
            catRows.push({
              dataset_id: datasetId,
              admin_pcode: p,
              admin_level: meta.admin_level,
              category_code: col.toLowerCase().replace(/\s+/g, "_"),
              category_label: col,
              category_score: score,
            });
          }
        }

        if (!catRows.length) throw new Error("No categorical rows found to insert.");

        const { error: cErr } = await supabase.from("dataset_values_cat").insert(catRows);
        if (cErr) throw cErr;

        await supabase.from("dataset_metadata").update({ record_count: catRows.length }).eq("id", datasetId);
        setDone(true);
        return;
      }

      throw new Error("Unknown dataset type.");
    } catch (e: any) {
      setError(e.message || "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 text-sm text-[var(--gsc-gray)]">
      <div className="rounded-xl border p-4 bg-[var(--gsc-beige)]">
        <h2 className="text-base font-semibold text-[var(--gsc-blue)] mb-2">
          Step 4 – Save
        </h2>

        <div className="grid md:grid-cols-2 gap-2">
          <div><span className="font-medium">Title:</span> {summary.title || "—"}</div>
          <div><span className="font-medium">Type:</span> {summary.type || "—"}</div>
          <div><span className="font-medium">Admin:</span> {summary.admin || "—"}</div>
          {summary.valueField && <div><span className="font-medium">Value Field:</span> {summary.valueField}</div>}
          {!!summary.catFields?.length && <div><span className="font-medium">Categories:</span> {summary.catFields.join(", ")}</div>}
          {summary.csvJoin && <div><span className="font-medium">CSV Join Field:</span> {summary.csvJoin}</div>}
          <div><span className="font-medium">Rows:</span> {summary.rows}</div>
        </div>

        {error && <div className="mt-3 text-[var(--gsc-red)]">{error}</div>}
        {done && <div className="mt-3 text-[var(--gsc-green)]">Saved successfully.</div>}
      </div>

      <div className="flex justify-between">
        <button onClick={back} className="px-3 py-2 rounded border">Back</button>
        {!done ? (
          <button
            onClick={save}
            disabled={saving}
            className="px-4 py-2 rounded text-white"
            style={{ background: saving ? "var(--gsc-light-gray)" : "var(--gsc-blue)" }}
          >
            {saving ? "Saving…" : "Save dataset"}
          </button>
        ) : (
          <button
            onClick={onClose}
            className="px-4 py-2 rounded text-white"
            style={{ background: "var(--gsc-green)" }}
          >
            Close
          </button>
        )}
      </div>
    </div>
  );
}

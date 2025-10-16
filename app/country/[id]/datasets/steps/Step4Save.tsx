"use client";

import { useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { CheckCircle2 } from "lucide-react";

type Parsed = { headers?: string[]; rows?: Record<string, string>[] } | null;

export default function Step4Save({
  meta,
  parsed,
  back,
  onClose,
}: {
  meta: any;
  parsed: Parsed;
  back: () => void;
  onClose: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [okId, setOkId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function ensureDatasetId(): Promise<string> {
    if (meta.dataset_id) return meta.dataset_id;
    const payload: any = {
      country_iso: meta.country_iso,
      title: (meta.title || "").trim(),
      dataset_type: meta.admin_level === "ADM0" && !parsed?.rows?.length ? "adm0" : meta.dataset_type || "gradient",
      data_format: meta.data_format || "numeric",
      admin_level: meta.admin_level,
      join_field: meta.join_field || null,
      year: meta.year ? Number(meta.year) : null,
      unit: meta.unit || null,
      source_name: meta.source_name || null,
      source_url: meta.source_url || null,
      indicator_id: meta.indicator_id || null,
      created_at: new Date().toISOString(),
    };
    const { data, error } = await supabase.from("dataset_metadata").insert(payload).select("id").single();
    if (error) throw error;
    return data.id as string;
  }

  function toNumber(val: string): number | null {
    const x = String(val ?? "").replace(/,/g, "").trim();
    if (x === "") return null;
    const n = Number(x);
    return isNaN(n) ? null : n;
  }

  async function doSave() {
    setSaving(true);
    setErr(null);
    setOkId(null);
    try {
      const datasetId = await ensureDatasetId();
      const adminLevel = meta.admin_level || "ADM0";

      // ADM0 single value
      if (adminLevel === "ADM0" && !parsed?.rows?.length) {
        const v = toNumber(meta.adm0_value);
        const row = {
          dataset_id: datasetId,
          admin_pcode: "ADM0",
          admin_level: "ADM0",
          value: v,
          unit: meta.unit || null,
        };
        const { error } = await supabase.from("dataset_values").insert(row);
        if (error) throw error;
        await supabase.from("dataset_metadata").update({ record_count: 1 }).eq("id", datasetId);
        setOkId(datasetId);
        return;
      }

      // file-backed datasets
      const headers = parsed?.headers ?? [];
      const rows = parsed?.rows ?? [];

      if (meta.dataset_type === "gradient") {
        const join = meta.join_field;
        const valueCol = meta.value_field;
        if (!join || !valueCol) throw new Error("Missing join field or value field.");

        const payload = rows
          .map((r) => {
            const pcode = r[join];
            const value = toNumber(r[valueCol]);
            if (!pcode || value == null) return null;
            return {
              dataset_id: datasetId,
              admin_pcode: pcode,
              admin_level: adminLevel,
              value,
              unit: meta.unit || null,
            };
          })
          .filter(Boolean) as any[];

        if (payload.length === 0) throw new Error("No valid gradient rows to save.");

        const { error } = await supabase.from("dataset_values").insert(payload);
        if (error) throw error;

        await supabase.from("dataset_metadata").update({ record_count: payload.length }).eq("id", datasetId);
        setOkId(datasetId);
        return;
      }

      if (meta.dataset_type === "categorical") {
        const join = meta.join_field;
        const catCols: string[] = meta.category_fields || [];
        if (!join || !catCols.length) throw new Error("Missing join field or category columns.");

        // 1) Ensure category map (code/label) exists for the dataset
        const mapRows = catCols.map((c) => ({ dataset_id: datasetId, code: c, label: c, score: null as number | null }));
        // Upsert category map by (dataset_id, code) unique index
        const { error: mapErr } = await supabase.from("dataset_category_maps").upsert(mapRows, { onConflict: "dataset_id,code" });
        if (mapErr) throw mapErr;

        // 2) Expand tall rows for dataset_values_cat
        const tall: any[] = [];
        for (const r of rows) {
          const pcode = r[join];
          if (!pcode) continue;
          for (const c of catCols) {
            const raw = r[c];
            const score = toNumber(raw);
            tall.push({
              dataset_id: datasetId,
              admin_pcode: pcode,
              admin_level: adminLevel,
              category_code: c,
              category_label: c,
              category_score: score, // numeric → number; text → NULL
            });
          }
        }

        if (tall.length === 0) throw new Error("No valid categorical rows to save.");

        const { error } = await supabase.from("dataset_values_cat").insert(tall);
        if (error) throw error;

        await supabase.from("dataset_metadata").update({ record_count: tall.length }).eq("id", datasetId);
        setOkId(datasetId);
        return;
      }

      throw new Error("Unknown dataset_type.");
    } catch (e: any) {
      setErr(e.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 text-sm text-[var(--gsc-gray)]">
      <div className="rounded-xl border p-4 bg-[var(--gsc-beige)]">
        <h2 className="text-base font-semibold text-[var(--gsc-blue)] mb-2">Step 4 – Save</h2>

        {!okId ? (
          <>
            <div className="mb-3">
              <div><b>Title:</b> {meta.title || "—"}</div>
              <div><b>Admin level:</b> {meta.admin_level}</div>
              <div><b>Type:</b> {meta.admin_level === "ADM0" && !parsed?.rows?.length ? "adm0" : meta.dataset_type}</div>
              <div><b>Data format:</b> {meta.data_format}</div>
              <div><b>Unit:</b> {meta.unit || "—"}</div>
              {meta.dataset_type === "gradient" && (
                <div><b>Join:</b> {meta.join_field} &nbsp; <b>Value:</b> {meta.value_field}</div>
              )}
              {meta.dataset_type === "categorical" && (
                <div><b>Join:</b> {meta.join_field} &nbsp; <b>Categories:</b> {(meta.category_fields || []).join(", ") || "—"}</div>
              )}
              <div><b>Indicator:</b> {meta.indicator_id ? meta.indicator_id : "—"}</div>
              <div><b>Source:</b> {meta.source_name || "—"} {meta.source_url ? `(${meta.source_url})` : ""}</div>
            </div>

            {err && <div className="text-[var(--gsc-red)]">{err}</div>}

            <div className="flex justify-between">
              <button onClick={back} disabled={saving} className="px-3 py-2 rounded border">
                Back
              </button>
              <button onClick={doSave} disabled={saving} className="px-4 py-2 rounded text-white" style={{ background: "var(--gsc-blue)" }}>
                {saving ? "Saving…" : "Save Dataset"}
              </button>
            </div>
          </>
        ) : (
          <div className="flex items-center gap-2 text-[var(--gsc-green)]">
            <CheckCircle2 className="h-5 w-5" />
            Saved! Dataset ID: <code>{okId}</code>
            <div className="ml-auto">
              <button onClick={onClose} className="px-3 py-2 rounded border">
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

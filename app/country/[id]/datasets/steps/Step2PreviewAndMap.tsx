"use client";

import { useMemo } from "react";
import { Parsed } from "@/components/country/AddDatasetModal";

export default function Step2PreviewAndMap({
  meta,
  setMeta,
  parsed,
  back,
  next,
}: {
  meta: any;
  setMeta: (m: any) => void;
  parsed: Parsed | null;
  back: () => void;
  next: () => void;
}) {
  const headers = parsed?.headers ?? [];
  const sample = (parsed?.rows ?? []).slice(0, 8);

  const isCategorical = meta.dataset_type === "categorical";
  const isGradient = meta.dataset_type === "gradient";
  const isAdm0 = meta.admin_level === "ADM0";

  const canContinue = useMemo(() => {
    if (isAdm0 && !parsed) return true; // Single value path handled in Step 4
    if (!parsed || headers.length === 0) return false;

    // CSV join field must be chosen for non-ADM0
    if (!isAdm0 && !meta.csv_join_field) return false;

    if (isGradient) return !!meta.value_field;
    if (isCategorical) return Array.isArray(meta.category_fields) && meta.category_fields.length > 0;
    return false;
  }, [isAdm0, isGradient, isCategorical, meta, parsed, headers.length]);

  return (
    <div className="flex flex-col gap-4 text-sm text-[var(--gsc-gray)]">
      <div className="rounded-xl border p-4 bg-[var(--gsc-beige)]">
        <h2 className="text-base font-semibold text-[var(--gsc-blue)] mb-3">
          Step 2 – Preview & Map
        </h2>

        {!isAdm0 && parsed && headers.length > 0 && (
          <div className="grid md:grid-cols-3 gap-3 mb-4">
            <label className="text-sm">
              Join Field in CSV (Pcode)
              <select
                className="border rounded p-2 w-full"
                value={meta.csv_join_field}
                onChange={(e) => setMeta({ ...meta, csv_join_field: e.target.value })}
              >
                <option value="">Select…</option>
                {headers.map((h: string) => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
            </label>

            {isGradient && (
              <label className="text-sm">
                Value Column
                <select
                  className="border rounded p-2 w-full"
                  value={meta.value_field}
                  onChange={(e) => setMeta({ ...meta, value_field: e.target.value })}
                >
                  <option value="">Select…</option>
                  {headers.map((h: string) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </label>
            )}

            {isCategorical && (
              <label className="text-sm">
                Category Columns (multi-select)
                <select
                  multiple
                  className="border rounded p-2 w-full h-32"
                  value={meta.category_fields ?? []}
                  onChange={(e) => {
                    const opts = Array.from(e.target.selectedOptions).map((o) => o.value);
                    setMeta({ ...meta, category_fields: opts });
                  }}
                >
                  {headers.map((h: string) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </label>
            )}
          </div>
        )}

        {parsed && headers.length > 0 && (
          <div className="rounded-xl border overflow-auto bg-white">
            <table className="min-w-full text-xs">
              <thead className="bg-[var(--gsc-light-gray)]/50">
                <tr>
                  {headers.map((h: string) => (
                    <th key={h} className="px-2 py-1 text-left font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sample.map((r, i) => (
                  <tr key={i} className="border-t">
                    {headers.map((h: string) => (
                      <td key={h} className="px-2 py-1">{r[h] ?? ""}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>

      <div className="flex justify-between">
        <button onClick={back} className="px-3 py-2 rounded border">Back</button>
        <button
          onClick={next}
          disabled={!canContinue}
          className="px-4 py-2 rounded text-white"
          style={{ background: canContinue ? "var(--gsc-blue)" : "var(--gsc-light-gray)" }}
        >
          Continue
        </button>
      </div>
    </div>
  );
}

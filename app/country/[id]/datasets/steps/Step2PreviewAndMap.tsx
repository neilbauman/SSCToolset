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
    if (isAdm0 && !parsed) return true;
    if (!parsed || headers.length === 0) return false;
    if (!isAdm0 && !meta.csv_join_field) return false;

    if (isGradient) return !!meta.value_field;
    if (isCategorical)
      return Array.isArray(meta.category_fields) && meta.category_fields.length > 0;
    return false;
  }, [isAdm0, isGradient, isCategorical, meta, parsed, headers.length]);

  function toggleCategoryField(col: string) {
    const current = meta.category_fields ?? [];
    if (current.includes(col)) {
      setMeta({ ...meta, category_fields: current.filter((c: string) => c !== col) });
    } else {
      setMeta({ ...meta, category_fields: [...current, col] });
    }
  }

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
                  <option key={h} value={h}>
                    {h}
                  </option>
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
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </label>
            )}

            {isCategorical && (
              <div className="text-sm flex flex-col">
                <div className="font-medium mb-1">Category Columns</div>
                <div className="border rounded bg-white p-2 overflow-y-auto max-h-48">
                  {headers.map((h: string) => (
                    <label key={h} className="flex items-center gap-2 py-1 cursor-pointer">
                      <input
                        type="checkbox"
                        className="accent-[var(--gsc-blue)]"
                        checked={meta.category_fields?.includes(h) ?? false}
                        onChange={() => toggleCategoryField(h)}
                      />
                      <span>{h}</span>
                    </label>
                  ))}
                  {headers.length === 0 && (
                    <div className="text-gray-500 text-xs">No columns available.</div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {parsed && headers.length > 0 && (
          <div className="rounded-xl border overflow-auto bg-white">
            <table className="min-w-full text-xs">
              <thead className="bg-[var(--gsc-light-gray)]/50 sticky top-0">
                <tr>
                  {headers.map((h: string) => (
                    <th key={h} className="px-2 py-1 text-left font-semibold whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sample.map((r, i) => (
                  <tr key={i} className="border-t">
                    {headers.map((h: string) => (
                      <td key={h} className="px-2 py-1 whitespace-nowrap">
                        {r[h] ?? ""}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="flex justify-between">
        <button onClick={back} className="px-3 py-2 rounded border">
          Back
        </button>
        <button
          onClick={next}
          disabled={!canContinue}
          className="px-4 py-2 rounded text-white"
          style={{
            background: canContinue ? "var(--gsc-blue)" : "var(--gsc-light-gray)",
          }}
        >
          Continue
        </button>
      </div>
    </div>
  );
}

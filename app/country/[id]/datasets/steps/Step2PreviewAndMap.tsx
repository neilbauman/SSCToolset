"use client";

import { useMemo, useState } from "react";

type Parsed = { headers?: string[]; rows?: Record<string, string>[] } | null;

export default function Step2PreviewAndMap({
  meta,
  setMeta,
  parsed,
  back,
  next,
}: {
  meta: any;
  setMeta: (m: any) => void;
  parsed: Parsed;
  back: () => void;
  next: () => void;
}) {
  const headers = parsed?.headers ?? [];
  const rows = parsed?.rows ?? [];

  // heuristics: guess join field, guess value field (first numeric-ish), and category fields (for categorical)
  const numericish = (v: string) => {
    if (v == null) return false;
    const x = String(v).replace(/,/g, "").trim();
    if (x === "") return false;
    return !isNaN(Number(x));
  };

  const sample = rows.slice(0, 20);
  const defaultJoin = useMemo(() => {
    const candidates = headers.filter((h) => /pcode|code|admin/i.test(h));
    return candidates[0] || headers[0] || "";
  }, [headers]);

  const defaultValueField = useMemo(() => {
    // pick first column where majority of sample values are numeric-like
    for (const h of headers) {
      const ok = sample.filter((r) => numericish(r[h])).length;
      if (ok >= Math.max(3, Math.ceil(sample.length * 0.6))) return h;
    }
    return "";
  }, [headers, sample]);

  const [joinField, setJoinField] = useState<string>(meta.join_field || defaultJoin);
  const [valueField, setValueField] = useState<string>(meta.value_field || defaultValueField);
  const [categoryFields, setCategoryFields] = useState<string[]>(meta.category_fields || []);

  const isAdm0 = meta.admin_level === "ADM0" && !rows.length; // ADM0 single-value path
  const isCategorical = meta.dataset_type === "categorical";
  const isGradient = meta.dataset_type === "gradient";

  function toggleCategory(h: string) {
    setCategoryFields((prev) => (prev.includes(h) ? prev.filter((x) => x !== h) : [...prev, h]));
  }

  function proceed() {
    // basic validation
    if (!isAdm0) {
      if (!joinField) return alert("Select a join (PCode) field.");
      if (isGradient && !valueField) return alert("Select a value field for gradient datasets.");
      if (isCategorical && categoryFields.length === 0) return alert("Select at least one category column.");
    }
    setMeta({
      ...meta,
      join_field: joinField,
      value_field: isGradient ? valueField : "",
      category_fields: isCategorical ? categoryFields : [],
    });
    next();
  }

  return (
    <div className="flex flex-col gap-4 text-sm text-[var(--gsc-gray)]">
      <div className="rounded-xl border p-4 bg-[var(--gsc-beige)]">
        <h2 className="text-base font-semibold text-[var(--gsc-blue)] mb-2">Step 2 – Preview & Map</h2>

        {isAdm0 ? (
          <div className="text-sm">ADM0 single-value dataset. No file mapping needed.</div>
        ) : (
          <>
            {/* Join field */}
            <div className="grid md:grid-cols-3 gap-3 mb-4">
              <label className="text-sm md:col-span-1">Join Field (PCode)
                <select className="border rounded p-2 w-full mt-1" value={joinField} onChange={(e) => setJoinField(e.target.value)}>
                  <option value="">Select…</option>
                  {headers.map((h: string) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </label>

              {/* Gradient */}
              {isGradient && (
                <label className="text-sm md:col-span-1">Value Field
                  <select className="border rounded p-2 w-full mt-1" value={valueField} onChange={(e) => setValueField(e.target.value)}>
                    <option value="">Select…</option>
                    {headers.map((h: string) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              {/* Categorical */}
              {isCategorical && (
                <div className="text-sm md:col-span-2">
                  <div className="font-medium mb-1">Category Columns</div>
                  <div className="flex flex-wrap gap-2">
                    {headers.map((h: string) => (
                      <label key={h} className="inline-flex items-center gap-1 border rounded px-2 py-1 bg-white">
                        <input type="checkbox" checked={categoryFields.includes(h)} onChange={() => toggleCategory(h)} />
                        <span>{h}</span>
                      </label>
                    ))}
                  </div>
                  <div className="text-xs mt-1 text-gray-500">
                    Non-numeric columns will be stored with <em>NULL</em> category_score; numeric values will be parsed.
                  </div>
                </div>
              )}
            </div>

            {/* Preview table */}
            <div className="rounded-xl border overflow-auto bg-white">
              <table className="min-w-full text-sm">
                <thead className="bg-[var(--gsc-light-gray)]/50">
                  <tr>
                    {headers.map((h: string) => (
                      <th key={h} className="px-2 py-1 border-b text-left font-medium">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 20).map((r, i) => (
                    <tr key={i} className="odd:bg-[var(--gsc-beige)]/40">
                      {headers.map((h: string) => (
                        <td key={h} className="px-2 py-1 border-b">
                          {r[h] ?? ""}
                        </td>
                      ))}
                    </tr>
                  ))}
                  {rows.length === 0 && (
                    <tr>
                      <td className="px-2 py-2 text-gray-500" colSpan={headers.length || 1}>
                        No rows to preview.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      <div className="flex justify-between">
        <button onClick={back} className="px-3 py-2 rounded border">
          Back
        </button>
        <button onClick={proceed} className="px-4 py-2 rounded text-white" style={{ background: "var(--gsc-blue)" }}>
          Continue →
        </button>
      </div>
    </div>
  );
}

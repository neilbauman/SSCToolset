"use client";
import { useState } from "react";

export default function Step2PreviewAndMap({
  parsed,
  meta,
  setMeta,
  next,
  back,
}: any) {
  const headers: string[] = parsed?.headers || [];
  const sampleRows: Record<string, string>[] = parsed?.rows?.slice(0, 5) || [];
  const isCategorical = meta.dataset_type === "categorical";

  const [joinField, setJoinField] = useState<string>(meta.join_field || "");
  const [valueField, setValueField] = useState<string>(meta.value_field || "");
  const [categoryFields, setCategoryFields] = useState<string[]>(
    meta.category_fields || []
  );

  function toggleCategoryField(col: string) {
    setCategoryFields((prev) =>
      prev.includes(col) ? prev.filter((c) => c !== col) : [...prev, col]
    );
  }

  function onNext() {
    setMeta({
      ...meta,
      join_field: joinField,
      value_field: valueField,
      category_fields: categoryFields,
    });
    next();
  }

  return (
    <div className="flex flex-col gap-4 text-sm text-[var(--gsc-gray)]">
      <div className="rounded-xl border p-4 bg-[var(--gsc-beige)]">
        <h2 className="text-base font-semibold text-[var(--gsc-blue)] mb-2">
          Step 2 – Preview and Mapping
        </h2>

        <p className="mb-2">
          Select which column represents the admin Pcode to join on.{" "}
          {isCategorical
            ? "Then select which category columns contain your data values."
            : "Then choose which column contains the numeric values."}
        </p>

        {/* Join Field */}
        <label className="text-sm font-medium mt-2 block">Join Field (Pcode)</label>
        <select
          className="border rounded p-2 w-full"
          value={joinField}
          onChange={(e) => setJoinField(e.target.value)}
        >
          <option value="">Select column…</option>
          {headers.map((h: string) => (
            <option key={h} value={h}>
              {h}
            </option>
          ))}
        </select>

        {!isCategorical && (
          <>
            <label className="text-sm font-medium mt-4 block">Value Column</label>
            <select
              className="border rounded p-2 w-full"
              value={valueField}
              onChange={(e) => setValueField(e.target.value)}
            >
              <option value="">Select numeric column…</option>
              {headers.map((h: string) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>
          </>
        )}

        {isCategorical && (
          <div className="mt-4">
            <div className="text-sm font-medium mb-1">Category Columns</div>
            {headers.map((h: string) =>
              h === joinField ? null : (
                <label key={h} className="flex items-center gap-2 mb-1">
                  <input
                    type="checkbox"
                    checked={categoryFields.includes(h)}
                    onChange={() => toggleCategoryField(h)}
                  />
                  {h}
                </label>
              )
            )}
          </div>
        )}

        {/* Table preview */}
        <div className="overflow-auto mt-4 border rounded bg-white">
          <table className="min-w-full text-xs">
            <thead className="bg-[var(--gsc-light-gray)]/50">
              <tr>
                {headers.map((h: string) => (
                  <th
                    key={h}
                    className="px-2 py-1 border-b text-left font-medium"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sampleRows.map((r: Record<string, string>, i: number) => (
                <tr key={i}>
                  {headers.map((h: string) => (
                    <td key={h} className="px-2 py-1 border-b">
                      {r[h]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex justify-between">
        <button onClick={back} className="px-3 py-2 rounded border">
          Back
        </button>
        <button
          onClick={onNext}
          disabled={!joinField}
          className="px-4 py-2 rounded text-white"
          style={{
            background: joinField
              ? "var(--gsc-blue)"
              : "var(--gsc-light-gray)",
          }}
        >
          Continue
        </button>
      </div>
    </div>
  );
}

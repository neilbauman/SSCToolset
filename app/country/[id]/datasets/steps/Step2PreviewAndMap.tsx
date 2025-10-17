"use client";

import { useState, useMemo } from "react";

export default function Step2PreviewAndMap({
  parsed,
  meta,
  setMeta,
  back,
  next,
}: {
  parsed: { headers: string[]; rows: Record<string, string>[] } | null;
  meta: any;
  setMeta: (m: any) => void;
  back: () => void;
  next: () => void;
}) {
  const [selectedJoin, setSelectedJoin] = useState<string>("");
  const [selectedCols, setSelectedCols] = useState<string[]>([]);

  const headers = parsed?.headers || [];
  const preview = useMemo(() => parsed?.rows?.slice(0, 10) || [], [parsed]);

  function toggleColumn(h: string) {
    setSelectedCols((prev) =>
      prev.includes(h) ? prev.filter((x) => x !== h) : [...prev, h]
    );
  }

  function handleContinue() {
    setMeta({
      ...meta,
      join_field_csv: selectedJoin,
      category_columns: selectedCols,
    });
    next();
  }

  return (
    <div className="flex flex-col gap-4 text-sm text-[var(--gsc-gray)]">
      <div className="rounded-xl border p-4 bg-[var(--gsc-beige)]">
        <h2 className="text-base font-semibold text-[var(--gsc-blue)] mb-2">
          Step 2 – Preview and Mapping
        </h2>
        <p className="mb-4">
          Match the <strong>{meta.join_field}</strong> field from the admin level
          to your CSV join column. Then select columns that contain numeric or
          percentage values.
        </p>

        <div className="grid md:grid-cols-2 gap-3 mb-3">
          <label className="text-sm">
            Join Field (Pcode)
            <select
              className="border rounded p-2 w-full"
              value={selectedJoin}
              onChange={(e) => setSelectedJoin(e.target.value)}
            >
              <option value="">Select CSV column…</option>
              {headers.map((h) => (
                <option key={h}>{h}</option>
              ))}
            </select>
          </label>
          <div className="text-xs text-gray-500 flex items-end">
            Target key from admin level: <span className="ml-1 font-medium">{meta.join_field}</span>
          </div>
        </div>

        <div className="max-h-[55vh] overflow-auto border rounded p-2 bg-white mb-3">
          <div className="mb-2 font-medium">Category Columns</div>
          <div className="grid grid-cols-3 gap-x-4 gap-y-1 mb-3">
            {headers.map((h) => (
              <label key={h} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectedCols.includes(h)}
                  onChange={() => toggleColumn(h)}
                />
                {h}
              </label>
            ))}
          </div>

          <table className="min-w-full text-xs border-t">
            <thead className="bg-[var(--gsc-light-gray)]/40 sticky top-0">
              <tr>
                {headers.map((h) => (
                  <th key={h} className="px-2 py-1 border-b text-left font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {preview.map((r, i) => (
                <tr key={i} className="border-b">
                  {headers.map((h) => (
                    <td key={h} className="px-2 py-1">
                      {r[h]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="sticky bottom-0 bg-[var(--gsc-beige)] border-t pt-3 flex justify-between">
          <button onClick={back} className="px-3 py-2 rounded border">
            Back
          </button>
          <button
            onClick={handleContinue}
            disabled={!selectedJoin || selectedCols.length === 0}
            className="px-4 py-2 rounded text-white"
            style={{
              background:
                !selectedJoin || selectedCols.length === 0
                  ? "var(--gsc-light-gray)"
                  : "var(--gsc-blue)",
            }}
          >
            Continue →
          </button>
        </div>
      </div>
    </div>
  );
}

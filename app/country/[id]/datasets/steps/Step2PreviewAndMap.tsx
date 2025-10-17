"use client";

export default function Step2PreviewAndMap({
  parsed,
  meta,
  setMeta,
  back,
  next,
}: {
  parsed: any;
  meta: any;
  setMeta: (m: any) => void;
  back: () => void;
  next: () => void;
}) {
  const headers = parsed?.headers || [];

  function toggleCategory(h: string) {
    const selected = meta.category_fields || [];
    if (selected.includes(h))
      setMeta({ ...meta, category_fields: selected.filter((x: string) => x !== h) });
    else setMeta({ ...meta, category_fields: [...selected, h] });
  }

  return (
    <div className="rounded-xl border p-4 bg-[var(--gsc-beige)]">
      <h2 className="text-base font-semibold text-[var(--gsc-blue)] mb-2">
        Step 2 – Preview and Mapping
      </h2>
      <p className="text-sm mb-4">
        Match the <strong>{meta.join_field}</strong> field from the admin level
        to your CSV join column. Then select columns that contain numeric or
        percentage values.
      </p>

      <label className="text-sm mb-2 block">
        Join Field (Pcode)
        <select
          className="border rounded p-2 w-full"
          value={meta.join_field}
          onChange={(e) => setMeta({ ...meta, join_field: e.target.value })}
        >
          {headers.map((h: string) => (
            <option key={h} value={h}>
              {h}
            </option>
          ))}
        </select>
      </label>

      <div className="mb-2 text-sm">Category Columns</div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-1 mb-3 text-sm">
        {headers.map((h: string) => (
          <label key={h} className="flex items-center gap-1">
            <input
              type="checkbox"
              checked={meta.category_fields?.includes(h)}
              onChange={() => toggleCategory(h)}
            />
            {h}
          </label>
        ))}
      </div>

      <div className="overflow-auto border rounded">
        <table className="w-full text-sm">
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
            {(parsed?.rows || []).slice(0, 10).map((r: any, i: number) => (
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

      <div className="flex justify-end gap-2 mt-4">
        <button onClick={back} className="px-3 py-2 rounded border border-gray-400">
          Back
        </button>
        <button
          onClick={next}
          disabled={!meta.join_field}
          className="px-4 py-2 rounded text-white"
          style={{
            background: meta.join_field
              ? "var(--gsc-blue)"
              : "var(--gsc-light-gray)",
          }}
        >
          Continue →
        </button>
      </div>
    </div>
  );
}

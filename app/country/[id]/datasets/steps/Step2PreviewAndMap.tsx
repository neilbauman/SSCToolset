"use client";

type Step2PreviewAndMapProps = {
  parsed: { headers: string[]; rows: Record<string, string>[] } | null;
  meta: any;
  setMeta: (v: any) => void;
  back: () => void;
  next: () => void;
};

export default function Step2PreviewAndMap({
  parsed,
  meta,
  setMeta,
  back,
  next,
}: Step2PreviewAndMapProps) {
  const headers: string[] = parsed?.headers || [];
  const rows: Record<string, string>[] = parsed?.rows?.slice(0, 10) || [];

  return (
    <div className="flex flex-col gap-4 text-sm">
      <h2 className="text-base font-semibold text-[var(--gsc-blue)]">
        Step 2 – Preview and Mapping
      </h2>

      <p className="text-[var(--gsc-gray)] mb-2">
        Match the pcode field from the admin level to your CSV join column.
        Then select which field contains numeric or percentage values.
      </p>

      {/* ---- Join Field ---- */}
      <div>
        <label className="block mb-1 font-medium">Join Field (Pcode)</label>
        <select
          className="border rounded p-2 w-full"
          value={meta.join_field || ""}
          onChange={(e) => setMeta({ ...meta, join_field: e.target.value })}
        >
          {headers.map((h: string) => (
            <option key={h} value={h}>
              {h}
            </option>
          ))}
        </select>
      </div>

      {/* ---- Value Field ---- */}
      <div>
        <label className="block mb-1 font-medium">Value Field</label>
        <select
          className="border rounded p-2 w-full"
          value={meta.value_field || ""}
          onChange={(e) => setMeta({ ...meta, value_field: e.target.value })}
        >
          <option value="">Select field…</option>
          {headers.map((h: string) => (
            <option key={h} value={h}>
              {h}
            </option>
          ))}
        </select>
      </div>

      {/* ---- Data Preview ---- */}
      {rows.length > 0 && (
        <div className="overflow-x-auto border rounded-md bg-white mt-4">
          <table className="min-w-full text-xs border-collapse">
            <thead className="bg-gray-100">
              <tr>
                {headers.map((h: string) => (
                  <th
                    key={h}
                    className="px-2 py-1 text-left font-semibold border-b border-gray-200"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r: Record<string, string>, idx: number) => (
                <tr
                  key={idx}
                  className="odd:bg-white even:bg-gray-50 hover:bg-gray-100 transition"
                >
                  {headers.map((h: string) => (
                    <td key={h} className="px-2 py-1 border-t border-gray-100">
                      {r[h]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ---- Navigation ---- */}
      <div className="flex justify-between mt-6">
        <button
          onClick={back}
          className="px-4 py-2 rounded border border-gray-300 hover:bg-gray-50"
        >
          ← Back
        </button>
        <button
          onClick={next}
          disabled={!meta.value_field || !meta.join_field}
          className="px-4 py-2 rounded bg-[var(--gsc-blue)] text-white disabled:bg-gray-300"
        >
          Continue →
        </button>
      </div>
    </div>
  );
}

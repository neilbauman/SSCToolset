"use client";

export default function Step2PreviewAndMap({ parsed, meta, setMeta, back, next }: any) {
  const headers = parsed?.headers || [];
  const rows = parsed?.rows?.slice(0, 10) || []; // show preview

  return (
    <div className="flex flex-col gap-4 text-sm">
      <h2 className="text-base font-semibold text-[var(--gsc-blue)]">
        Step 2 – Preview and Mapping
      </h2>

      <div>
        <label className="block mb-1 font-medium">Join Field (Pcode)</label>
        <select
          className="border rounded p-2 w-full"
          value={meta.join_field || ""}
          onChange={(e) => setMeta({ ...meta, join_field: e.target.value })}
        >
          {headers.map((h: string) => (
            <option key={h}>{h}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block mb-1 font-medium">Value Field</label>
        <select
          className="border rounded p-2 w-full"
          value={meta.value_field || ""}
          onChange={(e) => setMeta({ ...meta, value_field: e.target.value })}
        >
          {headers.map((h: string) => (
            <option key={h}>{h}</option>
          ))}
        </select>
      </div>

      {/* --- Data preview table --- */}
      {rows.length > 0 && (
        <div className="overflow-x-auto border rounded-md bg-white mt-4">
          <table className="min-w-full text-xs">
            <thead className="bg-gray-100">
              <tr>
                {headers.map((h) => (
                  <th key={h} className="px-2 py-1 text-left font-semibold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r: any, idx: number) => (
                <tr key={idx} className="odd:bg-white even:bg-gray-50">
                  {headers.map((h) => (
                    <td key={h} className="px-2 py-1 border-t">
                      {r[h]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex justify-between mt-4">
        <button onClick={back} className="px-4 py-2 rounded border">
          ← Back
        </button>
        <button onClick={next} className="px-4 py-2 rounded bg-[var(--gsc-blue)] text-white">
          Continue →
        </button>
      </div>
    </div>
  );
}

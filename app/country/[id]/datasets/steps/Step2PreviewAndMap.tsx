"use client";

export default function Step2PreviewAndMap({ parsed, meta, setMeta, back, next }: any) {
  const headers = parsed?.headers || [];

  return (
    <div className="text-sm flex flex-col gap-4">
      <h2 className="text-base font-semibold text-[var(--gsc-blue)]">
        Step 2 – Preview and Mapping
      </h2>

      <div>
        <label className="block mb-1">Join Field (Pcode)</label>
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
        <label className="block mb-1">Value Field</label>
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

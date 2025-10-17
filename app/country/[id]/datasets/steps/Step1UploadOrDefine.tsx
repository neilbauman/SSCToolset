"use client";

import { useState } from "react";

export default function Step1UploadOrDefine({
  countryIso,
  file,
  setFile,
  parseCsv,
  parsed,
  setParsed,
  meta,
  setMeta,
  next,
}: {
  countryIso: string;
  file: File | null;
  setFile: (f: File | null) => void;
  parseCsv: (f: File) => Promise<any>;
  parsed: any;
  setParsed: (p: any) => void;
  meta: any;
  setMeta: (m: any) => void;
  next: () => void;
}) {
  const [uploading, setUploading] = useState(false);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setUploading(true);
    const result = await parseCsv(f);
    setParsed(result);
    setUploading(false);
  }

  return (
    <div className="rounded-xl border p-4 bg-[var(--gsc-beige)]">
      <h2 className="text-base font-semibold text-[var(--gsc-blue)] mb-2">
        Step 1 – Upload or Define Dataset
      </h2>

      <div className="grid md:grid-cols-2 gap-4">
        <label className="text-sm">
          Title
          <input
            className="border rounded p-2 w-full"
            value={meta.title}
            onChange={(e) => setMeta({ ...meta, title: e.target.value })}
          />
        </label>

        <label className="text-sm">
          Country
          <input
            className="border rounded p-2 w-full bg-gray-100"
            value={countryIso}
            disabled
          />
        </label>

        <label className="text-sm">
          Admin Level
          <select
            className="border rounded p-2 w-full"
            value={meta.admin_level}
            onChange={(e) => setMeta({ ...meta, admin_level: e.target.value })}
          >
            <option value="ADM0">ADM0</option>
            <option value="ADM1">ADM1</option>
            <option value="ADM2">ADM2</option>
            <option value="ADM3">ADM3</option>
          </select>
        </label>

        <label className="text-sm">
          Data Format
          <select
            className="border rounded p-2 w-full"
            value={meta.data_format}
            onChange={(e) => setMeta({ ...meta, data_format: e.target.value })}
          >
            <option value="numeric">Numeric</option>
            <option value="percentage">Percentage</option>
          </select>
        </label>

        <div className="col-span-2">
          <input
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="hidden"
            id="fileInput"
          />
          <label
            htmlFor="fileInput"
            className="block w-full text-center border-dashed border-2 border-gray-400 p-4 rounded cursor-pointer"
          >
            {file ? (
              <>
                <p className="text-sm">{file.name}</p>
                <p className="text-xs text-gray-500">
                  Parsed {parsed?.rows?.length || 0} rows,{" "}
                  {parsed?.headers?.length || 0} columns.
                </p>
              </>
            ) : uploading ? (
              "Parsing..."
            ) : (
              "Click to upload CSV"
            )}
          </label>
        </div>

        <label className="text-sm">
          Year
          <input
            type="text"
            className="border rounded p-2 w-full"
            value={meta.year}
            onChange={(e) => setMeta({ ...meta, year: e.target.value })}
          />
        </label>

        <label className="text-sm">
          Unit
          <input
            className="border rounded p-2 w-full"
            value={meta.unit}
            onChange={(e) => setMeta({ ...meta, unit: e.target.value })}
          />
        </label>

        <label className="text-sm">
          Source Name
          <input
            className="border rounded p-2 w-full"
            value={meta.source_name}
            onChange={(e) => setMeta({ ...meta, source_name: e.target.value })}
          />
        </label>

        <label className="text-sm">
          Source URL
          <input
            className="border rounded p-2 w-full"
            value={meta.source_url}
            onChange={(e) => setMeta({ ...meta, source_url: e.target.value })}
          />
        </label>

        <label className="text-sm">
          Dataset Type
          <select
            className="border rounded p-2 w-full"
            value={meta.dataset_type}
            onChange={(e) => setMeta({ ...meta, dataset_type: e.target.value })}
          >
            <option value="gradient">Gradient</option>
            <option value="categorical">Categorical</option>
            <option value="adm0">Adm0</option>
          </select>
        </label>

        <label className="text-sm">
          Join Field (from admin level)
          <input
            className="border rounded p-2 w-full bg-gray-100"
            value={meta.join_field || "admin_pcode"}
            disabled
          />
        </label>
      </div>

      <div className="flex justify-end mt-4">
        <button
          onClick={next}
          disabled={!parsed?.rows?.length}
          className="px-4 py-2 rounded text-white"
          style={{
            background: parsed?.rows?.length
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

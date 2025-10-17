"use client";

import { useState } from "react";
import { Upload, FileText, Loader2 } from "lucide-react";
import Papa from "papaparse";

type Step1Props = {
  countryIso: string;
  file: File | null;
  setFile: (f: File | null) => void;
  parsed: any;
  setParsed: (p: any) => void;
  meta: any;
  setMeta: (m: any) => void;
  next: () => void;
};

export default function Step1UploadOrDefine({
  countryIso,
  file,
  setFile,
  parsed,
  setParsed,
  meta,
  setMeta,
  next,
}: Step1Props) {
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setUploading(true);
    try {
      const text = await f.text();
      const parsedData = Papa.parse(text, { header: true });
      setParsed({
        headers: parsedData.meta.fields || [],
        rows: parsedData.data || [],
      });
      setMessage(`Parsed ${parsedData.data.length} rows.`);
    } catch (err) {
      console.error(err);
      setMessage("Failed to parse file.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 text-sm">
      <h2 className="text-base font-semibold text-[var(--gsc-blue)]">
        Step 1 – Upload or Define Dataset
      </h2>

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col">
          <span>Title</span>
          <input
            className="border rounded p-2"
            value={meta.title || ""}
            onChange={(e) => setMeta({ ...meta, title: e.target.value })}
          />
        </label>

        <label className="flex flex-col">
          <span>Country</span>
          <input className="border rounded p-2" value={countryIso} disabled />
        </label>

        <label className="flex flex-col">
          <span>Admin Level</span>
          <select
            className="border rounded p-2"
            value={meta.admin_level}
            onChange={(e) => setMeta({ ...meta, admin_level: e.target.value })}
          >
            {["ADM0", "ADM1", "ADM2", "ADM3", "ADM4", "ADM5"].map((lvl) => (
              <option key={lvl}>{lvl}</option>
            ))}
          </select>
        </label>

        <label className="flex flex-col">
          <span>Data Format</span>
          <select
            className="border rounded p-2"
            value={meta.data_format}
            onChange={(e) => setMeta({ ...meta, data_format: e.target.value })}
          >
            <option value="numeric">Numeric</option>
            <option value="percentage">Percentage</option>
            <option value="text">Text</option>
          </select>
        </label>
      </div>

      <div className="flex flex-col items-center border-2 border-dashed rounded p-6 bg-white">
        {!file ? (
          <label className="flex flex-col items-center cursor-pointer">
            <Upload className="h-8 w-8 text-[var(--gsc-blue)] mb-2" />
            <span>Click to upload file</span>
            <input type="file" accept=".csv" onChange={handleFileSelect} className="hidden" />
          </label>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <FileText className="h-8 w-8 text-[var(--gsc-green)]" />
            <span>{file.name}</span>
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
            ) : (
              <button
                onClick={() => setFile(null)}
                className="text-xs text-[var(--gsc-red)] underline"
              >
                Remove file
              </button>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <input
          placeholder="Year"
          className="border rounded p-2"
          value={meta.year || ""}
          onChange={(e) => setMeta({ ...meta, year: e.target.value })}
        />
        <input
          placeholder="Unit"
          className="border rounded p-2"
          value={meta.unit || ""}
          onChange={(e) => setMeta({ ...meta, unit: e.target.value })}
        />
        <input
          placeholder="Source Name"
          className="border rounded p-2"
          value={meta.source_name || ""}
          onChange={(e) => setMeta({ ...meta, source_name: e.target.value })}
        />
        <input
          placeholder="Source URL"
          className="border rounded p-2"
          value={meta.source_url || ""}
          onChange={(e) => setMeta({ ...meta, source_url: e.target.value })}
        />
      </div>

      {message && <div className="text-sm text-[var(--gsc-gray)]">{message}</div>}

      <div className="flex justify-end mt-3">
        <button
          onClick={next}
          className="px-4 py-2 rounded text-white bg-[var(--gsc-blue)]"
          disabled={!parsed || uploading}
        >
          Continue →
        </button>
      </div>
    </div>
  );
}

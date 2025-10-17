"use client";

import { useEffect, useMemo, useState } from "react";
import { Parsed } from "@/components/country/AddDatasetModal";
import { Upload, Loader2 } from "lucide-react";

type Step1Props = {
  countryIso: string;
  file: File | null;
  setFile: (f: File | null) => void;
  parseCsv: (f: File) => Promise<Parsed>;
  parsed: Parsed | null;
  setParsed: (p: Parsed | null) => void;
  meta: any;
  setMeta: (m: any) => void;
  next: () => void;
};

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
}: Step1Props) {
  const [uploading, setUploading] = useState(false);
  const canContinue = useMemo(() => {
    if (!meta.title?.trim()) return false;
    if (!meta.data_format) return false;
    if (!meta.admin_level) return false;

    // if no file and ADM0, require a national value
    if (!file && meta.admin_level === "ADM0") {
      return meta.adm0_value !== "";
    }

    // if a file or admin > ADM0, require dataset_type
    if (file || meta.admin_level !== "ADM0") {
      return !!meta.dataset_type;
    }
    return true;
  }, [file, meta]);

  useEffect(() => {
    if (!file) setParsed(null);
  }, [file, setParsed]);

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    if (!f) return;
    setUploading(true);
    try {
      const p = await parseCsv(f);
      setParsed(p);
      if (!meta.title) {
        setMeta({ ...meta, title: f.name.replace(/\.(csv|xlsx)$/i, "") });
      }
      // default to gradient if a file is present and user hasn't chosen yet
      if (!meta.dataset_type) {
        setMeta({ ...meta, title: meta.title || f.name.replace(/\.(csv|xlsx)$/i, ""), dataset_type: "gradient" });
      }
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 text-sm text-[var(--gsc-gray)]">
      <div className="rounded-xl border p-4 bg-[var(--gsc-beige)]">
        <h2 className="text-base font-semibold text-[var(--gsc-blue)] mb-2">
          Step 1 – Upload or Define Dataset
        </h2>

        <div className="grid md:grid-cols-2 gap-3">
          <label className="text-sm">
            Title
            <input
              className="border rounded p-2 w-full"
              value={meta.title}
              onChange={(e) => setMeta({ ...meta, title: e.target.value })}
            />
          </label>

          <label className="text-sm">
            Admin Level
            <select
              className="border rounded p-2 w-full"
              value={meta.admin_level}
              onChange={(e) => setMeta({ ...meta, admin_level: e.target.value })}
            >
              {["ADM0","ADM1","ADM2","ADM3","ADM4","ADM5"].map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </label>

          <label className="text-sm">
            Data Format
            <select
              className="border rounded p-2 w-full"
              value={meta.data_format}
              onChange={(e) => setMeta({ ...meta, data_format: e.target.value })}
            >
              {["numeric","percentage","text"].map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </label>

          {(file || meta.admin_level !== "ADM0") && (
            <label className="text-sm">
              Dataset Type
              <select
                className="border rounded p-2 w-full"
                value={meta.dataset_type}
                onChange={(e) => setMeta({ ...meta, dataset_type: e.target.value })}
              >
                <option value="">Select…</option>
                <option value="gradient">gradient</option>
                <option value="categorical">categorical</option>
                <option value="adm0">adm0</option>
              </select>
            </label>
          )}

          <label className="text-sm">
            Year
            <input
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
        </div>

        <div className="mt-4 rounded border bg-white p-3">
          <div className="font-medium mb-2">Upload CSV (optional)</div>
          {!file ? (
            <label className="flex items-center gap-3 cursor-pointer">
              <Upload className="h-5 w-5 text-[var(--gsc-blue)]" />
              <span className="text-[var(--gsc-blue)] underline">Choose file</span>
              <input type="file" accept=".csv" className="hidden" onChange={handleFileSelect} />
            </label>
          ) : (
            <div className="flex items-center gap-3">
              <span className="text-[var(--gsc-green)]">{file.name}</span>
              {uploading ? (
                <span className="flex items-center gap-2 text-gray-500"><Loader2 className="h-4 w-4 animate-spin"/> Parsing…</span>
              ) : (
                <button className="text-[var(--gsc-red)] underline text-xs" onClick={() => setFile(null)}>Remove</button>
              )}
            </div>
          )}
          {parsed && (
            <div className="text-xs text-gray-600 mt-2">
              Parsed {parsed.rows.length} rows, {parsed.headers.length} columns.
            </div>
          )}
        </div>

        {!file && meta.admin_level === "ADM0" && (
          <div className="mt-4 grid grid-cols-1 gap-2">
            <label className="text-sm">
              National (ADM0) Value
              <input
                className="border rounded p-2 w-full"
                value={meta.adm0_value}
                onChange={(e) => setMeta({ ...meta, adm0_value: e.target.value })}
                placeholder="e.g., 5.1"
              />
            </label>
          </div>
        )}
      </div>

      <div className="flex justify-end">
        <button
          onClick={next}
          disabled={!canContinue}
          className="px-4 py-2 rounded text-white"
          style={{ background: canContinue ? "var(--gsc-blue)" : "var(--gsc-light-gray)" }}
        >
          Continue
        </button>
      </div>
    </div>
  );
}

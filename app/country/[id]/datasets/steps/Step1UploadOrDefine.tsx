"use client";

import { useState } from "react";
import { Upload, FileText, Loader2 } from "lucide-react";

type Parsed = { headers: string[]; rows: Record<string, string>[] } | null;
type WizardMeta = any;

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
  parsed: Parsed;
  setParsed: (p: Parsed | null) => void;
  meta: WizardMeta;
  setMeta: (m: WizardMeta) => void;
  next: () => void;
}) {
  const [uploading, setUploading] = useState(false);

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setUploading(true);
    const p = await parseCsv(f);
    setParsed(p);
    setUploading(false);
    setMeta({
      ...meta,
      title: f.name.replace(/\.(csv|xlsx)$/i, ""),
      dataset_type: meta.dataset_type || "gradient",
    });
  }

  const canContinue =
    !!meta.title && !!meta.admin_level && (!!file || meta.admin_level === "ADM0");

  return (
    <div className="flex flex-col gap-4 text-sm text-[var(--gsc-gray)]">
      <div className="rounded-xl border p-4 bg-[var(--gsc-beige)]">
        <h2 className="text-base font-semibold text-[var(--gsc-blue)] mb-2">
          Step 1 – Upload or Define Dataset
        </h2>

        <label className="block text-sm font-medium mb-1">Dataset Title</label>
        <input
          className="border rounded p-2 w-full mb-3"
          value={meta.title || ""}
          onChange={(e) => setMeta({ ...meta, title: e.target.value })}
          placeholder="Enter dataset title"
        />

        <div className="grid md:grid-cols-2 gap-3 mb-3">
          <label className="text-sm">
            Admin Level
            <select
              className="border rounded p-2 w-full"
              value={meta.admin_level || "ADM0"}
              onChange={(e) =>
                setMeta({ ...meta, admin_level: e.target.value })
              }
            >
              {["ADM0", "ADM1", "ADM2", "ADM3", "ADM4", "ADM5"].map((a) => (
                <option key={a}>{a}</option>
              ))}
            </select>
          </label>

          <label className="text-sm">
            Dataset Type
            <select
              className="border rounded p-2 w-full"
              value={meta.dataset_type || ""}
              onChange={(e) =>
                setMeta({ ...meta, dataset_type: e.target.value })
              }
            >
              <option value="">Select…</option>
              <option value="gradient">Gradient (numeric)</option>
              <option value="categorical">Categorical</option>
              <option value="adm0">ADM0 single value</option>
            </select>
          </label>
        </div>

        <div className="grid md:grid-cols-2 gap-3 mb-3">
          <label className="text-sm">
            Data Format
            <select
              className="border rounded p-2 w-full"
              value={meta.data_format || "numeric"}
              onChange={(e) =>
                setMeta({ ...meta, data_format: e.target.value })
              }
            >
              <option value="numeric">Numeric</option>
              <option value="percentage">Percentage</option>
              <option value="text">Text</option>
            </select>
          </label>

          <label className="text-sm">
            Year
            <input
              className="border rounded p-2 w-full"
              value={meta.year || ""}
              onChange={(e) => setMeta({ ...meta, year: e.target.value })}
            />
          </label>
        </div>

        <div className="grid md:grid-cols-2 gap-3 mb-3">
          <label className="text-sm">
            Source Name
            <input
              className="border rounded p-2 w-full"
              value={meta.source_name || ""}
              onChange={(e) =>
                setMeta({ ...meta, source_name: e.target.value })
              }
            />
          </label>

          <label className="text-sm">
            Source URL
            <input
              className="border rounded p-2 w-full"
              value={meta.source_url || ""}
              onChange={(e) =>
                setMeta({ ...meta, source_url: e.target.value })
              }
            />
          </label>
        </div>

        {/* Upload CSV */}
        <div className="mt-3">
          <label className="text-sm font-medium mb-1">Upload CSV (optional)</label>
          {!file ? (
            <label className="flex flex-col items-center justify-center border-2 border-dashed border-[var(--gsc-light-gray)] rounded-lg p-6 bg-white cursor-pointer">
              <Upload className="h-8 w-8 text-[var(--gsc-blue)] mb-2" />
              <span className="text-[var(--gsc-blue)]">Click to upload file</span>
              <input
                type="file"
                accept=".csv,.xlsx"
                className="hidden"
                onChange={handleFileSelect}
              />
            </label>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <FileText className="h-8 w-8 text-[var(--gsc-green)]" />
              <div className="font-medium">{file.name}</div>
              {uploading ? (
                <div className="flex items-center gap-2 text-gray-500 text-sm">
                  <Loader2 className="h-4 w-4 animate-spin" /> Parsing…
                </div>
              ) : (
                <button
                  onClick={() => {
                    setFile(null);
                    setParsed(null);
                  }}
                  className="text-[var(--gsc-red)] text-xs underline"
                >
                  Remove file
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={next}
          disabled={!canContinue}
          className="px-4 py-2 rounded text-white"
          style={{
            background: canContinue
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

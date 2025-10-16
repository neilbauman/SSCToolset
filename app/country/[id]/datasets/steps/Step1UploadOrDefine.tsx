"use client";

import { useEffect, useMemo, useState } from "react";
import { Upload, FileText, Loader2 } from "lucide-react";

type Parsed = { headers: string[]; rows: Record<string, string>[] };
type Props = {
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
}: Props) {
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const canContinue = useMemo(() => {
    if (!meta.title?.trim()) return false;
    if (!file && meta.admin_level === "ADM0") {
      // adm0 single value
      return (meta.adm0_value ?? "") !== "" && !!meta.data_format;
    }
    if (file) {
      return !!meta.data_format && !!meta.admin_level;
    }
    return true;
  }, [file, meta]);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] || null;
    setFile(f);
    setParsed(null);
    if (!f) return;
    setUploading(true);
    try {
      const p = await parseCsv(f);
      setParsed(p);
      setMsg(`Parsed ${p.rows.length} rows, ${p.headers.length} columns.`);
      if (!meta.title) {
        setMeta({ ...meta, title: f.name.replace(/\.(csv|xlsx)$/i, "") });
      }
      if (!meta.dataset_type) {
        setMeta({ ...meta, dataset_type: "gradient" });
      }
    } catch (e: any) {
      setMsg(e.message || "Failed to parse file.");
    } finally {
      setUploading(false);
    }
  }

  useEffect(() => {
    if (!file) setParsed(null);
  }, [file, setParsed]);

  return (
    <div className="flex flex-col gap-4 text-sm text-[var(--gsc-gray)]">
      <div className="rounded-xl border p-4 bg-[var(--gsc-beige)]">
        <h2 className="text-base font-semibold text-[var(--gsc-blue)] mb-2">Step 1 – Upload or Define</h2>
        <div className="grid md:grid-cols-2 gap-3">
          <label className="text-sm">Title
            <input
              className="border rounded p-2 w-full"
              value={meta.title ?? ""}
              onChange={(e) => setMeta({ ...meta, title: e.target.value })}
              placeholder="Dataset title"
            />
          </label>
          <div className="text-sm">Country
            <div className="mt-2 font-medium">{countryIso}</div>
          </div>

          <label className="text-sm">Admin Level
            <select
              className="border rounded p-2 w-full"
              value={meta.admin_level ?? "ADM0"}
              onChange={(e) => setMeta({ ...meta, admin_level: e.target.value })}
            >
              {["ADM0", "ADM1", "ADM2", "ADM3", "ADM4", "ADM5"].map((a) => (
                <option key={a}>{a}</option>
              ))}
            </select>
          </label>

          <label className="text-sm">Data Format
            <select
              className="border rounded p-2 w-full"
              value={meta.data_format ?? "numeric"}
              onChange={(e) => setMeta({ ...meta, data_format: e.target.value })}
            >
              {["numeric", "percentage", "text"].map((a) => (
                <option key={a}>{a}</option>
              ))}
            </select>
          </label>

          {/* ADM0 single metric path */}
          {!file && meta.admin_level === "ADM0" && (
            <>
              <label className="text-sm">ADM0 Value
                <input
                  className="border rounded p-2 w-full"
                  value={meta.adm0_value ?? ""}
                  onChange={(e) => setMeta({ ...meta, adm0_value: e.target.value })}
                  placeholder="e.g., 5.1"
                />
              </label>
              <label className="text-sm">Unit
                <input
                  className="border rounded p-2 w-full"
                  value={meta.unit ?? ""}
                  onChange={(e) => setMeta({ ...meta, unit: e.target.value })}
                  placeholder="e.g., % or people/HH"
                />
              </label>
            </>
          )}

          {/* File upload */}
          <div className="md:col-span-2">
            <div className="flex items-center justify-center border-2 border-dashed border-[var(--gsc-light-gray)] rounded-lg p-6 bg-white">
              {!file ? (
                <label className="flex flex-col items-center cursor-pointer">
                  <Upload className="h-8 w-8 text-[var(--gsc-blue)] mb-2" />
                  <span className="text-[var(--gsc-blue)]">Click to upload CSV/XLSX</span>
                  <input type="file" accept=".csv,.xlsx" className="hidden" onChange={handleFile} />
                </label>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <FileText className="h-8 w-8 text-[var(--gsc-green)]" />
                  <div className="font-medium">{file.name}</div>
                  {uploading ? (
                    <div className="flex items-center gap-2 text-gray-500 text-sm">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Parsing…
                    </div>
                  ) : (
                    <button className="text-[var(--gsc-red)] text-xs underline" onClick={() => setFile(null)}>
                      Remove file
                    </button>
                  )}
                </div>
              )}
            </div>
            {parsed && (
              <div className="mt-2 text-xs text-gray-600">
                {parsed.rows.length} rows, {parsed.headers.length} columns parsed.
              </div>
            )}
            {msg && (
              <div className="mt-2 text-xs" style={{ color: msg.includes("Failed") ? "var(--gsc-red)" : "var(--gsc-green)" }}>
                {msg}
              </div>
            )}
          </div>

          <label className="text-sm">Year
            <input className="border rounded p-2 w-full" value={meta.year ?? ""} onChange={(e) => setMeta({ ...meta, year: e.target.value })} />
          </label>
          <label className="text-sm">Unit
            <input className="border rounded p-2 w-full" value={meta.unit ?? ""} onChange={(e) => setMeta({ ...meta, unit: e.target.value })} />
          </label>
          <label className="text-sm">Source Name
            <input className="border rounded p-2 w-full" value={meta.source_name ?? ""} onChange={(e) => setMeta({ ...meta, source_name: e.target.value })} />
          </label>
          <label className="text-sm">Source URL
            <input className="border rounded p-2 w-full" value={meta.source_url ?? ""} onChange={(e) => setMeta({ ...meta, source_url: e.target.value })} />
          </label>

          {/* Dataset Type appears when file present or admin_level > ADM0 */}
          {(file || meta.admin_level !== "ADM0") && (
            <label className="text-sm">Dataset Type
              <select
                className="border rounded p-2 w-full"
                value={meta.dataset_type || ""}
                onChange={(e) => setMeta({ ...meta, dataset_type: e.target.value })}
              >
                <option value="">Select…</option>
                <option value="gradient">gradient</option>
                <option value="categorical">categorical</option>
              </select>
            </label>
          )}

          {/* Join field hint when file present */}
          {file && (
            <label className="text-sm">Join Field (pcode column)
              <input
                className="border rounded p-2 w-full"
                value={meta.join_field ?? "admin_pcode"}
                onChange={(e) => setMeta({ ...meta, join_field: e.target.value })}
                placeholder="Column name that contains PCode"
              />
            </label>
          )}
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={next}
          disabled={!canContinue || uploading}
          className="px-4 py-2 rounded text-white"
          style={{ background: !canContinue || uploading ? "var(--gsc-light-gray)" : "var(--gsc-blue)" }}
        >
          Continue →
        </button>
      </div>
    </div>
  );
}

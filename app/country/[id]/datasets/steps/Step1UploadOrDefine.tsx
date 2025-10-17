"use client";

import { useState, useEffect } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { Upload, FileText, Loader2 } from "lucide-react";

type Parsed = { headers: string[]; rows: Record<string, string>[] } | null;
type WizardMeta = any;

type Props = {
  countryIso: string;
  file: File | null;
  setFile: (f: File | null) => void;
  parseCsv: (f: File) => Promise<{ headers: string[]; rows: Record<string, string>[] }>;
  parsed: Parsed;
  setParsed: (p: Parsed) => void;
  meta: WizardMeta;
  setMeta: (m: WizardMeta) => void;
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
  const [message, setMessage] = useState<string | null>(null);
  const [savingMeta, setSavingMeta] = useState(false);

  // Ensure country is always set in meta
  useEffect(() => {
    if (meta.country_iso !== countryIso) {
      setMeta({ ...meta, country_iso: countryIso });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countryIso]);

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setMessage(null);
    setUploading(true);
    try {
      const parsedData = await parseCsv(f);
      setParsed(parsedData);
      // Best-effort defaults
      if (!meta.title) {
        setMeta({
          ...meta,
          title: f.name.replace(/\.(csv|xlsx)$/i, ""),
          dataset_type: "gradient",
        });
      } else if (!meta.dataset_type) {
        setMeta({ ...meta, dataset_type: "gradient" });
      }
      setMessage(`Parsed ${parsedData?.rows?.length ?? 0} rows, ${parsedData?.headers?.length ?? 0} columns.`);
    } catch (err: any) {
      console.error(err);
      setMessage("Failed to parse file.");
    } finally {
      setUploading(false);
    }
  }

  function clearFile() {
    setFile(null);
    setParsed(null);
    setMessage(null);
  }

  // Insert or update metadata so Step 4 won’t complain about missing dataset id
  async function ensureMetadataId(): Promise<string> {
    if (meta.id) return meta.id;

    setSavingMeta(true);
    try {
      const payload = {
        country_iso: countryIso,
        title: (meta.title || "").trim(),
        dataset_type: meta.dataset_type || (file ? "gradient" : "adm0"),
        data_format: meta.data_format || "numeric",
        admin_level: meta.admin_level || "ADM0",
        join_field: meta.join_field || "admin_pcode",
        year: meta.year ? Number(meta.year) : null,
        unit: meta.unit || null,
        source_name: meta.source_name || null,
        source_url: meta.source_url || null,
        source: meta.source || null,
      };

      const { data, error } = await supabase
        .from("dataset_metadata")
        .insert(payload)
        .select("id")
        .single();

      if (error) throw error;
      setMeta({ ...meta, id: data.id });
      return data.id;
    } finally {
      setSavingMeta(false);
    }
  }

  async function handleContinue() {
    // Choose dataset type if not chosen
    const dsType = meta.dataset_type || (file ? "gradient" : "adm0");
    // ADM0 requires either a file (rare) or a manual value
    if (dsType === "adm0" && !file) {
      const v = Number(meta.adm0_value);
      if (!Number.isFinite(v)) {
        setMessage("Please enter a numeric ADM0 value.");
        return;
      }
    }

    try {
      await ensureMetadataId();
      // If ADM0 without file, we’ll skip mapping in the parent (AddDatasetModal.next handles this)
      next();
    } catch (e: any) {
      console.error(e);
      setMessage(e.message || "Failed to prepare dataset.");
    }
  }

  const adminOptions = ["ADM0", "ADM1", "ADM2", "ADM3", "ADM4", "ADM5"];
  const dataFormats = ["numeric", "percentage", "text"];
  const datasetTypes = ["gradient", "categorical", "adm0"];

  return (
    <div className="flex flex-col gap-4 text-sm text-[var(--gsc-gray)]">
      <div className="rounded-xl border p-4 bg-[var(--gsc-beige)]">
        <h2 className="text-base font-semibold text-[var(--gsc-blue)] mb-2">
          Step 1 – Upload or Define Dataset
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="text-sm">
            Title
            <input
              className="border rounded p-2 w-full"
              value={meta.title || ""}
              onChange={(e) => setMeta({ ...meta, title: e.target.value })}
            />
          </label>

          <label className="text-sm">
            Country
            <input className="border rounded p-2 w-full" value={countryIso} readOnly />
          </label>

          <label className="text-sm">
            Admin Level
            <select
              className="border rounded p-2 w-full"
              value={meta.admin_level || "ADM0"}
              onChange={(e) => setMeta({ ...meta, admin_level: e.target.value })}
            >
              {adminOptions.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm">
            Data Format
            <select
              className="border rounded p-2 w-full"
              value={meta.data_format || "numeric"}
              onChange={(e) => setMeta({ ...meta, data_format: e.target.value })}
            >
              {dataFormats.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </label>

          {/* Dropzone / file picker */}
          <div className="md:col-span-2">
            <div className="flex items-center justify-center border-2 border-dashed border-[var(--gsc-light-gray)] rounded-lg p-6 bg-white">
              {!file ? (
                <label className="flex flex-col items-center cursor-pointer">
                  <Upload className="h-8 w-8 text-[var(--gsc-blue)] mb-2" />
                  <span className="text-[var(--gsc-blue)]">Click to upload CSV/XLSX</span>
                  <input type="file" accept=".csv,.xlsx" className="hidden" onChange={handleFileSelect} />
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
                    <button onClick={clearFile} className="text-[var(--gsc-red)] text-xs underline">
                      Remove file
                    </button>
                  )}
                </div>
              )}
            </div>
            {parsed && (
              <div className="text-xs text-gray-600 mt-2">
                Parsed {parsed?.rows?.length ?? 0} rows, {parsed?.headers?.length ?? 0} columns.
              </div>
            )}
          </div>

          <label className="text-sm">
            Year
            <input
              className="border rounded p-2 w-full"
              value={meta.year || ""}
              onChange={(e) => setMeta({ ...meta, year: e.target.value })}
            />
          </label>

          <label className="text-sm">
            Unit
            <input
              className="border rounded p-2 w-full"
              value={meta.unit || ""}
              onChange={(e) => setMeta({ ...meta, unit: e.target.value })}
            />
          </label>

          <label className="text-sm">
            Source Name
            <input
              className="border rounded p-2 w-full"
              value={meta.source_name || ""}
              onChange={(e) => setMeta({ ...meta, source_name: e.target.value })}
            />
          </label>

          <label className="text-sm">
            Source URL
            <input
              className="border rounded p-2 w-full"
              value={meta.source_url || ""}
              onChange={(e) => setMeta({ ...meta, source_url: e.target.value })}
            />
          </label>

          <label className="text-sm">
            Dataset Type
            <select
              className="border rounded p-2 w-full"
              value={meta.dataset_type || (file ? "gradient" : "adm0")}
              onChange={(e) => setMeta({ ...meta, dataset_type: e.target.value })}
            >
              {datasetTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm">
            Join Field (from admin level)
            <input
              className="border rounded p-2 w-full"
              value={meta.join_field || "admin_pcode"}
              onChange={(e) => setMeta({ ...meta, join_field: e.target.value })}
            />
          </label>

          {/* ADM0 value input (no file) */}
          {(!file && (meta.dataset_type || "adm0") === "adm0" && (meta.admin_level || "ADM0") === "ADM0") && (
            <label className="text-sm md:col-span-2">
              ADM0 Value
              <input
                className="border rounded p-2 w-full"
                placeholder="e.g., 5.1"
                value={meta.adm0_value ?? ""}
                onChange={(e) => setMeta({ ...meta, adm0_value: e.target.value })}
              />
            </label>
          )}
        </div>

        {message && (
          <div
            className="mt-3 text-sm"
            style={{
              color: message.toLowerCase().includes("fail") ? "var(--gsc-red)" : "var(--gsc-green)",
            }}
          >
            {message}
          </div>
        )}
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleContinue}
          disabled={uploading || savingMeta}
          className="px-4 py-2 rounded text-white"
          style={{ background: uploading || savingMeta ? "var(--gsc-light-gray)" : "var(--gsc-blue)" }}
        >
          {savingMeta ? "Preparing…" : "Continue →"}
        </button>
      </div>
    </div>
  );
}

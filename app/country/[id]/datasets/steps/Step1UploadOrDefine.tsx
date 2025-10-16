"use client";

import { useState, useEffect } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { Upload, FileText, Loader2 } from "lucide-react";

type WizardMeta = any;
type Parsed = { headers: string[]; rows: Record<string, string>[] } | null;

type Step1Props = {
  countryIso: string;
  file: File | null;
  setFile: (f: File | null) => void;
  parseCsv: (f: File) => Promise<any>;
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
}: Step1Props) {
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [adm0Value, setAdm0Value] = useState("");
  const [dataFormat, setDataFormat] = useState<"numeric" | "percentage" | "text">(
    meta?.data_format || "numeric"
  );
  const [unit, setUnit] = useState(meta?.unit || "");
  const [year, setYear] = useState(meta?.year || "");

  // --- File upload handler
  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setMessage(null);
    setUploading(true);
    try {
      const parsedData = await parseCsv(f);
      setParsed(parsedData);
      setMessage(`Parsed ${parsedData?.rows?.length || 0} rows successfully.`);
      setMeta({
        ...meta,
        dataset_type: "gradient",
        data_format: dataFormat,
        admin_level: meta?.admin_level || "ADM3",
      });
    } catch (err: any) {
      console.error(err);
      setMessage("Failed to parse file.");
    } finally {
      setUploading(false);
    }
  }

  // --- Reset parsed data when file removed
  useEffect(() => {
    if (!file) setParsed(null);
  }, [file]);

  // --- ADM0 manual dataset path
  const isAdm0 = !file && (meta?.admin_level === "ADM0" || !meta?.admin_level);

  // --- Can proceed if either file parsed or ADM0 value entered
  const canContinue =
    (!!parsed && parsed.rows.length > 0) ||
    (isAdm0 && adm0Value.trim() !== "");

  return (
    <div className="flex flex-col gap-4 text-sm text-[var(--gsc-gray)]">
      <div className="rounded-xl border p-4 bg-[var(--gsc-beige)]">
        <h2 className="text-base font-semibold text-[var(--gsc-blue)] mb-2">
          Step 1 – Upload or Define Dataset
        </h2>
        <p className="text-sm mb-3">
          Upload a CSV/XLSX file containing dataset values for{" "}
          <strong>{countryIso}</strong>, or manually define an{" "}
          <strong>ADM0 national metric</strong> below.
        </p>

        {/* File Upload */}
        <div className="flex items-center justify-center border-2 border-dashed border-[var(--gsc-light-gray)] rounded-lg p-6 bg-white mb-4">
          {!file ? (
            <label className="flex flex-col items-center cursor-pointer">
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
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Parsing…
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

        {/* ADM0 Value Input */}
        {isAdm0 && (
          <div className="grid md:grid-cols-2 gap-3 bg-white p-3 rounded-lg border border-[var(--gsc-light-gray)]">
            <label className="text-sm">
              ADM0 (National) Value
              <input
                type="text"
                className="border rounded p-2 w-full"
                value={adm0Value}
                onChange={(e) => setAdm0Value(e.target.value)}
                placeholder="e.g. 5.1"
              />
            </label>
            <label className="text-sm">
              Data Format
              <select
                className="border rounded p-2 w-full"
                value={dataFormat}
                onChange={(e) => setDataFormat(e.target.value as any)}
              >
                <option value="numeric">Numeric</option>
                <option value="percentage">Percentage</option>
                <option value="text">Text</option>
              </select>
            </label>
            <label className="text-sm">
              Unit
              <input
                type="text"
                className="border rounded p-2 w-full"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="e.g. people/HH"
              />
            </label>
            <label className="text-sm">
              Year
              <input
                type="text"
                className="border rounded p-2 w-full"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                placeholder="e.g. 2020"
              />
            </label>
          </div>
        )}

        {/* Message */}
        {message && (
          <div
            className="mt-3 text-sm"
            style={{
              color: message.includes("Failed")
                ? "var(--gsc-red)"
                : "var(--gsc-green)",
            }}
          >
            {message}
          </div>
        )}
      </div>

      <div className="flex justify-between pt-2">
        <div className="text-xs italic text-[var(--gsc-gray)]">
          {isAdm0
            ? "Define a single ADM0 metric, then click Next."
            : "After upload, click Next to preview your data."}
        </div>
        <button
          onClick={() => {
            setMeta({
              ...meta,
              dataset_type: file ? "gradient" : "adm0",
              data_format: dataFormat,
              unit,
              year,
              admin_level: isAdm0 ? "ADM0" : meta?.admin_level || "ADM3",
              adm0_value: isAdm0 ? adm0Value : null,
            });
            next();
          }}
          disabled={!canContinue || uploading}
          className="px-4 py-2 rounded text-white"
          style={{
            background:
              !canContinue || uploading
                ? "var(--gsc-light-gray)"
                : "var(--gsc-blue)",
          }}
        >
          Next
        </button>
      </div>
    </div>
  );
}

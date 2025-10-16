"use client";

import { useState, useEffect } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import Papa from "papaparse";
import { Upload, FileText, Loader2 } from "lucide-react";

// Temporary stub types (legacy WizardMeta / Parsed)
type WizardMeta = any;
type Parsed = any;

type Step1Props = {
  countryIso: string;
  file: File | null;
  setFile: (f: File | null) => void;
  parseCsv: (f: File) => Promise<any>;
  parsed: Parsed | null;
  setParsed: (p: Parsed | null) => void;
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
    } catch (err: any) {
      console.error(err);
      setMessage("Failed to parse file.");
    } finally {
      setUploading(false);
    }
  }

  useEffect(() => {
    if (!file) setParsed(null);
  }, [file]);

  return (
    <div className="flex flex-col gap-4 text-sm text-[var(--gsc-gray)]">
      <div className="rounded-xl border p-4 bg-[var(--gsc-beige)]">
        <h2 className="text-base font-semibold text-[var(--gsc-blue)] mb-2">
          Step 1 – Upload or Define Dataset
        </h2>
        <p className="text-sm mb-3">
          Upload a CSV or XLSX file containing dataset values for{" "}
          <strong>{countryIso}</strong>. Alternatively, for ADM0-level data,
          you can manually define a single value in the next step.
        </p>

        <div className="flex items-center justify-center border-2 border-dashed border-[var(--gsc-light-gray)] rounded-lg p-6 bg-white">
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
                  onClick={() => setFile(null)}
                  className="text-[var(--gsc-red)] text-xs underline"
                >
                  Remove file
                </button>
              )}
            </div>
          )}
        </div>

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

      <div className="flex justify-end">
        <button
          onClick={next}
          disabled={uploading || (!parsed && !file)}
          className="px-4 py-2 rounded text-white"
          style={{
            background:
              uploading || (!parsed && !file)
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

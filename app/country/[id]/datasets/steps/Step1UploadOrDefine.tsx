"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { Upload, FileText, Loader2 } from "lucide-react";

type Parsed = { headers: string[]; rows: Record<string, string>[] };
type WizardMeta = any;

type Props = {
  countryIso: string;
  file: File | null;
  setFile: (f: File | null) => void;
  parseCsv: (f: File) => Promise<Parsed>;
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
}: Props) {
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [adminDefs, setAdminDefs] = useState<
    { level: string; join_key: string }[]
  >([]);

  useEffect(() => {
    (async () => {
      // Fetch join-field mapping from admin_units
      const { data, error } = await supabase
        .from("admin_units")
        .select("level, join_field")
        .limit(10);
      if (!error && data) {
        const mapped = data.map((d: any) => ({
          level: d.level,
          join_key: d.join_field || "pcode",
        }));
        setAdminDefs(mapped);
      }
    })();
  }, []);

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setMessage(null);
    setUploading(true);
    try {
      const parsedData = await parseCsv(f);
      setParsed(parsedData);
      setMessage(
        `Parsed ${parsedData?.rows?.length || 0} rows, ${
          parsedData?.headers?.length || 0
        } columns.`
      );
      setMeta({ ...meta, dataset_type: meta.dataset_type || "gradient" });
    } catch (err: any) {
      console.error(err);
      setMessage("Failed to parse file.");
    } finally {
      setUploading(false);
    }
  }

  function handleAdminChange(level: string) {
    const found = adminDefs.find((a) => a.level === level);
    setMeta({
      ...meta,
      admin_level: level,
      join_field: found?.join_key || "pcode",
    });
  }

  return (
    <div className="flex flex-col gap-4 text-sm text-[var(--gsc-gray)]">
      <div className="rounded-xl border p-4 bg-[var(--gsc-beige)]">
        <h2 className="text-base font-semibold text-[var(--gsc-blue)] mb-2">
          Step 1 – Upload or Define Dataset
        </h2>

        <div className="grid md:grid-cols-2 gap-3 mb-4">
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
            <input
              disabled
              value={countryIso}
              className="border rounded p-2 w-full bg-gray-100 text-gray-700"
            />
          </label>

          <label className="text-sm">
            Admin Level
            <select
              className="border rounded p-2 w-full"
              value={meta.admin_level || ""}
              onChange={(e) => handleAdminChange(e.target.value)}
            >
              <option value="">Select level…</option>
              {["ADM0", "ADM1", "ADM2", "ADM3", "ADM4", "ADM5"].map((a) => (
                <option key={a}>{a}</option>
              ))}
            </select>
          </label>

          <label className="text-sm">
            Data Format
            <select
              className="border rounded p-2 w-full"
              value={meta.data_format || "numeric"}
              onChange={(e) =>
                setMeta({ ...meta, data_format: e.target.value })
              }
            >
              {["numeric", "percentage", "text"].map((f) => (
                <option key={f}>{f}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="flex flex-col items-center justify-center border-2 border-dashed border-[var(--gsc-light-gray)] rounded-lg p-6 bg-white mb-4">
          {!file ? (
            <label className="flex flex-col items-center cursor-pointer">
              <Upload className="h-8 w-8 text-[var(--gsc-blue)] mb-2" />
              <span className="text-[var(--gsc-blue)]">Click to upload file</span>
              <input
                type="file"
                accept=".csv"
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
            className="mt-2 text-xs"
            style={{
              color: message.includes("Failed")
                ? "var(--gsc-red)"
                : "var(--gsc-green)",
            }}
          >
            {message}
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-3 mt-4">
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
        </div>

        <div className="grid md:grid-cols-2 gap-3 mt-4">
          <label className="text-sm">
            Dataset Type
            <select
              className="border rounded p-2 w-full"
              value={meta.dataset_type || "gradient"}
              onChange={(e) =>
                setMeta({ ...meta, dataset_type: e.target.value })
              }
            >
              <option value="gradient">gradient</option>
              <option value="categorical">categorical</option>
              <option value="adm0">adm0</option>
            </select>
          </label>

          <label className="text-sm">
            Join Field (from admin level)
            <input
              className="border rounded p-2 w-full bg-gray-100 text-gray-600"
              value={meta.join_field || ""}
              readOnly
            />
          </label>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={next}
          disabled={uploading}
          className="px-4 py-2 rounded text-white"
          style={{
            background: uploading ? "var(--gsc-light-gray)" : "var(--gsc-blue)",
          }}
        >
          Continue →
        </button>
      </div>
    </div>
  );
}

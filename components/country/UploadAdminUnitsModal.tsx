"use client";

import { useState } from "react";
import Papa from "papaparse";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { Upload, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  countryIso: string;
  onUploaded: () => void;
}

export default function UploadAdminUnitsModal({
  open,
  onClose,
  countryIso,
  onUploaded,
}: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [year, setYear] = useState<number | null>(null);
  const [datasetDate, setDatasetDate] = useState("");
  const [sourceName, setSourceName] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [notes, setNotes] = useState("");

  const [progress, setProgress] = useState<number>(0);
  const [status, setStatus] = useState<"idle" | "uploading" | "done" | "error">(
    "idle"
  );
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) setFile(e.target.files[0]);
  };

  // ---- CSV Parsing ----
  const parseCSV = async (): Promise<any[]> => {
    if (!file) throw new Error("No file selected");

    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => resolve(results.data as any[]),
        error: (err) => reject(err),
      });
    });
  };

  // ---- Upload Handler ----
  const handleUpload = async () => {
    if (!file || !title || !datasetDate) {
      setError("Please fill all required fields and choose a file.");
      return;
    }

    try {
      setStatus("uploading");
      setProgress(0);
      setError(null);

      const rows = await parseCSV();
      if (!rows.length) throw new Error("CSV file is empty.");

      // --- Create version record ---
      const { data: version, error: versionError } = await supabase
        .from("admin_dataset_versions")
        .insert({
          country_iso: countryIso,
          title,
          year,
          dataset_date: datasetDate,
          source: JSON.stringify({
            name: sourceName,
            url: sourceUrl,
          }),
          notes,
          is_active: false,
        })
        .select("*")
        .single();

      if (versionError || !version)
        throw new Error("Failed to create dataset version");

      const datasetVersionId = version.id;

      // --- Transform wide to hierarchical ---
      const toAdminRows = (row: any) => {
        const records: any[] = [];
        const levels = [1, 2, 3, 4, 5];
        let parentPcode: string | null = null;

        for (const lvl of levels) {
          const name = row[`Adm${lvl} Name`] || row[`ADM${lvl} Name`];
          const pcode = row[`Adm${lvl} Pcode`] || row[`ADM${lvl} Pcode`];
          if (name && pcode) {
            records.push({
              country_iso: countryIso,
              name,
              pcode,
              level: `ADM${lvl}`,
              parent_pcode: parentPcode,
              dataset_version_id: datasetVersionId,
              metadata: {},
            });
            parentPcode = pcode;
          }
        }
        return records;
      };

      const flattened = rows.flatMap(toAdminRows);
      const total = flattened.length;
      const chunkSize = 5000;
      let uploaded = 0;

      for (let i = 0; i < total; i += chunkSize) {
        const chunk = flattened.slice(i, i + chunkSize);
        const { error: insertError } = await supabase
          .from("admin_units")
          .insert(chunk);

        if (insertError) throw insertError;
        uploaded += chunk.length;
        setProgress(Math.round((uploaded / total) * 100));
      }

      setStatus("done");
      onUploaded();
    } catch (err: any) {
      console.error("Upload failed:", err);
      setError(err.message || "Unknown error");
      setStatus("error");
    }
  };

  const resetAndClose = () => {
    setFile(null);
    setTitle("");
    setYear(null);
    setDatasetDate("");
    setSourceName("");
    setSourceUrl("");
    setNotes("");
    setStatus("idle");
    setProgress(0);
    setError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-lg p-5">
        <h2 className="text-lg font-semibold mb-3 text-gray-800">
          Upload Administrative Units
        </h2>

        <div className="space-y-3 text-sm">
          <div>
            <label className="block font-medium mb-1">
              File (CSV, wide format)
            </label>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="w-full border rounded px-2 py-1"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block mb-1 font-medium">Title *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full border rounded px-2 py-1"
              />
            </div>
            <div>
              <label className="block mb-1 font-medium">Year</label>
              <input
                type="number"
                value={year ?? ""}
                onChange={(e) => setYear(parseInt(e.target.value) || null)}
                className="w-full border rounded px-2 py-1"
              />
            </div>
          </div>

          <div>
            <label className="block mb-1 font-medium">Dataset Date *</label>
            <input
              type="date"
              value={datasetDate}
              onChange={(e) => setDatasetDate(e.target.value)}
              className="w-full border rounded px-2 py-1"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block mb-1 font-medium">Source Name</label>
              <input
                type="text"
                value={sourceName}
                onChange={(e) => setSourceName(e.target.value)}
                className="w-full border rounded px-2 py-1"
              />
            </div>
            <div>
              <label className="block mb-1 font-medium">Source URL</label>
              <input
                type="url"
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                className="w-full border rounded px-2 py-1"
              />
            </div>
          </div>

          <div>
            <label className="block mb-1 font-medium">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full border rounded px-2 py-1"
              rows={2}
            />
          </div>

          {status === "uploading" && (
            <div className="mt-4">
              <p className="text-sm text-gray-600 mb-1">
                Uploading... {progress}%
              </p>
              <div className="w-full bg-gray-200 h-2 rounded">
                <div
                  className="bg-[color:var(--gsc-red)] h-2 rounded"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {status === "done" && (
            <div className="mt-3 flex items-center text-green-700 gap-2">
              <CheckCircle2 className="w-4 h-4" /> Upload complete!
            </div>
          )}

          {status === "error" && (
            <div className="mt-3 flex items-center text-[color:var(--gsc-red)] gap-2">
              <AlertTriangle className="w-4 h-4" />
              <p className="text-sm">{error}</p>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 mt-5">
          <button
            onClick={resetAndClose}
            className="px-3 py-1 border rounded text-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={status === "uploading"}
            className="px-3 py-1 bg-[color:var(--gsc-red)] text-white rounded text-sm flex items-center gap-1 disabled:opacity-60"
          >
            {status === "uploading" ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Uploading
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" /> Upload
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

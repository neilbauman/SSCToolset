"use client";

import { useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import Papa from "papaparse";
import { X, Upload, Loader2, Download } from "lucide-react";

type UploadPopulationModalProps = {
  open: boolean;
  onClose: () => void;
  countryIso: string;
  onUploaded: () => Promise<void>;
};

export default function UploadPopulationModal({
  open,
  onClose,
  countryIso,
  onUploaded,
}: UploadPopulationModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState<string | null>(null);

  if (!open) return null;

  const handleDownloadTemplate = async () => {
    try {
      const url =
        "https://ergsggprgtlsrrsmwtkf.supabase.co/storage/v1/object/public/templates/population_template.csv";
      const res = await fetch(url);
      const blob = await res.blob();
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = "population_template.csv";
      link.click();
    } catch (e) {
      console.error("Template download failed:", e);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null;
    setFile(f);
    setMessage(null);
  };

  const handleUpload = async () => {
    if (!file) {
      setMessage("Please select a CSV file first.");
      return;
    }

    setLoading(true);
    setProgress(10);
    setMessage("Parsing CSV...");

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const rows = results.data as any[];
          if (!rows.length) {
            setMessage("No data found in CSV.");
            setLoading(false);
            return;
          }

          // Step 1: Create new dataset version
          setMessage("Creating new dataset version...");
          const { data: version, error: vErr } = await supabase
            .from("population_dataset_versions")
            .insert({
              country_iso: countryIso,
              title: file.name.replace(".csv", ""),
              is_active: false,
            })
            .select()
            .single();

          if (vErr) throw vErr;
          setProgress(40);

          // Step 2: Prepare insert records
          const formatted = rows.map((r) => ({
            country_iso: countryIso,
            pcode: r.pcode || r.PCode || r.PCODE || null,
            name: r.name || r.Name || null,
            population: Number(r.population || r.Population || 0),
            year: Number(r.year || 0),
            source: JSON.stringify({ name: r.source || "upload" }),
            dataset_version_id: version.id,
          }));

          if (!formatted.length) throw new Error("No valid rows to insert.");

          // Step 3: Batch insert (Supabase up to 10k per batch)
          setMessage("Uploading data...");
          const chunkSize = 5000;
          for (let i = 0; i < formatted.length; i += chunkSize) {
            const chunk = formatted.slice(i, i + chunkSize);
            const { error } = await supabase.from("population_data").insert(chunk);
            if (error) throw error;
            setProgress(40 + Math.round((i / formatted.length) * 50));
          }

          // Step 4: Done
          setProgress(100);
          setMessage("Upload complete!");
          await onUploaded();
          setTimeout(() => {
            setLoading(false);
            setFile(null);
            setProgress(0);
            onClose();
          }, 1000);
        } catch (err: any) {
          console.error("Upload error:", err);
          setMessage(`Error: ${err.message || "Failed to upload"}`);
          setLoading(false);
        }
      },
      error: (err) => {
        console.error("CSV parse error:", err);
        setMessage("Failed to parse CSV.");
        setLoading(false);
      },
    });
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-lg p-5 relative">
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Upload className="w-5 h-5 text-[color:var(--gsc-red)]" /> Upload Population Dataset
        </h3>

        <p className="text-sm text-gray-600 mb-3">
          Upload a CSV file containing columns: <strong>pcode, name, population, year</strong>.
        </p>

        <div className="flex items-center justify-between mb-4">
          <input
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            disabled={loading}
            className="border rounded px-2 py-1 text-sm w-full"
          />
          <button
            onClick={handleDownloadTemplate}
            className="flex items-center ml-3 text-sm border px-3 py-1 rounded hover:bg-blue-50 text-blue-700"
            disabled={loading}
          >
            <Download className="w-4 h-4 mr-1" /> Template
          </button>
        </div>

        {loading && (
          <div className="w-full bg-gray-200 rounded h-2 mb-2">
            <div
              className="h-2 bg-[color:var(--gsc-red)] rounded transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        {message && (
          <p
            className={`text-sm mb-2 ${
              message.startsWith("Error") ? "text-red-600" : "text-gray-700"
            }`}
          >
            {message}
          </p>
        )}

        <div className="flex justify-end gap-2 mt-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-3 py-1 text-sm border rounded"
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={!file || loading}
            className="flex items-center gap-2 px-3 py-1 text-sm text-white bg-[color:var(--gsc-red)] rounded hover:opacity-90 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {loading ? "Uploading..." : "Upload"}
          </button>
        </div>
      </div>
    </div>
  );
}

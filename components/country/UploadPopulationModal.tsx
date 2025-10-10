"use client";

import { useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { Upload, Loader2, Download } from "lucide-react";

interface UploadPopulationModalProps {
  open: boolean;
  onClose: () => void;
  countryIso: string;
  onUploaded: () => Promise<void>;
}

export default function UploadPopulationModal({
  open,
  onClose,
  countryIso,
  onUploaded,
}: UploadPopulationModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const handleDownloadTemplate = async () => {
    try {
      const url =
        "https://ergsggprgtlsrrsmwtkf.supabase.co/storage/v1/object/public/templates/Population_Template.csv";
      const res = await fetch(url);
      if (!res.ok) throw new Error("Template not found");
      const blob = await res.blob();
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = "Population_Template.csv";
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error(err);
      alert("Template not available.");
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError("Please select a CSV file first.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const text = await file.text();
      const rows = text.split(/\r?\n/).map((r) => r.trim()).filter(Boolean);
      const header = rows[0].split(",").map((h) => h.trim().toLowerCase());

      // Expected columns
      const required = ["pcode", "population"];
      for (const col of required) {
        if (!header.includes(col)) {
          throw new Error(`Missing required column: ${col}`);
        }
      }

      // Insert dataset version
      const datasetVersion = {
        country_iso: countryIso,
        title: file.name.replace(/\\.csv$/i, ""),
        is_active: false,
        created_at: new Date().toISOString(),
      };

      const { data: version, error: insertError } = await supabase
        .from("population_dataset_versions")
        .insert(datasetVersion)
        .select()
        .single();

      if (insertError) throw insertError;

      // Prepare data
      const dataRows = rows.slice(1).map((line) => {
        const values = line.split(",").map((v) => v.trim());
        const obj: any = {};
        header.forEach((key, i) => (obj[key] = values[i] || null));
        return {
          id: crypto.randomUUID(),
          dataset_version_id: version.id,
          country_iso: countryIso,
          pcode: obj.pcode,
          name: obj.name || null,
          population: parseInt(obj.population, 10) || 0,
          created_at: new Date().toISOString(),
        };
      });

      // Insert in chunks
      const chunkSize = 500;
      for (let i = 0; i < dataRows.length; i += chunkSize) {
        const chunk = dataRows.slice(i, i + chunkSize);
        const { error: insertChunkError } = await supabase
          .from("population_data")
          .insert(chunk);
        if (insertChunkError) throw insertChunkError;
      }

      await onUploaded();
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Upload failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-lg">
        <h3 className="text-lg font-semibold mb-3 flex items-center justify-between">
          Upload Population Dataset
          <button
            onClick={handleDownloadTemplate}
            className="text-sm border px-2 py-1 rounded hover:bg-gray-50"
          >
            <Download className="w-4 h-4 inline-block mr-1" /> Template
          </button>
        </h3>

        <div className="space-y-3">
          <input
            type="file"
            accept=".csv"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="border rounded w-full px-2 py-1 text-sm"
          />

          {error && <p className="text-sm text-red-600">{error}</p>}

          {loading && (
            <div className="flex items-center text-sm text-gray-600">
              <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Uploading...
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 mt-5">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-3 py-1 text-sm border rounded"
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={loading}
            className="flex items-center bg-[color:var(--gsc-red)] text-white px-3 py-1 rounded text-sm hover:opacity-90"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Upload className="w-4 h-4 mr-2" />
            )}
            Upload
          </button>
        </div>
      </div>
    </div>
  );
}

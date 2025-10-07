"use client";

import { useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { X, UploadCloud, Loader2 } from "lucide-react";

interface UploadAdminUnitsModalProps {
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
}: UploadAdminUnitsModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [year, setYear] = useState<number | null>(null);
  const [datasetDate, setDatasetDate] = useState("");
  const [sourceName, setSourceName] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const handleUpload = async () => {
    if (!file) {
      setError("Please select a file to upload.");
      return;
    }

    setUploading(true);
    setError(null);

    try {
      // 1️⃣ Upload file to Supabase Storage
      const path = `${countryIso}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("admin_uploads")
        .upload(path, file);

      if (uploadError) throw uploadError;

      // 2️⃣ Create dataset version entry
      const source =
        sourceName || sourceUrl
          ? { name: sourceName || null, url: sourceUrl || null }
          : null;

      const { error: insertError } = await supabase
        .from("admin_dataset_versions")
        .insert([
          {
            country_iso: countryIso,
            title: title || file.name,
            year,
            dataset_date: datasetDate || null,
            source,
            notes,
            is_active: false,
            created_at: new Date().toISOString(),
          },
        ]);

      if (insertError) throw insertError;

      // ✅ Trigger refresh
      onUploaded();
      onClose();
    } catch (err: any) {
      console.error("Upload error:", err);
      setError(err.message || "An error occurred during upload.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-lg p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-lg font-semibold mb-4 text-[color:var(--gsc-red)]">
          Upload Administrative Units
        </h2>

        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium text-gray-700">
              File (CSV or GeoJSON)
            </label>
            <input
              type="file"
              accept=".csv,.geojson"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="w-full border rounded px-2 py-1 text-sm"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Administrative Boundaries 2025"
              className="w-full border rounded px-2 py-1 text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-gray-700">Year</label>
              <input
                type="number"
                value={year ?? ""}
                onChange={(e) =>
                  setYear(e.target.value ? Number(e.target.value) : null)
                }
                className="w-full border rounded px-2 py-1 text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">
                Dataset Date
              </label>
              <input
                type="date"
                value={datasetDate}
                onChange={(e) => setDatasetDate(e.target.value)}
                className="w-full border rounded px-2 py-1 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">
              Source Name
            </label>
            <input
              type="text"
              value={sourceName}
              onChange={(e) => setSourceName(e.target.value)}
              placeholder="e.g., Philippine Statistics Authority"
              className="w-full border rounded px-2 py-1 text-sm"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">
              Source URL
            </label>
            <input
              type="url"
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              placeholder="https://psa.gov.ph"
              className="w-full border rounded px-2 py-1 text-sm"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full border rounded px-2 py-1 text-sm"
              placeholder="Additional notes about this dataset..."
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-sm border rounded text-gray-700 hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={uploading}
            className="px-3 py-1.5 text-sm bg-[color:var(--gsc-red)] text-white rounded hover:opacity-90 disabled:opacity-50 flex items-center gap-1"
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Uploading...
              </>
            ) : (
              <>
                <UploadCloud className="w-4 h-4" /> Upload
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

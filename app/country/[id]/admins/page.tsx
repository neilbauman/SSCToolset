"use client";

import { useState } from "react";
import { X, Upload } from "lucide-react";
import Papa from "papaparse";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";

export interface UploadAdminUnitsModalProps {
  open: boolean;
  onClose: () => void;
  countryIso: string;
  onUploaded: () => void; // ✅ callback after successful upload
}

export default function UploadAdminUnitsModal({
  open,
  onClose,
  countryIso,
  onUploaded,
}: UploadAdminUnitsModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError("Please select a CSV file.");
      return;
    }
    setLoading(true);
    setError(null);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const rows = results.data as any[];
          const records = rows.map((r) => ({
            country_iso: countryIso,
            name: r.name,
            pcode: r.pcode,
            level: r.level,
            parent_pcode: r.parent_pcode || null,
            population: r.population ? parseInt(r.population, 10) : null,
          }));

          const { error } = await supabase.from("admin_units").upsert(records);
          if (error) throw error;

          setLoading(false);
          onUploaded(); // ✅ refresh table in parent
          onClose(); // close modal
        } catch (err: any) {
          console.error("Upload error:", err);
          setError("Failed to upload admin units. Please check your CSV format.");
          setLoading(false);
        }
      },
      error: (err) => {
        console.error("Parse error:", err);
        setError("Error parsing CSV file.");
        setLoading(false);
      },
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-lg p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Upload className="w-5 h-5 text-[color:var(--gsc-green)]" />
            Upload Admin Units
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-gray-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* File input */}
        <input
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          className="mb-4 block w-full text-sm text-gray-600"
        />

        {error && <p className="text-sm text-red-600 mb-2">{error}</p>}

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300"
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={loading}
            className="px-4 py-2 rounded bg-[color:var(--gsc-green)] text-white hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "Uploading..." : "Upload"}
          </button>
        </div>
      </div>
    </div>
  );
}

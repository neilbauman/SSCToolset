"use client";

import { useState } from "react";
import { X } from "lucide-react";
import Papa from "papaparse";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";

interface UploadAdminUnitsModalProps {
  open: boolean;
  onClose: () => void;
  countryIso: string;
  onUploaded: () => void; // callback to refresh table
}

interface ParsedRow {
  name: string;
  pcode: string;
  level: string;
  parent_pcode?: string;
  population?: number;
}

export default function UploadAdminUnitsModal({
  open,
  onClose,
  countryIso,
  onUploaded,
}: UploadAdminUnitsModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ParsedRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    setPreview([]);
    if (e.target.files && e.target.files[0]) {
      const f = e.target.files[0];
      setFile(f);

      Papa.parse(f, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.errors.length > 0) {
            setError("Failed to parse CSV. Please check formatting.");
            console.error(results.errors);
            return;
          }
          setPreview(results.data.slice(0, 5) as ParsedRow[]);
        },
      });
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError("Please select a file first.");
      return;
    }

    setLoading(true);
    setError(null);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        if (results.errors.length > 0) {
          setError("Error parsing CSV.");
          console.error(results.errors);
          setLoading(false);
          return;
        }

        const rows = results.data as ParsedRow[];

        const { error: uploadError } = await supabase.from("admin_units").upsert(
          rows.map((row) => ({
            country_iso: countryIso,
            name: row.name,
            pcode: row.pcode,
            level: row.level,
            parent_pcode: row.parent_pcode || null,
            population: row.population ? Number(row.population) : null,
          }))
        );

        if (uploadError) {
          console.error(uploadError);
          setError("Upload failed. Please check your file structure.");
        } else {
          onUploaded();
          onClose();
        }
        setLoading(false);
      },
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Upload Admin Units</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Instructions */}
        <p className="text-sm text-gray-600 mb-3">
          Please upload a <code>.csv</code> file using the{" "}
          <strong>Admin Units Template</strong>. The file should include
          <code> name, pcode, level, parent_pcode, population </code> columns.
        </p>

        {/* File Input */}
        <input
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          className="mb-4"
        />

        {/* Preview */}
        {preview.length > 0 && (
          <div className="mb-4">
            <h3 className="font-medium text-sm mb-2">Preview (first 5 rows):</h3>
            <table className="w-full text-sm border">
              <thead>
                <tr className="bg-gray-100 text-left">
                  <th className="px-2 py-1 border">Name</th>
                  <th className="px-2 py-1 border">PCode</th>
                  <th className="px-2 py-1 border">Level</th>
                  <th className="px-2 py-1 border">Parent PCode</th>
                  <th className="px-2 py-1 border">Population</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((row, i) => (
                  <tr key={i}>
                    <td className="px-2 py-1 border">{row.name}</td>
                    <td className="px-2 py-1 border">{row.pcode}</td>
                    <td className="px-2 py-1 border">{row.level}</td>
                    <td className="px-2 py-1 border">{row.parent_pcode || "-"}</td>
                    <td className="px-2 py-1 border">{row.population || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Error */}
        {error && <p className="text-red-600 text-sm mb-2">{error}</p>}

        {/* Footer */}
        <div className="flex justify-end gap-3 mt-4">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-sm rounded bg-gray-100 text-gray-800 hover:bg-gray-200"
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={loading}
            className="px-3 py-1.5 text-sm rounded bg-[color:var(--gsc-green)] text-white hover:opacity-90"
          >
            {loading ? "Uploading..." : "Upload"}
          </button>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import {
  Upload,
  X,
  Loader2,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

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
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const handleTemplateDownload = () => {
    const url =
      "https://ergsggprgtlsrrsmwtkf.supabase.co/storage/v1/object/public/templates/Population_Template.csv";
    const link = document.createElement("a");
    link.href = url;
    link.download = "Population_Template.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      setFile(e.target.files[0]);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError("Please select a CSV file to upload.");
      return;
    }

    try {
      setUploading(true);
      setError(null);
      setSuccess(false);

      // 🔹 Create new dataset version record
      const { data: version, error: vErr } = await supabase
        .from("population_dataset_versions")
        .insert({
          title: file.name.replace(".csv", ""),
          country_iso: countryIso,
          is_active: false,
        })
        .select()
        .single();

      if (vErr) throw vErr;
      const versionId = version.id;

      // 🔹 Upload CSV to storage bucket
      const { error: uploadErr } = await supabase.storage
        .from("uploads")
        .upload(`population/${countryIso}/${file.name}`, file, {
          upsert: true,
        });

      if (uploadErr) throw uploadErr;

      // 🔹 Invoke Supabase Edge Function (server-side parser)
      const { error: fnError } = await supabase.functions.invoke(
        "process-population-csv",
        {
          body: {
            countryIso,
            versionId,
            fileName: file.name,
          },
        }
      );

      if (fnError) throw fnError;

      setSuccess(true);
      setFile(null);
      await onUploaded();
    } catch (err: any) {
      console.error("❌ Upload error:", err);
      setError(err.message || "Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
          <Upload className="w-5 h-5 text-[color:var(--gsc-red)]" />
          Upload Population Dataset
        </h2>

        <p className="text-sm text-gray-600 mb-4">
          Upload a CSV file following the template format below. The data will
          be processed and linked to the selected country’s administrative
          boundaries.
        </p>

        {/* Template download */}
        <div className="flex items-center justify-between border rounded p-3 mb-4 bg-gray-50">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-green-600" />
            <span className="text-sm">Population_Template.csv</span>
          </div>
          <button
            onClick={handleTemplateDownload}
            className="flex items-center text-blue-700 text-sm hover:underline"
          >
            <Download className="w-4 h-4 mr-1" />
            Download
          </button>
        </div>

        {/* File picker */}
        <div className="border-dashed border-2 border-gray-300 rounded-lg p-6 text-center mb-4">
          <input
            type="file"
            accept=".csv"
            className="hidden"
            id="population-upload"
            onChange={handleFileSelect}
          />
          <label
            htmlFor="population-upload"
            className="cursor-pointer text-sm text-blue-700 hover:underline"
          >
            {file ? file.name : "Click to select a CSV file"}
          </label>
        </div>

        {/* Status */}
        {error && (
          <div className="flex items-center gap-2 text-red-600 text-sm mb-2">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}
        {success && (
          <div className="flex items-center gap-2 text-green-700 text-sm mb-2">
            <CheckCircle2 className="w-4 h-4" />
            Upload completed successfully.
          </div>
        )}

        {/* Buttons */}
        <div className="flex justify-end gap-3 mt-4">
          <button
            onClick={onClose}
            className="text-sm border px-3 py-1 rounded hover:bg-gray-100"
            disabled={uploading}
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={uploading || !file}
            className={`flex items-center gap-1 text-sm text-white px-3 py-1 rounded ${
              uploading
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-[color:var(--gsc-red)] hover:opacity-90"
            }`}
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Uploading…
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Upload
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

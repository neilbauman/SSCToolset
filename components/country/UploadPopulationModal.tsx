"use client";

import { useState, useRef } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { Upload, XCircle, Loader2, CheckCircle2, Download } from "lucide-react";

interface UploadPopulationModalProps {
  open: boolean;
  onClose: () => void;
  countryIso: string;
  onUploaded: () => void;
}

export default function UploadPopulationModal({
  open,
  onClose,
  countryIso,
  onUploaded,
}: UploadPopulationModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("");
  const [error, setError] = useState<string | null>(null);
  const progressTimer = useRef<NodeJS.Timeout | null>(null);

  if (!open) return null;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null;
    setFile(f);
    setError(null);
  };

  const handleDownloadTemplate = () => {
    const headers = ["pcode", "name", "population", "year"];
    const csv = headers.join(",") + "\n";
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "Population_Template.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const startProgress = () => {
    setProgress(5);
    if (progressTimer.current) clearInterval(progressTimer.current);
    progressTimer.current = setInterval(() => {
      setProgress((p) => Math.min(p + 10, 90));
    }, 400);
  };

  const finishProgress = () => {
    if (progressTimer.current) clearInterval(progressTimer.current);
    setProgress(100);
  };

  const handleUpload = async () => {
    if (!file) {
      setError("Please select a CSV file first.");
      return;
    }

    setUploading(true);
    setStatus("Uploading...");
    setError(null);
    startProgress();

    try {
      // Step 1: Upload to Supabase Storage
      const filePath = `${countryIso}/population/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("uploads")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Step 2: Parse file name to generate version title
      const title = file.name.replace(/\.[^/.]+$/, "");

      // Step 3: Create dataset version
      const { data: version, error: versionError } = await supabase
        .from("population_dataset_versions")
        .insert([
          {
            country_iso: countryIso,
            title,
            year: new Date().getFullYear(),
            is_active: false,
          },
        ])
        .select()
        .single();

      if (versionError || !version) throw versionError;

      // Step 4: Trigger population ingestion edge function
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/ingest_population`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            country_iso: countryIso,
            file_path: filePath,
            dataset_version_id: version.id,
          }),
        }
      );

      if (!res.ok) throw new Error("Population ingestion failed.");

      finishProgress();
      setStatus("Upload complete.");
      setTimeout(() => {
        setUploading(false);
        setProgress(0);
        onUploaded();
        onClose();
      }, 1000);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Upload failed.");
      setUploading(false);
      finishProgress();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-lg overflow-hidden">
        {/* 🔴 Header */}
        <div className="bg-[color:var(--gsc-red)] text-white px-4 py-2 flex justify-between items-center">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Upload className="w-5 h-5" /> Upload Population Dataset
          </h3>
          <button
            onClick={onClose}
            className="hover:opacity-80 text-white text-sm"
          >
            <XCircle className="w-5 h-5" />
          </button>
        </div>

        {/* 📤 Content */}
        <div className="p-5 space-y-4">
          <p className="text-sm text-gray-700">
            Upload a CSV file containing population data. Ensure columns include:
            <strong> PCode, Name, Population, Year</strong>.
          </p>

          <div className="flex flex-col gap-3">
            <input
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              disabled={uploading}
              className="block w-full text-sm border rounded px-2 py-1"
            />

            {file && (
              <p className="text-sm text-gray-600">
                Selected: <strong>{file.name}</strong>
              </p>
            )}

            {error && <p className="text-sm text-red-600">{error}</p>}

            {/* Progress Bar */}
            {uploading && (
              <div className="w-full mt-2">
                <div className="h-2 bg-gray-200 rounded">
                  <div
                    className="h-2 bg-[color:var(--gsc-red)] rounded transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-xs text-gray-600 mt-1">{status}</p>
              </div>
            )}
          </div>

          {/* Buttons */}
          <div className="flex justify-between mt-4">
            <button
              onClick={handleDownloadTemplate}
              disabled={uploading}
              className="flex items-center text-sm border px-3 py-1 rounded hover:bg-blue-50 text-blue-700"
            >
              <Download className="w-4 h-4 mr-1" /> Template
            </button>
            <button
              onClick={handleUpload}
              disabled={uploading || !file}
              className="flex items-center text-sm text-white bg-[color:var(--gsc-red)] px-3 py-1 rounded hover:opacity-90"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Uploading
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" /> Upload
                </>
              )}
            </button>
          </div>

          {status === "Upload complete." && (
            <div className="flex items-center text-green-700 text-sm mt-3">
              <CheckCircle2 className="w-4 h-4 mr-1" /> Upload successful
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import Papa from "papaparse";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { Upload, Loader2, Download, CheckCircle2 } from "lucide-react";

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
  const [title, setTitle] = useState("");
  const [year, setYear] = useState<number | null>(null);
  const [sourceName, setSourceName] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) setFile(e.target.files[0]);
  };

  const handleTemplateDownload = async () => {
    const fileUrl =
      "https://ergsggprgtlsrrsmwtkf.supabase.co/storage/v1/object/public/templates/Population_Template.csv";
    try {
      const response = await fetch(fileUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "Population_Template.csv";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download failed:", err);
      alert("Failed to download template file.");
    }
  };

  const handleUpload = async () => {
    setError(null);
    setSuccess(false);
    if (!file) return setError("Please select a CSV file first.");
    if (!year) return setError("Please provide the dataset year.");
    if (!title.trim()) return setError("Please provide a dataset title.");

    setUploading(true);
    setProgress(0);

    try {
      // Step 1: Create dataset version
      const { data: version, error: versionError } = await supabase
        .from("population_dataset_versions")
        .insert({
          country_iso: countryIso,
          title,
          year,
          source_name: sourceName || null,
          source_url: sourceUrl || null,
          notes: notes || null,
          is_active: false,
        })
        .select()
        .single();

      if (versionError) throw versionError;
      if (!version) throw new Error("Failed to create dataset version.");

      // Step 2: Parse CSV in browser
      const text = await file.text();
      const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
      const rows = parsed.data as any[];

      if (rows.length === 0) throw new Error("CSV file is empty or invalid.");

      // Step 3: Prepare and batch insert
      const batchSize = 5000;
      let totalInserted = 0;

      for (let i = 0; i < rows.length; i += batchSize) {
        const chunk = rows.slice(i, i + batchSize).map((r) => ({
          country_iso: countryIso,
          dataset_version_id: version.id,
          pcode: r["PCode"] || r["pcode"] || r["ADM_PCODE"] || null,
          name:
            r["Name"] ||
            r["name"] ||
            r["ADM_NAME"] ||
            r["AdminName"] ||
            "Unknown",
          population:
            parseInt(r["Population"] || r["population"] || r["Pop"], 10) || null,
        }));

        // Filter out invalid entries
        const validChunk = chunk.filter(
          (x) => x.pcode && x.name && x.population
        );

        const { error: insertError } = await supabase
          .from("population_data")
          .insert(validChunk);

        if (insertError) throw insertError;

        totalInserted += validChunk.length;
        setProgress(Math.round((totalInserted / rows.length) * 100));
      }

      // Step 4: Mark dataset version as active
      await supabase
        .from("population_dataset_versions")
        .update({ is_active: true })
        .eq("id", version.id);

      setSuccess(true);
      setProgress(100);
      await onUploaded();

      // Auto-close modal after 2 seconds
      setTimeout(() => onClose(), 2000);
    } catch (err: any) {
      console.error("Upload error:", err);
      setError(err.message || "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Upload className="w-5 h-5 text-[color:var(--gsc-red)]" />
          Upload Population Dataset
        </h2>

        <p className="text-sm text-gray-600 mb-4">
          Upload a CSV file following the template format below. The data will
          be processed and linked to the selected country’s administrative
          boundaries.
        </p>

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-800 rounded p-2 mb-3 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            Population dataset uploaded successfully!
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded p-2 mb-3">
            {error}
          </div>
        )}

        {/* Metadata */}
        <div className="space-y-3 mb-4">
          <label className="block text-sm font-medium">Title *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full border rounded px-2 py-1 text-sm"
            placeholder="e.g. Census 2020"
          />

          <label className="block text-sm font-medium">Year *</label>
          <input
            type="number"
            value={year ?? ""}
            onChange={(e) => setYear(Number(e.target.value))}
            className="w-full border rounded px-2 py-1 text-sm"
          />

          <label className="block text-sm font-medium">Source Name</label>
          <input
            type="text"
            value={sourceName}
            onChange={(e) => setSourceName(e.target.value)}
            className="w-full border rounded px-2 py-1 text-sm"
          />

          <label className="block text-sm font-medium">Source URL</label>
          <input
            type="url"
            value={sourceUrl}
            onChange={(e) => setSourceUrl(e.target.value)}
            className="w-full border rounded px-2 py-1 text-sm"
          />

          <label className="block text-sm font-medium">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full border rounded px-2 py-1 text-sm"
          />
        </div>

        {/* File Upload */}
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={handleTemplateDownload}
            className="flex items-center text-sm border px-2 py-1 rounded hover:bg-blue-50 text-blue-700"
          >
            <Download className="w-4 h-4 mr-1" />
            Download Template
          </button>

          <label className="text-sm font-medium text-[color:var(--gsc-red)] cursor-pointer">
            <input type="file" accept=".csv" onChange={handleFileSelect} hidden />
            {file ? file.name : "Choose CSV File"}
          </label>
        </div>

        {uploading && (
          <div className="mt-3 w-full bg-gray-100 rounded-full h-2 overflow-hidden">
            <div
              className="bg-[color:var(--gsc-green)] h-2 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2 mt-5">
          <button
            onClick={onClose}
            disabled={uploading}
            className="px-4 py-1 border rounded text-sm hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={uploading}
            className="px-4 py-1 bg-[color:var(--gsc-red)] text-white rounded text-sm flex items-center gap-2 hover:opacity-90 disabled:opacity-70"
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Uploading…
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

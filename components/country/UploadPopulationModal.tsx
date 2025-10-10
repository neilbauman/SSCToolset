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
  const [title, setTitle] = useState("");
  const [year, setYear] = useState<number | null>(null);
  const [sourceName, setSourceName] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      setFile(e.target.files[0]);
    }
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
    if (!file) return setError("Please select a CSV file first.");
    if (!year) return setError("Please provide the dataset year.");
    if (!title.trim()) return setError("Please provide a dataset title.");

    setUploading(true);

    try {
      // Step 1: Create a new version entry
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
      if (!version) throw new Error("Failed to create version record.");

      // Step 2: Upload file to Supabase Storage
      const fileExt = file.name.split(".").pop();
      const storagePath = `population_uploads/${countryIso}/${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from("uploads")
        .upload(storagePath, file);

      if (uploadError) throw uploadError;

      // Step 3: Call Edge Function directly (fetch-based)
      const functionUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/convert-population`;

      const response = await fetch(functionUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          filePath: storagePath,
          countryIso,
          title: title.trim(),
          year,
          sourceName: sourceName || null,
          sourceUrl: sourceUrl || null,
          notes: notes || null,
          versionId: version.id,
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Edge Function error: ${text}`);
      }

      await onUploaded();
      onClose();
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

        <div className="space-y-3 mb-4">
          <div>
            <label className="block text-sm font-medium">Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full border rounded px-2 py-1 text-sm"
              placeholder="e.g. Census 2020"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Year *</label>
            <input
              type="number"
              value={year ?? ""}
              onChange={(e) => setYear(Number(e.target.value))}
              className="w-full border rounded px-2 py-1 text-sm"
              placeholder="e.g. 2020"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Source Name</label>
            <input
              type="text"
              value={sourceName}
              onChange={(e) => setSourceName(e.target.value)}
              className="w-full border rounded px-2 py-1 text-sm"
              placeholder="e.g. OCHA"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Source URL</label>
            <input
              type="url"
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              className="w-full border rounded px-2 py-1 text-sm"
              placeholder="https://example.org"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full border rounded px-2 py-1 text-sm"
              placeholder="Optional notes about the dataset"
            />
          </div>
        </div>

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

        {error && (
          <p className="text-sm text-red-600 border-t border-red-100 pt-2 mt-2">
            {error}
          </p>
        )}

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

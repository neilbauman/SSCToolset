"use client";

import { useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";

interface UploadGISModalProps {
  countryIso: string;
  onClose: () => void;
  onUploaded: () => Promise<void> | void;
}

export default function UploadGISModal({
  countryIso,
  onClose,
  onUploaded,
}: UploadGISModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpload = async () => {
    try {
      if (!file) {
        setError("Please select a file to upload.");
        return;
      }

      setUploading(true);
      setError(null);

      // Create a unique path within the gis_raw bucket
      const folder = `${countryIso}/${crypto.randomUUID()}`;
      const path = `${folder}/${file.name}`;

      const { error: uploadError } = await supabase.storage
        .from("gis_raw")
        .upload(path, file);

      if (uploadError) throw uploadError;

      // Record layer entry in DB
      const { error: dbError } = await supabase.from("gis_layers").insert([
        {
          country_iso: countryIso,
          layer_name: file.name,
          format: file.name.endsWith(".zip") ? "zip" : "json",
          source: { path },
          is_active: true,
        },
      ]);

      if (dbError) throw dbError;

      await onUploaded();
      onClose();
    } catch (err: any) {
      console.error("Upload error:", err.message);
      setError(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/30"
      onClick={onClose}
    >
      <div
        className="relative z-[2100] w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-4 text-lg font-semibold">Upload GIS Layer</h2>

        <input
          type="file"
          accept=".geojson,.json,.zip"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="w-full rounded border p-2 text-sm"
        />

        {error && (
          <p className="mt-2 text-sm text-red-600">
            {error}
          </p>
        )}

        <div className="mt-5 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded border px-4 py-2 text-sm hover:bg-gray-50"
            disabled={uploading}
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={uploading}
            className={`rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-60`}
          >
            {uploading ? "Uploading..." : "Upload"}
          </button>
        </div>
      </div>
    </div>
  );
}

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
  const [adminLevel, setAdminLevel] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpload = async () => {
    try {
      if (!file) return setError("Please select a file to upload.");
      if (!adminLevel) return setError("Please select an admin level.");

      setUploading(true);
      setError(null);

      // Generate path
      const folder = `${countryIso}/${crypto.randomUUID()}`;
      const path = `${folder}/${file.name}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from("gis_raw")
        .upload(path, file);

      if (uploadError) throw uploadError;

      // Record layer in DB
      const { error: dbError } = await supabase.from("gis_layers").insert([
        {
          country_iso: countryIso,
          layer_name: file.name,
          format: file.name.endsWith(".zip") ? "zip" : "json",
          source: { path },
          admin_level_int: adminLevel,
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

        <label className="block text-sm font-medium text-gray-700 mb-1">
          Choose File
        </label>
        <input
          type="file"
          accept=".geojson,.json,.zip"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="w-full rounded border p-2 text-sm mb-3"
        />

        <label className="block text-sm font-medium text-gray-700 mb-1">
          Admin Level
        </label>
        <select
          value={adminLevel ?? ""}
          onChange={(e) =>
            setAdminLevel(e.target.value ? Number(e.target.value) : null)
          }
          className="w-full rounded border p-2 text-sm mb-3"
        >
          <option value="">Select Level</option>
          <option value={1}>ADM1</option>
          <option value={2}>ADM2</option>
          <option value={3}>ADM3</option>
          <option value={4}>ADM4</option>
          <option value={5}>ADM5</option>
        </select>

        {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

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
            className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {uploading ? "Uploading..." : "Upload"}
          </button>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";

export interface UploadGISModalProps {
  open: boolean;
  onClose: () => void;
  countryIso: string;
  onUploaded: () => Promise<void> | void;
}

export default function UploadGISModal({
  open,
  onClose,
  countryIso,
  onUploaded,
}: UploadGISModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [adminLevel, setAdminLevel] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const GSC_RED = "#630710";
  const GSC_LIGHT_GRAY = "#e5e7eb";

  if (!open) return null;

  const handleUpload = async () => {
    try {
      if (!file) return setError("Please select a file.");
      if (!adminLevel) return setError("Please select an admin level (ADM0–ADM5).");

      setUploading(true);
      setError(null);

      const path = `${countryIso}/${crypto.randomUUID()}/${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("gis_raw")
        .upload(path, file);

      if (uploadError) throw uploadError;

      // Determine admin level integer
      const match = adminLevel.match(/ADM(\d)/);
      const adminLevelInt = match ? parseInt(match[1]) : null;

      // Insert into gis_layers table
      const { error: insertError } = await supabase
        .from("gis_layers")
        .insert([
          {
            country_iso: countryIso,
            layer_name: file.name,
            admin_level: adminLevel,
            admin_level_int: adminLevelInt,
            format: file.name.endsWith(".json") ? "GeoJSON" : "Unknown",
            source: { path },
            is_active: true,
          },
        ]);

      if (insertError) throw insertError;

      await onUploaded();
      onClose();
    } catch (err: any) {
      console.error("UploadGISModal error:", err.message);
      setError(err.message || "Upload failed.");
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
        <h2 className="mb-4 text-lg font-semibold text-gray-900">
          Upload GIS Layer
        </h2>

        <label className="block text-sm font-medium text-gray-700 mb-1">
          Admin Level
        </label>
        <select
          value={adminLevel}
          onChange={(e) => setAdminLevel(e.target.value)}
          className="w-full rounded border p-2 text-sm mb-3"
        >
          <option value="">Select admin level</option>
          <option value="ADM0">ADM0 (Country)</option>
          <option value="ADM1">ADM1 (Region)</option>
          <option value="ADM2">ADM2 (Province)</option>
          <option value="ADM3">ADM3 (District)</option>
          <option value="ADM4">ADM4 (Sub-District)</option>
          <option value="ADM5">ADM5 (Village)</option>
        </select>

        <label className="block text-sm font-medium text-gray-700 mb-1">
          GeoJSON File
        </label>
        <input
          type="file"
          accept=".json,.geojson"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="w-full text-sm mb-3"
        />

        {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

        <div className="flex justify-end gap-3 mt-4">
          <button
            onClick={onClose}
            className="rounded border px-4 py-2 text-sm"
            style={{ borderColor: GSC_LIGHT_GRAY }}
            disabled={uploading}
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={uploading}
            className="rounded px-4 py-2 text-sm text-white hover:opacity-90"
            style={{ backgroundColor: GSC_RED }}
          >
            {uploading ? "Uploading..." : "Upload"}
          </button>
        </div>
      </div>
    </div>
  );
}

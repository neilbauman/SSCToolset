"use client";

import { useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";

interface UploadGISModalProps {
  open: boolean;
  onClose: () => void;
  countryIso: string;
  onUploaded: () => void;
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

  if (!open) return null; // ✅ do not render when closed

  const GSC_RED = "var(--gsc-red)";
  const GSC_BLUE = "var(--gsc-blue)";

  const handleUpload = async () => {
    if (!file || !adminLevel) {
      setError("Please select a file and administrative level.");
      return;
    }

    try {
      setUploading(true);
      setError(null);

      const path = `${countryIso}/${file.name}`;

      // Upload to Supabase storage
      const { error: uploadError } = await supabase.storage
        .from("gis_raw")
        .upload(path, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Insert record in DB
      const { error: dbError } = await supabase.from("gis_layers").insert([
        {
          country_iso: countryIso,
          layer_name: file.name,
          admin_level: adminLevel,
          admin_level_int: parseInt(adminLevel.replace(/\D/g, ""), 10) || null,
          is_active: true,
          source: { path },
          format: "GeoJSON",
        },
      ]);

      if (dbError) throw dbError;

      onUploaded();
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
        <h2 className="text-lg font-semibold mb-4 text-[color:var(--gsc-blue)]">
          Upload GIS Layer
        </h2>

        <label className="block text-sm font-medium text-gray-700 mb-1">
          Administrative Level
        </label>
        <select
          className="w-full border rounded p-2 text-sm mb-3"
          value={adminLevel}
          onChange={(e) => setAdminLevel(e.target.value)}
        >
          <option value="">Select admin level...</option>
          <option value="ADM0">ADM0</option>
          <option value="ADM1">ADM1</option>
          <option value="ADM2">ADM2</option>
          <option value="ADM3">ADM3</option>
          <option value="ADM4">ADM4</option>
        </select>

        <label className="block text-sm font-medium text-gray-700 mb-1">
          GeoJSON File
        </label>
        <input
          type="file"
          accept=".json,.geojson"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="w-full border rounded p-2 text-sm mb-3"
        />

        {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={uploading}
            className="rounded border px-4 py-2 text-sm hover:bg-gray-50"
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

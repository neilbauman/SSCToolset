"use client";

import { useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { Upload, X } from "lucide-react";

interface UploadGISModalProps {
  countryIso: string;
  onClose: () => void;
  onUploaded: () => Promise<void> | void;
}

/**
 * UploadGISModal
 * Allows uploading a new GIS layer to Supabase storage + metadata record.
 */
export default function UploadGISModal({
  countryIso,
  onClose,
  onUploaded,
}: UploadGISModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [adminLevel, setAdminLevel] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const GSC_RED = "var(--gsc-red)";

  const handleUpload = async () => {
    if (!file) return setError("Please select a file.");
    if (!adminLevel) return setError("Please select an admin level.");

    try {
      setUploading(true);
      setError(null);

      const path = `gis_raw/${countryIso}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("gis_raw")
        .upload(path, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase.from("gis_layers").insert([
        {
          country_iso: countryIso,
          layer_name: file.name,
          admin_level: adminLevel,
          admin_level_int: parseInt(adminLevel.replace("ADM", "")) || null,
          format: "GeoJSON",
          source: { path },
          is_active: true,
        },
      ]);

      if (dbError) throw dbError;

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
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Upload size={18} /> Upload GIS Layer
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-black">
            <X size={18} />
          </button>
        </div>

        <label className="block text-sm font-medium text-gray-700 mb-1">
          File (GeoJSON)
        </label>
        <input
          type="file"
          accept=".json,.geojson"
          className="w-full text-sm mb-3"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
        />

        <label className="block text-sm font-medium text-gray-700 mb-1">
          Admin Level
        </label>
        <select
          value={adminLevel}
          onChange={(e) => setAdminLevel(e.target.value)}
          className="w-full border rounded p-2 text-sm mb-3"
        >
          <option value="">Select level...</option>
          <option value="ADM0">ADM0</option>
          <option value="ADM1">ADM1</option>
          <option value="ADM2">ADM2</option>
          <option value="ADM3">ADM3</option>
        </select>

        {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

        <div className="flex justify-end gap-3">
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

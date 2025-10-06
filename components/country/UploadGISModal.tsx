"use client";

import { useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";

interface UploadGISModalProps {
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
  const [adminLevelInt, setAdminLevelInt] = useState<number | "">("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const GSC_RED = "var(--gsc-red)";

  if (!open) return null;

  const handleUpload = async () => {
    try {
      setError(null);
      if (!file) throw new Error("Please select a file to upload.");
      if (adminLevelInt === "") throw new Error("Please select an admin level.");

      setUploading(true);

      const ext = file.name.split(".").pop();
      const filePath = `${countryIso}/${crypto.randomUUID()}/${file.name}`;

      const { error: uploadError } = await supabase.storage
        .from("gis_raw")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { error: insertError } = await supabase
        .from("gis_layers")
        .insert([
          {
            country_iso: countryIso,
            layer_name: file.name,
            format: ext,
            source: { path: filePath },
            admin_level: `ADM${adminLevelInt}`,
            admin_level_int: adminLevelInt,
            is_active: true,
          },
        ]);

      if (insertError) throw insertError;

      await onUploaded();
      onClose();
    } catch (err: any) {
      console.error("Upload error:", err.message);
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
        <h2 className="mb-4 text-lg font-semibold">Upload GIS Layer</h2>

        <label className="block text-sm font-medium text-gray-700 mb-1">
          Select File
        </label>
        <input
          type="file"
          accept=".geojson,.json,.zip"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="w-full border rounded p-2 text-sm mb-3"
        />

        <label className="block text-sm font-medium text-gray-700 mb-1">
          Admin Level
        </label>
        <select
          value={adminLevelInt}
          onChange={(e) =>
            setAdminLevelInt(
              e.target.value ? Number(e.target.value) : ""
            )
          }
          className="w-full border rounded p-2 text-sm mb-3"
        >
          <option value="">Select level...</option>
          <option value="0">ADM0 – National</option>
          <option value="1">ADM1 – Region</option>
          <option value="2">ADM2 – Province</option>
          <option value="3">ADM3 – Municipality</option>
          <option value="4">ADM4 – Barangay</option>
          <option value="5">ADM5 – Local</option>
        </select>

        {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

        <div className="flex justify-end gap-3 mt-4">
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

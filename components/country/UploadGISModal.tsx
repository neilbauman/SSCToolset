"use client";

import { useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";

interface UploadGISModalProps {
  countryIso: string;
  onClose: () => void;
  onUploaded?: () => Promise<void> | void;
}

export default function UploadGISModal({
  countryIso,
  onClose,
  onUploaded,
}: UploadGISModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [adminLevel, setAdminLevel] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpload = async () => {
    if (!file) return setError("Please select a file to upload.");
    if (!adminLevel)
      return setError("Please select an administrative level before uploading.");

    setUploading(true);
    setError(null);

    try {
      // 1️⃣ Get active dataset version
      const { data: versionData, error: versionError } = await supabase
        .from("gis_dataset_versions")
        .select("id")
        .eq("country_iso", countryIso)
        .eq("is_active", true)
        .single();

      if (versionError || !versionData)
        throw new Error("No active dataset version found. Please create one first.");

      const activeVersionId = versionData.id;

      // 2️⃣ Upload file to Supabase Storage
      const path = `${countryIso}/${crypto.randomUUID()}/${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("gis_raw")
        .upload(path, file);
      if (uploadError) throw uploadError;

      // 3️⃣ Extract admin level integer (if known)
      const levelMatch = adminLevel.match(/ADM?(\d)/i);
      const adminLevelInt = levelMatch ? parseInt(levelMatch[1]) : null;

      // 4️⃣ Determine file format
      const ext = file.name.split(".").pop()?.toLowerCase();
      const format =
        ext === "zip"
          ? "shapefile"
          : ext === "geojson" || ext === "json"
          ? "json"
          : "unknown";

      // 5️⃣ Check if layer already exists for same ADM level
      const { data: existing } = await supabase
        .from("gis_layers")
        .select("id")
        .eq("country_iso", countryIso)
        .eq("dataset_version_id", activeVersionId)
        .eq("admin_level_int", adminLevelInt)
        .eq("is_active", true)
        .maybeSingle();

      if (existing) {
        const confirmReplace = confirm(
          `A layer for ${adminLevel} already exists. Replace it?`
        );
        if (!confirmReplace) {
          setUploading(false);
          return;
        }

        // 6️⃣ Deactivate the old layer before inserting new one
        const { error: deactivateError } = await supabase
          .from("gis_layers")
          .update({ is_active: false })
          .eq("id", existing.id);
        if (deactivateError) throw deactivateError;
      }

      // 7️⃣ Insert new layer (catch unique constraint errors gracefully)
      const { error: insertError } = await supabase.from("gis_layers").insert([
        {
          country_iso: countryIso,
          layer_name: file.name,
          admin_level: adminLevel,
          admin_level_int: adminLevelInt,
          format,
          source: { path },
          dataset_version_id: activeVersionId,
          is_active: true,
        },
      ]);

      if (insertError) {
        if (insertError.message.includes("duplicate key value")) {
          alert("A layer already exists and could not be replaced automatically. Please refresh the page.");
        } else {
          throw insertError;
        }
      } else {
        alert(existing ? "Layer replaced successfully!" : "Upload successful!");
        await onUploaded?.();
        onClose();
      }
    } catch (err: any) {
      console.error("Upload error:", err);
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
        className="relative z-[2100] w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-4 text-lg font-semibold text-[color:var(--gsc-gray)]">
          Upload GIS Layer
        </h2>

        {/* File Upload */}
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Choose File
        </label>
        <input
          type="file"
          accept=".geojson,.json,.zip"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="w-full text-sm mb-4"
        />

        {/* Admin Level Dropdown */}
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Admin Level
        </label>
        <select
          value={adminLevel}
          onChange={(e) => setAdminLevel(e.target.value)}
          className="w-full rounded border p-2 text-sm mb-3"
        >
          <option value="">Select level</option>
          <option value="ADM0">ADM0 – Country</option>
          <option value="ADM1">ADM1 – Region / Province</option>
          <option value="ADM2">ADM2 – Municipality</option>
          <option value="ADM3">ADM3 – Barangay</option>
          <option value="ADM4">ADM4</option>
          <option value="ADM5">ADM5</option>
        </select>

        {/* Error Message */}
        {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

        {/* Buttons */}
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={uploading}
            className="rounded border border-[color:var(--gsc-light-gray)] px-4 py-2 text-sm text-[color:var(--gsc-gray)] hover:bg-[color:var(--gsc-light-gray)]"
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={uploading}
            className="rounded px-4 py-2 text-sm text-white hover:opacity-90"
            style={{ backgroundColor: "var(--gsc-red)" }}
          >
            {uploading ? "Uploading..." : "Upload"}
          </button>
        </div>
      </div>
    </div>
  );
}

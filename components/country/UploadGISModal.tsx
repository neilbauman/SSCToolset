"use client";

import { useState } from "react";
import ModalBase from "@/components/ui/ModalBase";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { Upload } from "lucide-react";

type UploadGISModalProps = {
  open: boolean;
  onClose: () => void;
  countryIso: string;
  onUploaded: () => Promise<void> | void;
};

export default function UploadGISModal({
  open,
  onClose,
  countryIso,
  onUploaded,
}: UploadGISModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [adminLevel, setAdminLevel] = useState<string>("");

  // 🧠 Detect ADM level from filename
  const guessLevelFromFilename = (name: string): string => {
    const lower = name.toLowerCase();
    if (lower.includes("adm0")) return "ADM0";
    if (lower.includes("adm1")) return "ADM1";
    if (lower.includes("adm2")) return "ADM2";
    if (lower.includes("adm3")) return "ADM3";
    return "";
  };

  const handleFileSelect = (f: File | null) => {
    setFile(f);
    if (f) {
      const guessed = guessLevelFromFilename(f.name);
      if (guessed) setAdminLevel(guessed);
    }
  };

  const handleUpload = async () => {
    try {
      if (!file) return setMessage("Please select a file first.");
      if (!adminLevel) return setMessage("Please select an administrative level.");

      setUploading(true);
      setMessage(null);

      // Step 1️⃣: Create dataset version entry
      const title = file.name;
      const { data: versionData, error: versionError } = await supabase
        .from("gis_dataset_versions")
        .insert({
          country_iso: countryIso,
          title,
          source: "User Upload (raw)",
          is_active: false,
        })
        .select("id")
        .single();

      if (versionError || !versionData)
        throw new Error(versionError?.message || "Failed to create version record");

      const versionId = versionData.id;
      const path = `${countryIso}/${versionId}/${file.name}`;

      // Step 2️⃣: Upload to storage bucket (gis_raw)
      const { error: uploadError } = await supabase.storage
        .from("gis_raw")
        .upload(path, file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Step 3️⃣: Save layer metadata (includes admin level)
      const { error: layerError } = await supabase.from("gis_layers").insert({
        country_iso: countryIso,
        dataset_version_id: versionId,
        layer_name: file.name,
        format: file.name.endsWith(".zip") ? "zip" : "json",
        crs: "EPSG:4326",
        admin_level: adminLevel,
        source: { path },
      });

      if (layerError) throw layerError;

      // Step 4️⃣: Mark version active
      await supabase
        .from("gis_dataset_versions")
        .update({ is_active: true })
        .eq("id", versionId);

      setMessage("✅ GIS dataset uploaded successfully!");
      setTimeout(() => {
        onUploaded();
        onClose();
      }, 1200);
    } catch (err: any) {
      console.error(err);
      setMessage(`Upload failed: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <ModalBase open={open} onClose={onClose} title="Upload GIS Dataset">
      <div className="space-y-4">
        <p className="text-sm text-gray-700">
          Upload a zipped shapefile (<code>.zip</code>) or GeoJSON file (<code>.json</code> /
          <code>.geojson</code>) for <strong>{countryIso}</strong>. Files up to{" "}
          <strong>150&nbsp;MB</strong> are supported.
        </p>

        {/* File input */}
        <input
          type="file"
          accept=".zip,.json,.geojson"
          onChange={(e) => handleFileSelect(e.target.files?.[0] || null)}
          className="block w-full text-sm border border-gray-300 rounded px-2 py-1"
        />

        {/* Admin level selector */}
        <div>
          <label className="block text-sm font-medium mb-1">
            Administrative Level
          </label>
          <select
            value={adminLevel}
            onChange={(e) => setAdminLevel(e.target.value)}
            className="block w-full text-sm border border-gray-300 rounded px-2 py-1 bg-white"
          >
            <option value="">Select...</option>
            <option value="ADM0">National (ADM0)</option>
            <option value="ADM1">Region / Province (ADM1)</option>
            <option value="ADM2">Municipality / District (ADM2)</option>
            <option value="ADM3">Subdistrict / Barangay (ADM3)</option>
          </select>
          {file && !adminLevel && (
            <p className="text-xs text-gray-500 mt-1">
              Hint: Try naming your file like <code>phl_adm2...</code> to auto-detect level.
            </p>
          )}
        </div>

        {/* Upload button */}
        <button
          onClick={handleUpload}
          disabled={uploading}
          className="flex items-center justify-center w-full text-sm text-white bg-[color:var(--gsc-red)] px-3 py-2 rounded hover:opacity-90 disabled:opacity-50"
        >
          <Upload className="w-4 h-4 mr-2" />
          {uploading ? "Uploading..." : "Upload"}
        </button>

        {message && (
          <p
            className={`text-sm text-center ${
              message.startsWith("✅") ? "text-green-600" : "text-red-600"
            }`}
          >
            {message}
          </p>
        )}
      </div>
    </ModalBase>
  );
}

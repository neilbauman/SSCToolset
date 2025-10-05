"use client";

import React, { useState } from "react";
import ModalBase from "@/components/ui/ModalBase";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { Upload } from "lucide-react";

type UploadGISModalProps = {
  open: boolean;
  onClose: () => void;
  countryIso: string;
  onUploaded: () => Promise<void>;
};

export default function UploadGISModal({
  open,
  onClose,
  countryIso,
  onUploaded,
}: UploadGISModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleUpload = async () => {
    try {
      if (!file) {
        setError("Please select a file to upload.");
        return;
      }
      setError(null);
      setSuccess(null);
      setUploading(true);

      // 1️⃣ Create new GIS dataset version
      const { data: versionData, error: versionError } = await supabase
        .from("gis_dataset_versions")
        .insert({
          country_iso: countryIso,
          title: file.name,
          source: "User Upload (raw)",
          is_active: false,
        })
        .select()
        .single();

      if (versionError) throw versionError;
      const versionId = versionData.id;

      // 2️⃣ Upload the file to the gis_raw bucket
      const fileExt = file.name.split(".").pop()?.toLowerCase();
      const uploadPath = `${countryIso}/${versionId}/${file.name}`;

      const { error: uploadError } = await supabase.storage
        .from("gis_raw")
        .upload(uploadPath, file, {
          upsert: true,
          contentType:
            fileExt === "zip"
              ? "application/zip"
              : fileExt === "geojson"
              ? "application/geo+json"
              : "application/json",
        });

      if (uploadError) throw uploadError;

      // 3️⃣ Trigger the Supabase Edge Function for conversion
      const funcUrl =
        "https://ergsggprgtlsrrsmwtkf.supabase.co/functions/v1/convert-gis";

      const resp = await fetch(funcUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          bucket: "gis_raw",
          path: uploadPath,
          country_iso: countryIso,
          version_id: versionId,
        }),
      });

      const result = await resp.json();
      if (!resp.ok || !result.ok) {
        throw new Error(result.error || "Conversion failed.");
      }

      setSuccess(result.message || "Upload successful.");
      await onUploaded();
    } catch (err: any) {
      console.error("Upload error:", err);
      setError(err.message || "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <ModalBase open={open} onClose={onClose} title="Upload GIS Dataset">
      <div className="space-y-4">
        <p className="text-sm text-gray-700">
          Upload a zipped shapefile (<code>.zip</code>) or GeoJSON file (
          <code>.json</code> / <code>.geojson</code>) for{" "}
          <strong>{countryIso}</strong>. Files up to{" "}
          <strong>150 MB</strong> are supported. The system will automatically
          convert and simplify the dataset on the server.
        </p>

        <input
          type="file"
          accept=".zip,.json,.geojson"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          disabled={uploading}
          className="block w-full text-sm text-gray-700 border border-gray-300 rounded-lg cursor-pointer focus:outline-none"
        />

        {error && (
          <p className="text-sm text-red-600 bg-red-50 p-2 rounded">{error}</p>
        )}
        {success && (
          <p className="text-sm text-green-700 bg-green-50 p-2 rounded">
            {success}
          </p>
        )}

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            disabled={uploading}
            className="px-3 py-2 text-sm border rounded bg-gray-100 hover:bg-gray-200"
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={uploading}
            className="px-3 py-2 text-sm text-white rounded bg-[color:var(--gsc-red)] hover:opacity-90 flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            {uploading ? "Uploading..." : "Upload"}
          </button>
        </div>
      </div>
    </ModalBase>
  );
}

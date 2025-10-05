"use client";

import React, { useState } from "react";
import ModalBase from "@/components/ui/ModalBase";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";

/**
 * UploadGISModal (server conversion version)
 * ------------------------------------------
 * Uploads a zipped shapefile to Supabase Storage (gis_raw),
 * creates a gis_dataset_versions record, then calls /api/convert-gis
 * to handle server-side GeoJSON conversion and metadata insertion.
 */

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
  const [message, setMessage] = useState("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null;
    setFile(f);
    setMessage("");
  };

  const handleUpload = async () => {
    if (!file) {
      setMessage("Please select a .zip shapefile first.");
      return;
    }

    try {
      setUploading(true);
      setMessage("Uploading shapefile...");

      // 1️⃣ Create a new GIS dataset version (inactive)
      const { data: version, error: versionErr } = await supabase
        .from("gis_dataset_versions")
        .insert({
          country_iso: countryIso,
          title: file.name.replace(".zip", ""),
          source: "User Upload (raw)",
          is_active: false,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (versionErr) throw versionErr;
      const versionId = version.id;

      // 2️⃣ Upload ZIP to gis_raw bucket
      const uploadPath = `${countryIso}/${versionId}/${file.name}`;
      const { error: uploadErr } = await supabase.storage
        .from("gis_raw")
        .upload(uploadPath, file, {
          cacheControl: "3600",
          upsert: true,
          contentType: "application/zip",
        });
      if (uploadErr) throw uploadErr;

      setMessage("✅ Upload complete. Starting server conversion...");

      // 3️⃣ Trigger server-side conversion
      const response = await fetch("/api/convert-gis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bucket: "gis_raw",
          path: uploadPath,
          country_iso: countryIso,
          version_id: versionId,
        }),
      });

      const result = await response.json();
      if (!result.ok) {
        throw new Error(result.error || "Conversion failed");
      }

      setMessage("✅ Conversion complete. GIS dataset ready.");
      await onUploaded();
      onClose();
    } catch (err: any) {
      console.error("UploadGISModal error:", err);
      setMessage(`Upload failed: ${err.message || err}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <ModalBase
      open={open}
      title="Upload GIS Dataset"
      confirmLabel={uploading ? "Uploading..." : "Upload"}
      onClose={onClose}
      onConfirm={handleUpload}
      disableConfirm={uploading}
    >
      <div className="flex flex-col gap-3">
        <p className="text-sm text-gray-700">
          Upload a zipped shapefile (.zip) for <strong>{countryIso}</strong>.
          Files up to <strong>150 MB</strong> are supported. The system will
          automatically convert and simplify the dataset on the server.
        </p>
        <input
          type="file"
          accept=".zip,.geojson,.json"
          onChange={handleFileChange}
          className="border p-2 rounded text-sm"
        />
        {message && (
          <p className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
            {message}
          </p>
        )}
      </div>
    </ModalBase>
  );
}

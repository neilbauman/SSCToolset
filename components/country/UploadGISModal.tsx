"use client";

import React, { useState } from "react";
import ModalBase from "@/components/ui/ModalBase";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";

/**
 * UploadGISModal (raw upload version)
 * -----------------------------------
 * Uploads the zipped shapefile directly to Supabase Storage (bucket: gis_raw)
 * and creates a gis_dataset_versions row.  The Edge Function will later
 * convert + simplify it into GeoJSON inside the `gis` bucket.
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
      setMessage("Uploading raw shapefile to Supabase...");

      // 1️⃣ Create a new GIS dataset version row (inactive until conversion)
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

      // 2️⃣ Upload the raw zip to the gis_raw bucket
      const uploadPath = `${countryIso}/${versionId}/${file.name}`;
      const { error: uploadErr } = await supabase.storage
        .from("gis_raw")
        .upload(uploadPath, file, {
          cacheControl: "3600",
          upsert: true,
          contentType: "application/zip",
        });

      if (uploadErr) throw uploadErr;

      setMessage("✅ Upload complete. Conversion will run server-side.");
      await onUploaded();
      onClose();
    } catch (err: any) {
      console.error(err);
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
          The file will be stored in <code>gis_raw</code> for server-side
          conversion to GeoJSON.
        </p>
        <input
          type="file"
          accept=".zip"
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

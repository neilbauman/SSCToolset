"use client";

import { useState } from "react";
import ModalBase from "@/components/ui/ModalBase";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";

type UploadGISModalProps = {
  countryIso: string;
  onClose: () => void;
  onUploaded: () => void;
};

export default function UploadGISModal({
  countryIso,
  onClose,
  onUploaded,
}: UploadGISModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setError(null);

    try {
      const fileExt = file.name.split(".").pop();
      const filePath = `${countryIso}/${Date.now()}.${fileExt}`;

      // Upload file to Supabase Storage bucket
      const { error: uploadError } = await supabase.storage
        .from("gis_raw")
        .upload(filePath, file);

      if (uploadError) {
        setError(uploadError.message);
        setUploading(false);
        return;
      }

      // Call Edge Function to process file
      const { error: functionError } = await supabase.functions.invoke(
        "convert-gis",
        {
          body: { country_iso: countryIso, path: filePath },
        }
      );

      if (functionError) {
        setError(functionError.message);
        setUploading(false);
        return;
      }

      setUploading(false);
      onUploaded();
      onClose();
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Upload failed.");
      setUploading(false);
    }
  };

  return (
    <ModalBase open={true} title="Upload GIS Layer" onClose={onClose}>
      <div className="relative z-[9999] w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl">
        <div className="mb-3 text-lg font-semibold">Upload GIS Layer</div>

        <input
          type="file"
          accept=".geojson,.zip,.json"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="mb-3 w-full text-sm"
        />

        {error && (
          <div className="mb-3 rounded bg-red-100 p-2 text-sm text-red-600">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded border px-3 py-1.5 text-sm hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={uploading || !file}
            className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {uploading ? "Uploading..." : "Upload"}
          </button>
        </div>
      </div>
    </ModalBase>
  );
}

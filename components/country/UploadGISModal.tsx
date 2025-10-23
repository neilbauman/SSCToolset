"use client";

import { useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { Loader2, UploadCloud } from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
  countryIso: string;
  onUploaded?: () => void;
};

export default function UploadGISModal({ open, onClose, countryIso, onUploaded }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progressMsg, setProgressMsg] = useState("");

  if (!open) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) setFile(e.target.files[0]);
  };

  const handleUpload = async () => {
    if (!file) return alert("Please select a GeoJSON or ZIP file.");

    setUploading(true);
    setProgressMsg("Uploading file to storage...");

    try {
      const bucket = "uploads";
      const path = `${countryIso}/${file.name}`;

      // 🧩 Upload file to temporary uploads bucket
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(path, file, {
          upsert: true,
          contentType: file.type || "application/octet-stream",
        });
      if (uploadError) throw uploadError;

      // Determine whether file is zip or geojson
      const isZip = file.name.toLowerCase().endsWith(".zip");
      const functionName = isZip ? "process-zip" : "convert-gis";

      setProgressMsg(
        isZip
          ? "Extracting and processing multiple GIS layers..."
          : "Registering single GIS layer..."
      );

      // 🚀 Invoke appropriate Edge Function
      const { data, error } = await supabase.functions.invoke(functionName, {
        body: {
          bucket,
          path,
          country_iso: countryIso,
        },
      });

      if (error) throw error;
      console.log(`✅ ${functionName} response:`, data);

      alert(
        isZip
          ? "✅ ZIP uploaded, layers processed and registered successfully!"
          : "✅ GIS layer uploaded and registered successfully!"
      );

      // Refresh parent list
      onUploaded?.();
      onClose();
    } catch (err: any) {
      console.error("❌ Upload failed:", err);
      alert("Upload failed: " + err.message);
    } finally {
      setUploading(false);
      setProgressMsg("");
      setFile(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white w-[90%] max-w-md rounded-lg p-6 shadow-lg text-sm relative">
        <h2 className="text-lg font-semibold mb-2 text-[#640811]">Upload GIS Dataset</h2>
        <p className="text-gray-600 mb-4">
          Upload a <strong>.geojson</strong> (single layer) or <strong>.zip</strong> (multiple layers)
          file for <strong>{countryIso}</strong>.
        </p>

        <div className="border border-dashed border-gray-300 p-4 rounded-lg mb-3 text-center">
          <input
            type="file"
            accept=".geojson,.json,.zip"
            onChange={handleFileChange}
            className="hidden"
            id="gis-upload-file"
          />
          <label
            htmlFor="gis-upload-file"
            className="cursor-pointer text-[#640811] hover:underline flex flex-col items-center gap-2"
          >
            <UploadCloud className="w-6 h-6" />
            {file ? (
              <span className="text-sm text-gray-700">{file.name}</span>
            ) : (
              <span>Select file...</span>
            )}
          </label>
        </div>

        {progressMsg && (
          <div className="text-xs text-gray-600 mb-2">{progressMsg}</div>
        )}

        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={onClose}
            disabled={uploading}
            className="px-3 py-1 border rounded text-sm hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={uploading || !file}
            className="px-3 py-1.5 rounded bg-[#640811] text-white text-sm flex items-center gap-2 disabled:opacity-50"
          >
            {uploading && <Loader2 className="w-4 h-4 animate-spin" />}
            {uploading ? "Uploading..." : "Upload"}
          </button>
        </div>
      </div>
    </div>
  );
}

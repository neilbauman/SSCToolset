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
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return alert("Please select a GeoJSON or ZIP file.");
    setUploading(true);
    setProgressMsg("Uploading to storage...");

    try {
      // 🧭 Define upload path
      const bucket = "gis_raw";
      const path = `${countryIso}/${file.name}`;

      // 📤 Upload file
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(path, file, {
          upsert: true,
          contentType: file.type || "application/json",
        });
      if (uploadError) throw uploadError;

      setProgressMsg("Registering GIS layer via Edge Function...");

      // 🚀 Call convert-gis (no version id in DEV mode)
      const { data, error } = await supabase.functions.invoke("convert-gis", {
        body: {
          bucket,
          path,
          country_iso: countryIso,
          version_id: "dev-mode", // ignored by Edge Function in DEV_MODE
        },
      });
      if (error) throw error;
      console.log("✅ convert-gis response:", data);

      alert("✅ GIS dataset uploaded and registered successfully!");
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
        <h2 className="text-lg font-semibold mb-2 text-[#640811]">
          Upload GIS Dataset (DEV Mode)
        </h2>
        <p className="text-gray-600 mb-4">
          Upload a <strong>.geojson</strong> or <strong>.zip</strong> file to
          the <code>gis_raw</code> bucket for <strong>{countryIso}</strong>.
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

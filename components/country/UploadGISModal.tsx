"use client";

import { useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { X, UploadCloud } from "lucide-react";

interface UploadGISModalProps {
  open: boolean;
  onClose: () => void;
  countryIso: string;
  onUploaded: () => Promise<void> | void;
}

/**
 * UploadGISModal
 * - Handles .geojson (single) or .zip (bulk) uploads
 * - Uses Supabase Storage & Edge Function "process-zip"
 * - Invokes `onUploaded()` when layers are successfully added
 */
export default function UploadGISModal({
  open,
  onClose,
  countryIso,
  onUploaded,
}: UploadGISModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [log, setLog] = useState<string>("");

  if (!open) return null;

  async function handleUpload() {
    if (!file) return alert("Please choose a file first.");
    setUploading(true);
    setLog("Starting upload...");

    try {
      const ext = file.name.split(".").pop()?.toLowerCase();

      // ZIP Upload (Bulk Import)
      if (ext === "zip") {
        setLog("Uploading ZIP archive...");

        const path = `${countryIso}/${file.name}`;
        const { error: upErr } = await supabase.storage
          .from("uploads")
          .upload(path, file, {
            upsert: true,
            contentType: "application/zip",
          });
        if (upErr) throw new Error(upErr.message);

        setLog("Processing ZIP via Supabase Function...");
        const { data, error: fnErr } = await supabase.functions.invoke("process-zip", {
          body: { country_iso: countryIso, zip_path: path },
        });
        if (fnErr) throw new Error(fnErr.message);

        setLog(`✅ Imported ${data?.uploaded ?? 0} layers from ZIP.`);
      }
      // Single GeoJSON Upload
      else if (["geojson", "json"].includes(ext || "")) {
        setLog("Uploading single GeoJSON file...");

        const path = `${countryIso}/${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from("gis_raw")
          .upload(path, file, {
            upsert: true,
            contentType: "application/geo+json",
          });
        if (uploadError) throw new Error(uploadError.message);

        const { error: insertError } = await supabase.from("gis_layers").insert({
          country_iso: countryIso,
          layer_name: file.name,
          source: { bucket: "gis_raw", path },
        });
        if (insertError) throw new Error(insertError.message);

        setLog("✅ Uploaded 1 GeoJSON layer successfully.");
      } else {
        throw new Error("Unsupported file type. Please upload .geojson or .zip.");
      }

      // Refresh list
      await onUploaded();
    } catch (err: any) {
      console.error(err);
      setLog("❌ Upload failed: " + err.message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
      <div className="bg-white w-full max-w-lg rounded-lg shadow-lg p-6 space-y-4">
        {/* Header */}
        <div className="flex justify-between items-center border-b pb-2">
          <h2 className="text-lg font-semibold text-gray-800">
            Upload GIS Layer{file?.name?.endsWith(".zip") ? "s" : ""}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Upload Area */}
        <div className="flex flex-col items-center justify-center border-2 border-dashed rounded-md py-10 px-6 text-center bg-gray-50 hover:bg-gray-100 cursor-pointer transition"
          onClick={() => document.getElementById("file-input")?.click()}
        >
          <UploadCloud className="w-10 h-10 text-gray-400 mb-2" />
          <p className="text-gray-600 text-sm">
            {file ? (
              <>
                Selected file: <strong>{file.name}</strong>
              </>
            ) : (
              "Click to browse or drop your .geojson or .zip file here"
            )}
          </p>
          <input
            id="file-input"
            type="file"
            accept=".geojson,.json,.zip"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) setFile(f);
            }}
          />
        </div>

        {/* Log Display */}
        {log && (
          <div className="bg-gray-100 rounded-md p-3 text-sm text-gray-700 h-24 overflow-auto">
            {log}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={onClose}
            disabled={uploading}
            className="px-3 py-1.5 text-sm rounded border border-gray-300 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={!file || uploading}
            className={`px-4 py-1.5 text-sm rounded text-white flex items-center gap-2 ${
              uploading ? "bg-gray-500 cursor-not-allowed" : "bg-[#640811] hover:opacity-90"
            }`}
          >
            {uploading && <span className="animate-spin border-2 border-white border-t-transparent rounded-full w-4 h-4" />}
            {uploading ? "Uploading..." : "Upload"}
          </button>
        </div>
      </div>
    </div>
  );
}

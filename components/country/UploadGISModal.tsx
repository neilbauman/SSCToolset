"use client";

import { useState, useEffect } from "react";
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
  const [activeVersionId, setActiveVersionId] = useState<string | null>(null);

  // Fetch active version on open
  useEffect(() => {
    if (!open) return;
    (async () => {
      const { data, error } = await supabase
        .from("gis_dataset_versions")
        .select("id")
        .eq("country_iso", countryIso)
        .eq("is_active", true)
        .maybeSingle();
      if (error) console.warn("⚠️ Failed to get active version:", error);
      setActiveVersionId(data?.id || null);
    })();
  }, [open, countryIso]);

  if (!open) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) setFile(e.target.files[0]);
  };

  const handleUpload = async () => {
    if (!file) return alert("Please select a .geojson or .zip file first.");
    setUploading(true);
    setProgressMsg("Uploading file to storage...");

    try {
      const bucket = "gis_raw";
      const path = `${countryIso}/${file.name}`;

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;

      setProgressMsg("Registering GIS layer with Supabase Edge Function...");

      const { data, error } = await supabase.functions.invoke("convert-gis", {
        body: { bucket, path, country_iso: countryIso, version_id: activeVersionId },
      });
      if (error) throw error;

      console.log("✅ convert-gis:", data);
      alert("✅ GIS dataset uploaded successfully!");
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
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white w-[90%] max-w-md rounded-lg p-6 shadow-lg text-sm">
        <h2 className="text-lg font-semibold mb-2 text-[#640811]">Upload GIS Dataset</h2>
        <p className="text-gray-600 mb-3">
          Upload a <strong>.geojson</strong> or <strong>.zip</strong> file for{" "}
          <strong>{countryIso}</strong>.
        </p>

        <div className="border border-dashed border-gray-300 p-4 rounded-lg mb-3 text-center">
          <input
            type="file"
            accept=".geojson,.json,.zip"
            id="gis-file"
            className="hidden"
            onChange={handleFileChange}
          />
          <label htmlFor="gis-file" className="cursor-pointer text-[#640811] flex flex-col items-center gap-2">
            <UploadCloud className="w-6 h-6" />
            {file ? <span>{file.name}</span> : <span>Select file...</span>}
          </label>
        </div>

        {progressMsg && <p className="text-xs text-gray-500 mb-2">{progressMsg}</p>}

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

"use client";

import { useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";

interface UploadGISModalProps {
  open: boolean;
  onClose: () => void;
  countryIso: string;
  onUploaded: () => void;
}

export default function UploadGISModal({
  open,
  onClose,
  countryIso,
  onUploaded,
}: UploadGISModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<number>(0);
  const [message, setMessage] = useState<string>("");

  if (!open) return null;

  const reset = () => {
    setFile(null);
    setProgress(0);
    setMessage("");
    setUploading(false);
  };

  // Direct upload to Supabase Storage (recommended).
  // Writes to "gis_raw/phl/phl_adm0_fixed.json" when the filename looks like ADM0.
  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setProgress(5);
    setMessage("Preparing upload…");

    try {
      const isoUpper = countryIso.toUpperCase(); // "PHL"
      const isoLower = countryIso.toLowerCase(); // "phl"

      // Decide target path — for ADM0 we standardize the filename so the map can always find it.
      const isAdm0 =
        /adm0/i.test(file.name) ||
        (file.name.toLowerCase().includes("adm") && file.name.includes("0"));

      const targetPath = isAdm0
        ? `${isoLower}/${isoLower}_adm0_fixed.json`
        : `${isoLower}/${file.name}`;

      setProgress(20);
      setMessage(`Uploading to storage…\n${targetPath}`);

      // 1) Upload (or overwrite) to the public bucket
      const { error: upErr } = await supabase.storage
        .from("gis_raw")
        .upload(targetPath, file, {
          upsert: true,
          contentType: file.type || "application/octet-stream",
        });

      if (upErr) throw upErr;

      setProgress(65);
      setMessage("Registering layer in database…");

      // 2) Upsert into gis_layers so the page lists it
      const layerName = targetPath.split("/").pop() || file.name;

      const source = {
        bucket: "gis_raw",
        path: targetPath, // the page reads from .source.path
        // Optional public URL (not needed for download, but nice to keep)
        url: supabase.storage.from("gis_raw").getPublicUrl(targetPath).data.publicUrl,
      };

      const { error: dbErr } = await supabase
        .from("gis_layers")
        .upsert(
          {
            country_iso: isoUpper, // the page queries with uppercase
            layer_name: layerName,
            admin_level: isAdm0 ? "ADM0" : null, // set if you know it
            source,
          },
          { onConflict: "country_iso,layer_name" } // avoid duplicates on repeated uploads
        );

      if (dbErr) throw dbErr;

      setProgress(100);
      setMessage("✅ Upload complete!");
      onUploaded();
      setTimeout(() => {
        reset();
        onClose();
      }, 900);
    } catch (err: any) {
      console.error("❌ Upload error:", err);
      setMessage(`❌ ${err.message || "Upload failed"}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[2000]">
      <div className="bg-white w-full max-w-md rounded-md shadow-lg p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-800">Upload GIS Dataset</h2>
        <p className="text-sm text-gray-600">
          Upload a ZIP, GEOJSON, or JSON for <b>{countryIso.toUpperCase()}</b>.
        </p>

        <input
          type="file"
          accept=".zip,.json,.geojson"
          onChange={e => setFile(e.target.files?.[0] || null)}
          disabled={uploading}
          className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
        />

        {progress > 0 && (
          <div className="w-full bg-gray-200 rounded h-2 overflow-hidden">
            <div className="bg-[#640811] h-2 transition-all" style={{ width: `${progress}%` }} />
          </div>
        )}

        {message && <p className="text-sm text-gray-700 whitespace-pre-wrap">{message}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={() => {
              reset();
              onClose();
            }}
            disabled={uploading}
            className="px-4 py-1.5 rounded bg-gray-200 hover:bg-gray-300 text-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={!file || uploading}
            className="px-4 py-1.5 rounded bg-[#640811] text-white text-sm hover:opacity-90 disabled:opacity-60"
          >
            {uploading ? "Uploading…" : "Upload"}
          </button>
        </div>
      </div>
    </div>
  );
}

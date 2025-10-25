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
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("");

  if (!open) return null;

  const reset = () => {
    setFile(null);
    setProgress(0);
    setMessage("");
    setUploading(false);
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setProgress(5);
    setMessage("Preparing upload...");

    try {
      // ────────────────────────────────
      // 1️⃣ Determine file format + ADM level
      // ────────────────────────────────
      const ext = file.name.split(".").pop()?.toLowerCase();
      const format =
        ext === "geojson" || ext === "json"
          ? "geojson"
          : ext === "zip"
          ? "zip"
          : "unknown";

      if (format === "unknown") {
        throw new Error("Unsupported file type. Please upload .geojson, .json, or .zip");
      }

      const admMatch = file.name.toLowerCase().match(/adm(\d)/);
      const adminLevel = admMatch
        ? `ADM${admMatch[1]}`
        : "ADM0"; // fallback if pattern not found

      // ────────────────────────────────
      // 2️⃣ Upload to Supabase Storage
      // ────────────────────────────────
      const bucket = "gis_raw";
      const isoUpper = countryIso.toUpperCase();
      const isoLower = countryIso.toLowerCase();
      const objectKey = `${isoUpper}/${crypto.randomUUID()}/${file.name}`;

      setProgress(20);
      setMessage(`Uploading to storage path:\n${objectKey}`);

      const { error: uploadErr } = await supabase.storage
        .from(bucket)
        .upload(objectKey, file, {
          contentType:
            file.type ||
            (format === "geojson"
              ? "application/geo+json"
              : "application/zip"),
          upsert: false,
        });

      if (uploadErr) throw uploadErr;

      setProgress(65);
      setMessage("Registering layer in database...");

      // ────────────────────────────────
      // 3️⃣ Create public URL + DB entry
      // ────────────────────────────────
      const { data: pub } = supabase.storage.from(bucket).getPublicUrl(objectKey);
      const publicUrl = pub?.publicUrl ?? null;

      const layerName = file.name;
      const source = { bucket, path: objectKey, url: publicUrl };

      const { error: insertErr } = await supabase.from("gis_layers").insert({
        country_iso: isoUpper,
        layer_name: layerName,
        admin_level: adminLevel,
        format,
        feature_count: null,
        avg_area_sqkm: null,
        source,
      });

      if (insertErr) throw insertErr;

      setProgress(85);
      setMessage("Recomputing layer metrics...");

      // Optional: trigger Supabase function if available
      await supabase.functions.invoke("compute-gis-metrics", {
        body: { country_iso: isoUpper },
      });

      setProgress(100);
      setMessage("✅ Upload complete!");
      onUploaded();

      setTimeout(() => {
        reset();
        onClose();
      }, 1200);
    } catch (err: any) {
      console.error("❌ Upload error:", err);
      setMessage(`❌ ${err.message || "Upload failed"}`);
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[2000]">
      <div className="bg-white w-full max-w-md rounded-md shadow-lg p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-800">Upload GIS Dataset</h2>
        <p className="text-sm text-gray-600">
          Upload a <b>.zip</b>, <b>.json</b>, or <b>.geojson</b> file for{" "}
          <b>{countryIso.toUpperCase()}</b>.
        </p>

        <input
          type="file"
          accept=".zip,.json,.geojson"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          disabled={uploading}
          className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
        />

        {progress > 0 && (
          <div className="w-full bg-gray-200 rounded h-2 overflow-hidden">
            <div
              className="bg-[#640811] h-2 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        {message && (
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{message}</p>
        )}

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
            {uploading ? "Uploading..." : "Upload"}
          </button>
        </div>
      </div>
    </div>
  );
}

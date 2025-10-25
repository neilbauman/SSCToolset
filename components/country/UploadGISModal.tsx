"use client";

import { useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";

interface UploadGISModalProps {
  open: boolean;
  onClose: () => void;
  countryIso: string;
  onUploaded: () => void;
}

const ADMIN_LEVELS = ["ADM0", "ADM1", "ADM2", "ADM3", "ADM4", "ADM5"];

export default function UploadGISModal({
  open,
  onClose,
  countryIso,
  onUploaded,
}: UploadGISModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [adminLevel, setAdminLevel] = useState("ADM0");
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

  const handleFileSelect = (selectedFile: File | null) => {
    setFile(selectedFile);
    if (!selectedFile) return;

    // Try to auto-detect admin level
    const admMatch = selectedFile.name.toLowerCase().match(/adm(\d)/);
    if (admMatch) {
      const detected = `ADM${admMatch[1]}`;
      setAdminLevel(detected);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setProgress(10);
    setMessage("Uploading to Supabase Storage...");

    try {
      // Determine format
      const ext = file.name.split(".").pop()?.toLowerCase();
      const format =
        ext === "geojson" || ext === "json"
          ? "geojson"
          : ext === "zip"
          ? "zip"
          : "unknown";
      if (format === "unknown") throw new Error("Unsupported file type");

      const bucket = "gis_raw";
      const isoUpper = countryIso.toUpperCase();
      const path = `${isoUpper}/${crypto.randomUUID()}/${file.name}`;

      const { error: uploadErr } = await supabase.storage
        .from(bucket)
        .upload(path, file, {
          contentType:
            file.type ||
            (format === "geojson"
              ? "application/geo+json"
              : "application/zip"),
          upsert: false,
        });

      if (uploadErr) throw uploadErr;
      setProgress(60);

      const { data: pub } = supabase.storage.from(bucket).getPublicUrl(path);
      const publicUrl = pub?.publicUrl || null;

      const { error: insertErr } = await supabase.from("gis_layers").insert({
        country_iso: isoUpper,
        layer_name: file.name,
        admin_level: adminLevel,
        format,
        feature_count: null,
        avg_area_sqkm: null,
        source: { bucket, path, url: publicUrl },
      });

      if (insertErr) throw insertErr;

      setProgress(90);
      setMessage("Computing layer metrics...");

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

        {/* File Input */}
        <input
          type="file"
          accept=".zip,.json,.geojson"
          onChange={(e) => handleFileSelect(e.target.files?.[0] || null)}
          disabled={uploading}
          className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
        />

        {/* Admin level dropdown */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">Admin Level</label>
          <select
            value={adminLevel}
            onChange={(e) => setAdminLevel(e.target.value)}
            disabled={uploading}
            className="border border-gray-300 rounded px-2 py-1 text-sm"
          >
            {ADMIN_LEVELS.map((adm) => (
              <option key={adm} value={adm}>
                {adm}
              </option>
            ))}
          </select>
        </div>

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

        {/* Action buttons */}
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

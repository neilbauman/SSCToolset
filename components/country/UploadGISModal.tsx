// components/country/UploadGISModal.tsx
"use client";

import { useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";

export default function UploadGISModal({ open, onClose, countryIso }: {
  open: boolean;
  onClose: () => void;
  countryIso: string;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [versionId, setVersionId] = useState<string>("");

  if (!open) return null;

  async function handleUpload() {
    try {
      if (!file) return alert("Please select a file");
      if (!countryIso) return alert("Missing country ISO");

      setUploading(true);
      setMessage("Requesting upload URL...");

      // Step 1: Request presigned upload URL
      const res1 = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL}/upload-gis-large`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bucket: "gis_raw",
          country_iso: countryIso,
          filename: file.name,
        }),
      });
      const data1 = await res1.json();
      if (!data1.ok) throw new Error(data1.error || "Failed to create upload URL");

      // Step 2: Upload file directly to Storage
      setMessage("Uploading file...");
      const upload = await fetch(data1.uploadUrl, {
        method: "PUT",
        body: file,
      });

      if (!upload.ok) throw new Error("Upload failed");

      setProgress(100);
      setMessage("Registering GIS dataset...");

      // Step 3: Register GIS layer metadata and trigger compute-gis-metrics
      const res2 = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL}/convert-gis`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bucket: "gis_raw",
          path: data1.path,
          country_iso: countryIso,
          version_id: versionId || crypto.randomUUID(),
        }),
      });
      const data2 = await res2.json();
      if (!data2.ok) throw new Error(data2.error || "convert-gis failed");

      setMessage("✅ GIS dataset uploaded and registered successfully!");
    } catch (err: any) {
      console.error(err);
      setMessage(`❌ ${err.message}`);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="bg-white w-full max-w-lg rounded-xl shadow-lg p-5 text-sm">
        <h2 className="text-lg font-semibold text-[#640811] mb-3">
          Upload GIS Dataset
        </h2>

        <div className="space-y-3">
          <div>
            <label className="block font-medium mb-1">Country ISO</label>
            <input
              value={countryIso}
              readOnly
              className="border rounded w-full p-2 bg-gray-50 text-gray-700"
            />
          </div>

          <div>
            <label className="block font-medium mb-1">Dataset Version ID (optional)</label>
            <input
              placeholder="Auto-generated if empty"
              value={versionId}
              onChange={(e) => setVersionId(e.target.value)}
              className="border rounded w-full p-2"
            />
          </div>

          <div>
            <label className="block font-medium mb-1">Select GIS File (.zip or .geojson)</label>
            <input
              type="file"
              accept=".zip,.geojson"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="block w-full border rounded p-2"
            />
          </div>

          {uploading && (
            <div className="bg-gray-200 rounded-full h-2 overflow-hidden">
              <div
                className="bg-[#640811] h-2 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}

          {message && (
            <div
              className={`text-xs mt-2 ${
                message.startsWith("✅") ? "text-green-700" : message.startsWith("❌") ? "text-red-700" : "text-gray-700"
              }`}
            >
              {message}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={onClose}
            disabled={uploading}
            className="border rounded px-3 py-1 text-gray-700 hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={uploading}
            className="bg-[#640811] text-white rounded px-4 py-1 hover:opacity-90"
          >
            {uploading ? "Uploading..." : "Upload"}
          </button>
        </div>
      </div>
    </div>
  );
}

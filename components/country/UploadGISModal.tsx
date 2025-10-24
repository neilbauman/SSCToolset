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

  /** ───────────────────────────────────────────────
   * Handle file upload via 3-step API flow
   * sign-upload → upload-file → register-upload
   * ───────────────────────────────────────────────
   */
  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setProgress(5);
    setMessage("Preparing upload...");

    try {
      // Step 1️⃣ – request signed upload info
      const signRes = await fetch("/api/sign-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type,
        }),
      });

      const signData = await signRes.json();
      if (!signRes.ok) throw new Error(signData.error || "Sign failed");

      const { uploadUrl, uploadPath } = signData;
      setProgress(20);
      setMessage("Uploading to Supabase...");

      // Step 2️⃣ – upload the actual file (streamed)
      const uploadRes = await fetch(uploadUrl, {
  method: "PUT",
  headers: { "Content-Type": file.type || "application/octet-stream" },
  body: file,
});

      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) throw new Error(uploadData.error || "Upload failed");

      setProgress(70);
      setMessage("Registering in database...");

      // Step 3️⃣ – register layer in DB and queue
      const registerRes = await fetch("/api/register-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          country_iso: countryIso,
          filename: file.name,
          path: uploadPath,
        }),
      });

      const registerData = await registerRes.json();
      if (!registerRes.ok) throw new Error(registerData.error || "Registration failed");

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
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white w-full max-w-md rounded-md shadow-lg p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-800">Upload GIS Dataset</h2>
        <p className="text-sm text-gray-600">
          Upload a ZIP, GEOJSON, or GDB file for <b>{countryIso}</b>.
        </p>

        <input
          type="file"
          accept=".zip,.json,.geojson,.gdb"
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

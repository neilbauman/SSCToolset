"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { toast } from "sonner";

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFile(e.target.files?.[0] || null);
  };

  const handleUpload = async () => {
    if (!file) return toast.error("Please choose a file first.");
    setUploading(true);
    setProgress(0);

    try {
      // 1️⃣ Request signed upload URL from the backend
      const signRes = await fetch("/api/sign-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type || "application/octet-stream",
        }),
      });

      if (!signRes.ok) throw new Error("Failed to get signed upload URL.");
      const { url, path } = await signRes.json();
      if (!url) throw new Error("Signed URL missing from response.");

      // 2️⃣ Upload file directly to Supabase Storage
      await uploadFileStream(file, url, (percent) => setProgress(percent));

      // 3️⃣ Notify backend to register + queue
      const regRes = await fetch("/api/register-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          country_iso: countryIso,
          filename: file.name,
          path,
        }),
      });

      if (!regRes.ok) throw new Error("Failed to register uploaded dataset.");

      toast.success("✅ Upload complete and queued for processing!");
      onUploaded();
      onClose();
    } catch (err: any) {
      console.error("❌ Upload error:", err);
      toast.error(err.message || "Upload failed");
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  // ✅ Helper to stream upload with progress feedback
  const uploadFileStream = async (
    file: File,
    signedUrl: string,
    onProgress: (percent: number) => void
  ) => {
    return new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("PUT", signedUrl, true);
      xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");

      xhr.upload.onprogress = (evt) => {
        if (evt.lengthComputable) {
          const percent = Math.round((evt.loaded / evt.total) * 100);
          onProgress(percent);
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) resolve();
        else reject(new Error(`Upload failed with status ${xhr.status}`));
      };

      xhr.onerror = () => reject(new Error("Network error during upload"));
      xhr.send(file);
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Upload GIS Dataset</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <input
            type="file"
            accept=".zip,.shp,.gdb,.geojson"
            onChange={handleFileChange}
            disabled={uploading}
            className="block w-full text-sm text-gray-700 border rounded-md p-2"
          />

          {file && (
            <div className="text-sm text-gray-600 break-words">
              {file.name} ({(file.size / 1024 / 1024).toFixed(1)} MB)
            </div>
          )}

          {uploading && (
            <div className="w-full bg-gray-200 rounded-full h-2.5 mb-2">
              <div
                className="bg-[#640811] h-2.5 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded-md border text-gray-600 hover:bg-gray-50"
              disabled={uploading}
            >
              Cancel
            </button>
            <button
              onClick={handleUpload}
              disabled={!file || uploading}
              className={`px-4 py-1.5 rounded-md text-white ${
                uploading ? "bg-gray-400" : "bg-[#640811] hover:bg-[#8b0f1c]"
              }`}
            >
              {uploading ? `Uploading ${progress}%` : "Upload"}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

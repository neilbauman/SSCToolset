"use client";

import { useState } from "react";
import { X, Upload, Loader2 } from "lucide-react";

interface UploadGISModalProps {
  open: boolean;
  onClose: () => void;
  countryIso: string;
  onUploaded: () => void;
}

/**
 * UploadGISModal
 * - Streams large files (>1 GB) via /api/proxy-upload using multipart/form-data
 * - Shows upload progress and handles backend responses cleanly
 */
export default function UploadGISModal({
  open,
  onClose,
  countryIso,
  onUploaded,
}: UploadGISModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const handleUpload = async () => {
    if (!file) {
      setError("Please select a file to upload.");
      return;
    }

    setUploading(true);
    setError(null);
    setMessage(null);
    setProgress(0);

    try {
      // Build multipart form payload
      const formData = new FormData();
      formData.append("file", file);
      formData.append("country_iso", countryIso);

      // Use XMLHttpRequest for progress tracking (Fetch lacks it)
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", "/api/proxy-upload", true);

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100);
            setProgress(percent);
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            const res = JSON.parse(xhr.responseText);
            setMessage(res.message || "Upload completed.");
            resolve();
          } else {
            const err = JSON.parse(xhr.responseText);
            reject(new Error(err.error || "Upload failed"));
          }
        };

        xhr.onerror = () => reject(new Error("Network error"));
        xhr.send(formData);
      });

      setTimeout(() => {
        onUploaded();
        onClose();
      }, 1500);
    } catch (err: any) {
      console.error("❌ Upload failed:", err);
      setError(err.message || "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded-lg shadow-lg p-6 w-[420px] relative">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Upload GIS Dataset</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* File Input */}
        <input
          type="file"
          accept=".zip,.geojson,.json,.gpkg,.gdb"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
          disabled={uploading}
        />

        {file && (
          <p className="text-xs text-gray-600 mt-2 truncate">
            {file.name} ({(file.size / 1024 / 1024).toFixed(1)} MB)
          </p>
        )}

        {/* Progress */}
        {uploading && (
          <div className="mt-4">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-[#640811] h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>Uploading...</span>
              <span>{progress}%</span>
            </div>
          </div>
        )}

        {/* Messages */}
        {message && (
          <p className="mt-3 text-green-700 bg-green-100 px-2 py-1 rounded text-sm">
            {message}
          </p>
        )}
        {error && (
          <p className="mt-3 text-red-700 bg-red-100 px-2 py-1 rounded text-sm">
            {error}
          </p>
        )}

        {/* Actions */}
        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded bg-gray-100 hover:bg-gray-200 text-gray-700"
            disabled={uploading}
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={!file || uploading}
            className="flex items-center gap-2 px-4 py-2 text-sm rounded bg-[#640811] text-white hover:opacity-90 disabled:opacity-50"
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Uploading
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" /> Upload
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

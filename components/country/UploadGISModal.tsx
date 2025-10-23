"use client";

import { useState } from "react";
import { Loader2, UploadCloud } from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
  countryIso: string;
  // Pass the active version id if you have one; omit/undefined for dev mode
  datasetVersionId?: string;
  onUploaded?: () => void;
};

export default function UploadGISModal({
  open,
  onClose,
  countryIso,
  datasetVersionId,
  onUploaded,
}: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progressMsg, setProgressMsg] = useState("");

  if (!open) return null;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) setFile(e.target.files[0]);
  };

  const handleUpload = async () => {
    if (!file) return alert("Please select a GeoJSON or ZIP file.");

    try {
      setUploading(true);
      setProgressMsg("Uploading via Edge Function…");

      // Build storage path: e.g. PHL/filename.geojson
      const path = `${countryIso}/${file.name}`;

      // IMPORTANT: Use fetch directly for FormData (supabase-js invokes JSON)
      const url = `${supabaseUrl}/functions/v1/convert-gis`;

      const fd = new FormData();
      fd.append("file", file);
      fd.append("country_iso", countryIso);
      // forward version id only if you have a real UUID; otherwise omit (edge handles dev-mode)
      if (datasetVersionId) fd.append("version_id", datasetVersionId);
      fd.append("path", path);

      const res = await fetch(url, {
        method: "POST",
        body: fd,
        // DO NOT set Content-Type manually; the browser sets the multipart boundary.
        headers: {
          // Supabase Functions require auth headers from the browser
          apikey: supabaseAnon,
          Authorization: `Bearer ${supabaseAnon}`,
        },
      });

      if (!res.ok) {
        const t = await res.text().catch(() => "");
        throw new Error(
          `Edge Function returned ${res.status}. ${t || "No body"}`
        );
      }

      const json = (await res.json()) as { ok: boolean; message?: string };
      setProgressMsg(json.message || "Uploaded.");
      alert("✅ GIS dataset uploaded successfully via Edge Function!");

      onUploaded?.();
      onClose();
    } catch (err: any) {
      console.error("Upload failed:", err);
      alert(`Upload failed: ${err.message || err}`);
    } finally {
      setUploading(false);
      setProgressMsg("");
      setFile(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white w-[90%] max-w-md rounded-lg p-6 shadow-lg text-sm">
        <h2 className="text-lg font-semibold mb-2 text-[#640811]">
          Upload GIS Dataset
        </h2>
        <p className="text-gray-600 mb-4">
          Upload a <strong>.geojson</strong> or <strong>.zip</strong> for{" "}
          <strong>{countryIso}</strong>. We’ll store it in{" "}
          <code>gis_raw</code> and auto-compute feature count.
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
              <span>Select file…</span>
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
            {uploading ? "Uploading…" : "Upload"}
          </button>
        </div>
      </div>
    </div>
  );
}

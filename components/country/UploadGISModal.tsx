"use client";

import { Dialog } from "@headlessui/react";
import { useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { Upload } from "lucide-react";

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);

    try {
      const text = await file.text();
      const rows = text
        .split("\n")
        .slice(1)
        .filter((line) => line.trim().length > 0)
        .map((line) => {
          const [layer_name, format, feature_count, crs, dataset_date, source] = line.split(",");
          return {
            layer_name: layer_name?.trim(),
            format: format?.trim(),
            feature_count: feature_count ? parseInt(feature_count.trim(), 10) : 0,
            crs: crs?.trim(),
            dataset_date: dataset_date?.trim() || null,
            source: source?.trim() || null,
          };
        });

      // 1. Create a dataset version
      const { data: version, error: versionError } = await supabase
        .from("gis_dataset_versions")
        .insert([
          {
            country_iso: countryIso,
            title: `GIS Upload ${new Date().toISOString().slice(0, 10)}`,
            year: new Date().getFullYear(),
            dataset_date: rows[0]?.dataset_date || new Date().toISOString(),
            source: rows[0]?.source || "Uploaded CSV",
          },
        ])
        .select()
        .single();

      if (versionError) throw versionError;

      // 2. Insert GIS layers linked to this version
      const { error: insertError } = await supabase.from("gis_layers").insert(
        rows.map((r) => ({
          ...r,
          country_iso: countryIso,
          dataset_version_id: version.id,
        }))
      );

      if (insertError) throw insertError;

      onUploaded();
      onClose();
    } catch (err: any) {
      console.error("GIS upload error:", err);
      setError(err.message || "Upload failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center"
    >
      <Dialog.Overlay className="fixed inset-0 bg-black bg-opacity-30" />

      <div className="bg-white rounded-lg p-6 w-full max-w-lg shadow-lg relative z-10">
        <Dialog.Title className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Upload className="w-5 h-5 text-[color:var(--gsc-red)]" />
          Upload GIS Dataset
        </Dialog.Title>

        <p className="text-sm text-gray-600 mb-3">
          File must include: <code>layer_name</code>, <code>format</code>,{" "}
          <code>feature_count</code>, <code>crs</code>,{" "}
          <code>dataset_date</code>, <code>source</code>.
        </p>

        <input
          type="file"
          accept=".csv"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="mb-4"
        />

        {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300 text-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={!file || loading}
            className="px-3 py-1 rounded bg-[color:var(--gsc-red)] text-white hover:opacity-90 text-sm"
          >
            {loading ? "Uploading..." : "Upload & Save"}
          </button>
        </div>
      </div>
    </Dialog>
  );
}

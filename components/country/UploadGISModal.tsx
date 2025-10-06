"use client";

import { useEffect, useMemo, useState } from "react";
import Modal from "@/components/ui/Modal";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";

/**
 * UploadGISModal
 * Uploads a new GIS layer for a dataset version.
 * CRS is now automatically set to EPSG:4326 (WGS 84) for all uploads.
 */

type Props = {
  open: boolean;
  onClose: () => void;
  countryIso: string;
  datasetVersionId: string;
  onUploaded?: () => void;
};

const LEVELS = ["ADM0", "ADM1", "ADM2", "ADM3", "ADM4", "ADM5"] as const;

export default function UploadGISModal({
  open,
  onClose,
  countryIso,
  datasetVersionId,
  onUploaded,
}: Props) {
  const [adminLevel, setAdminLevel] = useState<(typeof LEVELS)[number]>("ADM1");
  const [layerName, setLayerName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset modal state when closed
  useEffect(() => {
    if (!open) {
      setAdminLevel("ADM1");
      setLayerName("");
      setFile(null);
      setBusy(false);
      setError(null);
    }
  }, [open]);

  const disabled = useMemo(() => !layerName || !file || busy, [layerName, file, busy]);

  const handleSubmit = async () => {
    try {
      setBusy(true);
      setError(null);
      if (!file) throw new Error("Please choose a file to upload.");

      // Upload to Supabase Storage
      const storagePath = `${countryIso}/gis/${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage
        .from("gis_raw")
        .upload(storagePath, file, { upsert: true });
      if (upErr) throw upErr;

      // Insert metadata row
      const payload = {
        dataset_version_id: datasetVersionId,
        country_iso: countryIso,
        admin_level: adminLevel,
        storage_path: storagePath,
        crs: "EPSG:4326", // ✅ standardized CRS
        source: {
          name: layerName,
          originalFilename: file.name,
          mimeType: file.type,
          size: file.size,
          bucket: "gis_raw",
          path: storagePath,
        },
      };

      const { error: insErr } = await supabase.from("gis_layers").insert(payload);
      if (insErr) throw insErr;

      onUploaded?.();
      onClose();
    } catch (e: any) {
      console.error(e);
      setError(e?.message || "Failed to upload layer.");
    } finally {
      setBusy(false);
    }
  };

  if (!open) return null;

  return (
    <Modal open={open} onClose={onClose}>
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Add GIS Layer</h3>
        {error && (
          <div className="text-sm text-red-700 bg-red-50 border border-red-200 p-2 rounded">
            {error}
          </div>
        )}

        {/* Basic metadata fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="text-sm">
            <span className="block mb-1 font-medium">Admin Level</span>
            <select
              className="w-full border rounded px-2 py-1 text-sm"
              value={adminLevel}
              onChange={(e) => setAdminLevel(e.target.value as any)}
            >
              {LEVELS.map((lvl) => (
                <option key={lvl} value={lvl}>
                  {lvl}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm">
            <span className="block mb-1 font-medium">Layer Name *</span>
            <input
              className="w-full border rounded px-2 py-1 text-sm"
              value={layerName}
              onChange={(e) => setLayerName(e.target.value)}
              placeholder="e.g., National Boundaries 2020"
            />
          </label>
        </div>

        {/* File input */}
        <label className="text-sm block">
          <span className="block mb-1 font-medium">File *</span>
          <input
            type="file"
            accept=".geojson,.json,.zip"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </label>

        {/* Note about CRS */}
        <p className="text-xs text-gray-500 italic">
          All layers are assumed to use WGS 84 (EPSG:4326).
        </p>

        {/* Action buttons */}
        <div className="flex justify-end gap-2 pt-4">
          <button className="border rounded px-3 py-1 text-sm" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button
            className="bg-[color:var(--gsc-red)] text-white rounded px-3 py-1 text-sm disabled:opacity-60"
            onClick={handleSubmit}
            disabled={disabled}
          >
            {busy ? "Uploading…" : "Upload"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import Modal from "@/components/ui/Modal";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";

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
      if (!file) throw new Error("Please choose a file.");

      // Generate structured path: <ISO>/<UUID>/<filename>
      const fullKey = `${countryIso}/${crypto.randomUUID()}/${file.name}`;

      // Upload file
      const { data: uploadData, error: upErr } = await supabase.storage
        .from("gis_raw")
        .upload(fullKey, file, { upsert: true });

      if (upErr) throw upErr;

      // Get actual returned path from Supabase
      const fullPath = uploadData?.path;
      if (!fullPath) throw new Error("Upload succeeded but no path returned from Supabase.");

      // Build metadata payload for DB
      const format = file.name.endsWith(".zip")
        ? "shapefile"
        : file.name.endsWith(".gpkg")
        ? "gpkg"
        : "geojson";

      const payload = {
        dataset_version_id: datasetVersionId,
        country_iso: countryIso,
        admin_level: adminLevel,
        layer_name: file.name,
        storage_path: fullPath,
        format,
        crs: "EPSG:4326", // default CRS
        source: {
          bucket: "gis_raw",
          path: fullPath,
          name: layerName,
          originalFilename: file.name,
          mimeType: file.type,
          size: file.size,
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
              placeholder="e.g., National Boundaries 2025"
            />
          </label>
        </div>

        <label className="text-sm block">
          <span className="block mb-1 font-medium">File *</span>
          <input
            type="file"
            accept=".geojson,.json,.zip,.gpkg"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </label>

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

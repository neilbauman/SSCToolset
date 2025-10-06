"use client";

import { useEffect, useMemo, useState } from "react";
import Modal from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { toast } from "sonner";

type Props = {
  open: boolean;
  onClose: () => void;
  countryIso: string;
  datasetVersionId?: string; // ✅ now optional
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
  const [title, setTitle] = useState("");
  const [year, setYear] = useState<number | "">("");
  const [source, setSource] = useState("");
  const [adminLevel, setAdminLevel] = useState<(typeof LEVELS)[number]>("ADM1");
  const [layerName, setLayerName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setTitle("");
      setYear("");
      setSource("");
      setLayerName("");
      setAdminLevel("ADM1");
      setFile(null);
      setError(null);
      setBusy(false);
    }
  }, [open]);

  const disabled = useMemo(() => busy || !file || (!datasetVersionId && (!title || !year)), [busy, file, title, year, datasetVersionId]);

  const handleSubmit = async () => {
    try {
      setBusy(true);
      setError(null);

      if (!file) throw new Error("Please choose a file to upload.");

      const storagePath = `${countryIso}/gis/${Date.now()}-${file.name}`;
      const { error: uploadErr } = await supabase.storage.from("gis_raw").upload(storagePath, file, { upsert: true });
      if (uploadErr) throw uploadErr;

      // --- Case 1: Uploading to an existing dataset version (add a layer)
      if (datasetVersionId) {
        const payload = {
          dataset_version_id: datasetVersionId,
          country_iso: countryIso,
          admin_level: adminLevel,
          storage_path: storagePath,
          source: {
            name: layerName || file.name,
            originalFilename: file.name,
            mimeType: file.type,
            size: file.size,
            bucket: "gis_raw",
            path: storagePath,
          },
        };
        const { error: insErr } = await supabase.from("gis_layers").insert(payload);
        if (insErr) throw insErr;
        toast.success("Layer uploaded successfully.");
      }

      // --- Case 2: Uploading a new GIS dataset version (no datasetVersionId)
      else {
        const versionPayload = {
          country_iso: countryIso,
          title,
          year: typeof year === "string" ? parseInt(year) : year,
          dataset_date: new Date().toISOString().split("T")[0],
          source,
          is_active: true,
        };
        const { data: versionData, error: versionErr } = await supabase
          .from("gis_dataset_versions")
          .insert(versionPayload)
          .select("id")
          .single();
        if (versionErr) throw versionErr;

        // Add initial layer
        const payload = {
          dataset_version_id: versionData.id,
          country_iso: countryIso,
          admin_level: adminLevel,
          storage_path: storagePath,
          source: {
            name: layerName || file.name,
            originalFilename: file.name,
            mimeType: file.type,
            size: file.size,
            bucket: "gis_raw",
            path: storagePath,
          },
        };
        const { error: insErr } = await supabase.from("gis_layers").insert(payload);
        if (insErr) throw insErr;

        toast.success("GIS dataset created successfully.");
      }

      onUploaded?.();
      onClose();
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Upload failed.");
      toast.error(e.message || "Upload failed.");
    } finally {
      setBusy(false);
    }
  };

  if (!open) return null;

  return (
    <Modal open={open} onClose={onClose}>
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">
          {datasetVersionId ? "Add GIS Layer" : "Upload GIS Dataset"}
        </h3>

        {error && (
          <div className="text-sm text-red-700 bg-red-50 border border-red-200 p-2 rounded">
            {error}
          </div>
        )}

        {!datasetVersionId && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="text-sm">
              <span className="block mb-1 font-medium">Title *</span>
              <input
                className="w-full border rounded px-2 py-1 text-sm"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Dataset title"
              />
            </label>
            <label className="text-sm">
              <span className="block mb-1 font-medium">Year *</span>
              <input
                type="number"
                className="w-full border rounded px-2 py-1 text-sm"
                value={year}
                onChange={(e) => setYear(e.target.value ? Number(e.target.value) : "")}
                placeholder="e.g. 2024"
              />
            </label>
            <label className="text-sm md:col-span-2">
              <span className="block mb-1 font-medium">Source</span>
              <input
                className="w-full border rounded px-2 py-1 text-sm"
                value={source}
                onChange={(e) => setSource(e.target.value)}
                placeholder="OCHA / HDX"
              />
            </label>
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
              placeholder="e.g., Administrative Boundaries"
            />
          </label>
        </div>

        <label className="text-sm block">
          <span className="block mb-1 font-medium">File *</span>
          <input
            type="file"
            accept=".geojson,.json,.zip"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </label>

        <div className="flex justify-end gap-2 pt-4">
          <Button onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={disabled}>
            {busy ? "Uploading…" : "Upload"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

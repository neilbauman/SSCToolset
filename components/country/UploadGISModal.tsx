"use client";

import { useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import ModalBase from "@/components/ui/ModalBase";
import { Upload, Check, AlertTriangle } from "lucide-react";

type Props = {
  countryIso: string;
  onClose: () => void;
  onUploaded?: () => void;
};

const LEVEL_OPTIONS = [
  { label: "Unassigned", value: "" },
  { label: "ADM1", value: "1" },
  { label: "ADM2", value: "2" },
  { label: "ADM3", value: "3" },
  { label: "ADM4", value: "4" },
  { label: "ADM5", value: "5" },
];

export default function UploadGISModal({ countryIso, onClose, onUploaded }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [layerName, setLayerName] = useState("");
  const [year, setYear] = useState<string>("");
  const [adminLevelInt, setAdminLevelInt] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const inferLevelFromFilename = (name: string) => {
    const m = name.toLowerCase().match(/adm([0-5])/);
    if (m && m[1]) return m[1];
    return "";
  };

  const onFileChange = (f: File | null) => {
    setFile(f);
    if (!layerName && f) setLayerName(f.name.replace(/\.[^.]+$/, ""));
    if (f) setAdminLevelInt((prev) => prev || inferLevelFromFilename(f.name));
  };

  const handleSubmit = async () => {
    if (!file) {
      setError("Please choose a file.");
      return;
    }
    setError(null);
    setIsUploading(true);
    try {
      // 1) Upload raw to gis_raw
      const path = `${countryIso}/${Date.now()}_${file.name}`;
      const { error: upErr } = await supabase.storage.from("gis_raw").upload(path, file, {
        upsert: false,
        cacheControl: "3600",
      });
      if (upErr) throw upErr;

      // 2) Create (or reuse) dataset version and mark it active (simple strategy: new version per upload)
      const title = `GIS Upload ${new Date().toISOString().slice(0, 10)}`;
      const { data: vRow, error: vErr } = await supabase
        .from("gis_dataset_versions")
        .insert([
          {
            country_iso: countryIso,
            title,
            year: year ? Number(year) : null,
            is_active: true,
          },
        ])
        .select("*")
        .single();
      if (vErr) throw vErr;

      // 3) Insert layer row with canonical admin_level_int and legacy admin_level string
      const n = adminLevelInt ? Number(adminLevelInt) : null;
      const legacy = n ? `ADM${n}` : null;

      const { error: lErr } = await supabase.from("gis_layers").insert([
        {
          country_iso: countryIso,
          layer_name: layerName || file.name,
          format: file.name.split(".").pop()?.toUpperCase() || "GEOJSON",
          feature_count: null,
          crs: null,
          source: { bucket: "gis_raw", path },
          dataset_id: vRow.dataset_id ?? null,
          dataset_version_id: vRow.id,
          admin_level: legacy, // keep writing legacy for compatibility
          admin_level_int: n,
          is_active: true,
        },
      ]);
      if (lErr) throw lErr;

      setDone(true);
      onUploaded?.();
    } catch (e: any) {
      setError(e.message ?? "Upload failed.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <ModalBase onClose={onClose}>
      <div className="relative z-[9999] w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl">
        <div className="mb-3 text-lg font-semibold">Upload GIS Layer</div>

        {error && (
          <div className="mb-3 inline-flex w-full items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-2 text-sm text-red-700">
            <AlertTriangle className="h-4 w-4" />
            {error}
          </div>
        )}

        <div className="grid gap-3">
          <div>
            <label className="text-sm font-medium">File</label>
            <input
              type="file"
              accept=".geojson,.json,.zip"
              className="mt-1 w-full rounded-lg border p-2"
              onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
            />
            <p className="mt-1 text-xs text-gray-500">
              Accepted: GeoJSON, zipped shapefile (.zip)
            </p>
          </div>

          <div>
            <label className="text-sm font-medium">Layer name</label>
            <input
              type="text"
              className="mt-1 w-full rounded-lg border p-2"
              value={layerName}
              onChange={(e) => setLayerName(e.target.value)}
              placeholder="e.g., Admin Boundaries ADM2"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">Admin Level</label>
              <select
                className="mt-1 w-full rounded-lg border p-2"
                value={adminLevelInt}
                onChange={(e) => setAdminLevelInt(e.target.value)}
              >
                {LEVEL_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500">Inferred from filename if possible.</p>
            </div>

            <div>
              <label className="text-sm font-medium">Year (optional)</label>
              <input
                type="number"
                className="mt-1 w-full rounded-lg border p-2"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                placeholder="2025"
              />
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50"
            disabled={isUploading}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isUploading || !file}
            className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-3 py-2 text-sm text-white hover:bg-red-700 disabled:opacity-60"
          >
            {isUploading ? (
              <>
                <Upload className="h-4 w-4 animate-pulse" />
                Uploading…
              </>
            ) : done ? (
              <>
                <Check className="h-4 w-4" />
                Done
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                Upload
              </>
            )}
          </button>
        </div>
      </div>
    </ModalBase>
  );
}

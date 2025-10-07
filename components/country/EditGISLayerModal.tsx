"use client";

import { useEffect, useMemo, useState } from "react";
import Modal from "@/components/ui/Modal";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import type { GISLayer } from "@/types/gis";

type Props = {
  open: boolean;
  onClose: () => void;
  layer: GISLayer;
  onSaved?: () => Promise<void> | void;
};

const LEVELS = ["ADM0", "ADM1", "ADM2", "ADM3", "ADM4", "ADM5"] as const;

export default function EditGISLayerModal({ open, onClose, layer, onSaved }: Props) {
  const [adminLevel, setAdminLevel] = useState(layer.admin_level ?? "ADM1");
  const [layerName, setLayerName] = useState(layer.layer_name ?? "");
  const [crs, setCrs] = useState(layer.crs ?? "EPSG:4326");
  const [format, setFormat] = useState(layer.format ?? "geojson");
  const [source, setSource] = useState<Record<string, any>>(layer.source ?? {});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && layer) {
      setAdminLevel(layer.admin_level ?? "ADM1");
      setLayerName(layer.layer_name ?? "");
      setCrs(layer.crs ?? "EPSG:4326");
      setFormat(layer.format ?? "geojson");
      setSource(layer.source ?? {});
      setError(null);
    }
  }, [open, layer]);

  const disabled = useMemo(() => !layerName || busy, [layerName, busy]);

  const handleSave = async () => {
    try {
      setBusy(true);
      setError(null);

      const updatedSource = {
        ...source,
        bucket: source.bucket ?? "gis_raw",
        path: source.path ?? layer.storage_path,
        name: layerName,
      };

      const { error: updateErr } = await supabase
        .from("gis_layers")
        .update({
          admin_level: adminLevel,
          layer_name: layerName,
          crs,
          format,
          source: updatedSource,
          updated_at: new Date().toISOString(),
        })
        .eq("id", layer.id);

      if (updateErr) throw updateErr;

      await onSaved?.();
      onClose();
    } catch (e: any) {
      console.error(e);
      setError(e?.message || "Failed to save layer updates.");
    } finally {
      setBusy(false);
    }
  };

  if (!open) return null;

  return (
    <Modal open={open} onClose={onClose}>
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Edit GIS Layer</h3>
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
              type="text"
              className="w-full border rounded px-2 py-1 text-sm"
              value={layerName}
              onChange={(e) => setLayerName(e.target.value)}
            />
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="text-sm">
            <span className="block mb-1 font-medium">CRS</span>
            <input
              type="text"
              className="w-full border rounded px-2 py-1 text-sm"
              value={crs}
              onChange={(e) => setCrs(e.target.value)}
              placeholder="e.g., EPSG:4326"
            />
          </label>

          <label className="text-sm">
            <span className="block mb-1 font-medium">Format</span>
            <select
              className="w-full border rounded px-2 py-1 text-sm"
              value={format}
              onChange={(e) => setFormat(e.target.value)}
            >
              <option value="geojson">GeoJSON</option>
              <option value="shapefile">Shapefile</option>
              <option value="gpkg">GPKG</option>
            </select>
          </label>
        </div>

        <label className="text-sm block">
          <span className="block mb-1 font-medium">Source Path</span>
          <input
            type="text"
            className="w-full border rounded px-2 py-1 text-sm text-gray-600 bg-gray-50"
            value={source?.path ?? layer.storage_path ?? ""}
            readOnly
          />
        </label>

        <div className="flex justify-end gap-2 pt-4">
          <button className="border rounded px-3 py-1 text-sm" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button
            className="bg-[color:var(--gsc-red)] text-white rounded px-3 py-1 text-sm disabled:opacity-60"
            onClick={handleSave}
            disabled={disabled}
          >
            {busy ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

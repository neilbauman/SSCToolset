"use client";

import { useEffect, useState } from "react";
import Modal from "@/components/ui/Modal";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import type { GISLayer } from "@/types";

type Props = {
  open: boolean;
  onClose: () => void;
  layer: GISLayer;
  onSaved?: () => Promise<void> | void;
};

/**
 * EditGISLayerModal
 * Allows renaming, updating metadata fields for an existing GIS layer.
 */
export default function EditGISLayerModal({ open, onClose, layer, onSaved }: Props) {
  const [layerName, setLayerName] = useState(layer.layer_name || "");
  const [adminLevel, setAdminLevel] = useState(layer.admin_level || "ADM1");
  const [format, setFormat] = useState(layer.format || "");
  const [crs, setCrs] = useState(layer.crs || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && layer) {
      setLayerName(layer.layer_name || "");
      setAdminLevel(layer.admin_level || "ADM1");
      setFormat(layer.format || "");
      setCrs(layer.crs || "");
      setError(null);
      setBusy(false);
    }
  }, [open, layer]);

  const handleSave = async () => {
    try {
      setBusy(true);
      setError(null);

      const { error: updateErr } = await supabase
        .from("gis_layers")
        .update({
          layer_name: layerName,
          admin_level: adminLevel,
          format,
          crs,
          updated_at: new Date().toISOString(),
        })
        .eq("id", layer.id);

      if (updateErr) throw updateErr;
      if (onSaved) await onSaved();
      onClose();
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Failed to save layer changes.");
    } finally {
      setBusy(false);
    }
  };

  if (!open) return null;

  return (
    <Modal open={open} onClose={onClose} title={`Edit Layer – ${layer.layer_name || "Untitled"}`}>
      <div className="space-y-4">
        {error && (
          <div className="text-sm text-red-700 bg-red-50 border border-red-200 p-2 rounded">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="text-sm">
            <span className="block mb-1 font-medium">Layer Name *</span>
            <input
              className="w-full border rounded px-2 py-1 text-sm"
              value={layerName}
              onChange={(e) => setLayerName(e.target.value)}
            />
          </label>

          <label className="text-sm">
            <span className="block mb-1 font-medium">Admin Level</span>
            <select
              className="w-full border rounded px-2 py-1 text-sm"
              value={adminLevel}
              onChange={(e) => setAdminLevel(e.target.value)}
            >
              {["ADM0", "ADM1", "ADM2", "ADM3", "ADM4", "ADM5"].map((lvl) => (
                <option key={lvl} value={lvl}>
                  {lvl}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm">
            <span className="block mb-1 font-medium">Format</span>
            <input
              className="w-full border rounded px-2 py-1 text-sm"
              value={format}
              onChange={(e) => setFormat(e.target.value)}
            />
          </label>

          <label className="text-sm">
            <span className="block mb-1 font-medium">CRS</span>
            <input
              className="w-full border rounded px-2 py-1 text-sm"
              value={crs}
              onChange={(e) => setCrs(e.target.value)}
            />
          </label>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <button className="border rounded px-3 py-1 text-sm" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button
            className="bg-[color:var(--gsc-red)] text-white rounded px-3 py-1 text-sm disabled:opacity-60"
            onClick={handleSave}
            disabled={busy || !layerName}
          >
            {busy ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

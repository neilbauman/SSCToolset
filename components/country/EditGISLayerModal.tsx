"use client";

import { useEffect, useMemo, useState } from "react";
import Modal from "@/components/ui/Modal";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import type { GISLayer } from "@/types";

type Props = {
  open: boolean;
  onClose: () => void;
  layer: GISLayer;
  onSaved?: () => Promise<void> | void;
};

const LEVELS = ["ADM0", "ADM1", "ADM2", "ADM3", "ADM4", "ADM5"] as const;

/**
 * EditGISLayerModal
 * Allows editing of layer metadata (name, admin level, source).
 * CRS is fixed as EPSG:4326 (not user-editable).
 */
export default function EditGISLayerModal({ open, onClose, layer, onSaved }: Props) {
  const [adminLevel, setAdminLevel] = useState<string>(layer.admin_level || "ADM1");
  const [layerName, setLayerName] = useState(layer.layer_name || "");
  const [sourceText, setSourceText] = useState<string>(() => {
    if (typeof layer.source === "string") return layer.source;
    if (layer.source && typeof layer.source === "object" && "name" in layer.source)
      return (layer.source as any).name;
    return "";
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (open && layer) {
      setAdminLevel(layer.admin_level || "ADM1");
      setLayerName(layer.layer_name || "");
      if (typeof layer.source === "string") setSourceText(layer.source);
      else if (layer.source && typeof layer.source === "object" && "name" in layer.source)
        setSourceText((layer.source as any).name);
      else setSourceText("");
      setError(null);
      setBusy(false);
    }
  }, [open, layer]);

  const disabled = useMemo(() => !layerName || busy, [layerName, busy]);

  const handleSave = async () => {
    try {
      setBusy(true);
      setError(null);

      const payload = {
        admin_level: adminLevel,
        layer_name: layerName,
        source: sourceText || null,
        crs: "EPSG:4326",
        updated_at: new Date().toISOString(),
      };

      const { error: upErr } = await supabase
        .from("gis_layers")
        .update(payload)
        .eq("id", layer.id);

      if (upErr) throw upErr;

      if (onSaved) await onSaved();
      onClose();
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Failed to update layer metadata.");
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
              onChange={(e) => setAdminLevel(e.target.value)}
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
              placeholder="e.g., Administrative Boundaries 2024"
            />
          </label>
        </div>

        <label className="text-sm block">
          <span className="block mb-1 font-medium">Source</span>
          <input
            type="text"
            className="w-full border rounded px-2 py-1 text-sm"
            value={sourceText}
            onChange={(e) => setSourceText(e.target.value)}
            placeholder="e.g., OCHA, UNHCR, Government Survey"
          />
        </label>

        <div className="text-xs text-gray-500 mt-1">
          CRS: <span className="font-medium">EPSG:4326 (fixed)</span>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <button
            className="border rounded px-3 py-1 text-sm"
            onClick={onClose}
            disabled={busy}
          >
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

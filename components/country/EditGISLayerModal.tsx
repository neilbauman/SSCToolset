"use client";

import { useEffect, useState } from "react";
import Modal from "@/components/ui/Modal";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import type { GISLayer } from "@/types/gis";

interface Props {
  open: boolean;
  onClose: () => void;
  layer: GISLayer;
  onUpdated: () => void; // ✅ added this prop
}

export default function EditGISLayerModal({ open, onClose, layer, onUpdated }: Props) {
  const [adminLevel, setAdminLevel] = useState(layer.admin_level || "ADM1");
  const [layerName, setLayerName] = useState(layer.layer_name || "");
  const [crs, setCrs] = useState(layer.crs || "");
  const [format, setFormat] = useState(layer.format || "");
  const [source, setSource] = useState(layer.source || {});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setAdminLevel(layer.admin_level || "ADM1");
    setLayerName(layer.layer_name || "");
    setCrs(layer.crs || "");
    setFormat(layer.format || "");
    setSource(layer.source || {});
    setError(null);
  }, [open, layer]);

  const handleSave = async () => {
    setBusy(true);
    setError(null);
    try {
      const { error: updateErr } = await supabase
        .from("gis_layers")
        .update({
          admin_level: adminLevel,
          layer_name: layerName,
          crs,
          format,
          source,
          updated_at: new Date().toISOString(),
        })
        .eq("id", layer.id);

      if (updateErr) throw updateErr;
      onUpdated();
      onClose();
    } catch (err: any) {
      console.error("Error updating layer:", err);
      setError(err.message || "Failed to update layer.");
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
              value={adminLevel}
              onChange={(e) => setAdminLevel(e.target.value)}
              className="w-full border rounded px-2 py-1 text-sm"
            >
              {["ADM0", "ADM1", "ADM2", "ADM3", "ADM4", "ADM5"].map((lvl) => (
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
              value={layerName}
              onChange={(e) => setLayerName(e.target.value)}
              className="w-full border rounded px-2 py-1 text-sm"
            />
          </label>

          <label className="text-sm">
            <span className="block mb-1 font-medium">CRS</span>
            <input
              type="text"
              value={crs}
              onChange={(e) => setCrs(e.target.value)}
              placeholder="e.g., EPSG:4326"
              className="w-full border rounded px-2 py-1 text-sm"
            />
          </label>

          <label className="text-sm">
            <span className="block mb-1 font-medium">Format</span>
            <input
              type="text"
              value={format}
              onChange={(e) => setFormat(e.target.value)}
              placeholder="e.g., geojson"
              className="w-full border rounded px-2 py-1 text-sm"
            />
          </label>

          <label className="text-sm md:col-span-2">
            <span className="block mb-1 font-medium">Source Info (JSON)</span>
            <textarea
              value={JSON.stringify(source, null, 2)}
              onChange={(e) => {
                try {
                  setSource(JSON.parse(e.target.value));
                } catch {
                  // ignore invalid JSON while typing
                }
              }}
              rows={4}
              className="w-full border rounded px-2 py-1 text-sm font-mono"
            />
          </label>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <button
            onClick={onClose}
            className="border rounded px-3 py-1 text-sm"
            disabled={busy}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="bg-[color:var(--gsc-red)] text-white rounded px-3 py-1 text-sm disabled:opacity-60"
            disabled={busy}
          >
            {busy ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

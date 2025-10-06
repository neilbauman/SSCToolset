"use client";

import { useEffect, useMemo, useState } from "react";
import Modal from "@/components/ui/Modal";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";

type GISLayer = {
  id: string;
  admin_level: string | null;
  source?: any | null;
};

type Props = {
  open: boolean;
  onClose: () => void;
  layer: GISLayer;
  onSaved?: () => void;
};

const LEVELS = ["ADM0", "ADM1", "ADM2", "ADM3", "ADM4", "ADM5"] as const;

export default function EditGISLayerModal({ open, onClose, layer, onSaved }: Props) {
  const [adminLevel, setAdminLevel] = useState<string>(layer.admin_level || "ADM1");
  const [layerName, setLayerName] = useState<string>(layer?.source?.name || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setAdminLevel(layer.admin_level || "ADM1");
      setLayerName(layer?.source?.name || "");
      setBusy(false);
      setError(null);
    }
  }, [open, layer]);

  const disabled = useMemo(() => !layerName || busy, [layerName, busy]);

  const handleSave = async () => {
    try {
      setBusy(true);
      setError(null);

      const newSource = { ...(layer.source || {}), name: layerName };
      const { error: upErr } = await supabase
        .from("gis_layers")
        .update({ admin_level: adminLevel, source: newSource })
        .eq("id", layer.id);

      if (upErr) throw upErr;
      onSaved?.();
    } catch (e: any) {
      console.error(e);
      setError(e?.message || "Failed to save layer.");
    } finally {
      setBusy(false);
    }
  };

  if (!open) return null;

  return (
    <Modal open={open} onClose={onClose}>
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Edit GIS Layer</h3>
        {error && <div className="text-sm text-red-700 bg-red-50 border border-red-200 p-2 rounded">{error}</div>}

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
              className="w-full border rounded px-2 py-1 text-sm"
              value={layerName}
              onChange={(e) => setLayerName(e.target.value)}
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
            disabled={disabled}
          >
            {busy ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

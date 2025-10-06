"use client";

import { useEffect, useState } from "react";
import Modal from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { toast } from "sonner";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";

type GISLayer = {
  id: string;
  dataset_version_id: string | null;
  admin_level: string | null;
  storage_path?: string | null;
  source?: any | null;
  created_at?: string | null;
};

type Props = {
  open: boolean;
  onClose: () => void;
  layer: GISLayer;
  onSaved: () => Promise<void>;
};

export default function EditGISLayerModal({ open, onClose, layer, onSaved }: Props) {
  const [adminLevel, setAdminLevel] = useState(layer.admin_level || "");
  const [source, setSource] = useState(
    typeof layer.source === "string" ? layer.source : JSON.stringify(layer.source || {}, null, 2)
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setAdminLevel(layer.admin_level || "");
      setSource(typeof layer.source === "string" ? layer.source : JSON.stringify(layer.source || {}, null, 2));
      setError(null);
      setBusy(false);
    }
  }, [open, layer]);

  const handleSave = async () => {
    try {
      setBusy(true);
      setError(null);

      const parsedSource = (() => {
        try {
          return JSON.parse(source);
        } catch {
          return source;
        }
      })();

      const { error: updateErr } = await supabase
        .from("gis_layers")
        .update({
          admin_level: adminLevel || null,
          source: parsedSource || null,
        })
        .eq("id", layer.id);

      if (updateErr) throw updateErr;

      toast.success("Layer updated successfully.");
      await onSaved();
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to update layer.");
      toast.error(err.message || "Failed to update layer.");
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

        <label className="text-sm block">
          <span className="block mb-1 font-medium">Admin Level</span>
          <input
            type="text"
            className="w-full border rounded px-2 py-1 text-sm"
            value={adminLevel}
            onChange={(e) => setAdminLevel(e.target.value)}
            placeholder="e.g. ADM1"
          />
        </label>

        <label className="text-sm block">
          <span className="block mb-1 font-medium">Source (JSON or text)</span>
          <textarea
            className="w-full border rounded px-2 py-1 text-sm font-mono"
            rows={5}
            value={source}
            onChange={(e) => setSource(e.target.value)}
          />
        </label>

        <div className="flex justify-end gap-2 pt-4">
          <Button onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={busy}>
            {busy ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

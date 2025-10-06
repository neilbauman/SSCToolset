"use client";

import { useState } from "react";
import ModalBase from "@/components/ui/ModalBase";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { Save, XCircle, AlertTriangle } from "lucide-react";

type GISLayer = {
  id: string;
  layer_name: string;
  admin_level?: string | null;
  admin_level_int?: number | null;
};

type Props = {
  layer: GISLayer;
  onClose: () => void;
  onSaved?: () => void;
};

const LEVEL_OPTIONS = [
  { label: "Unassigned", value: "" },
  { label: "ADM1", value: "1" },
  { label: "ADM2", value: "2" },
  { label: "ADM3", value: "3" },
  { label: "ADM4", value: "4" },
  { label: "ADM5", value: "5" },
];

export default function EditGISLayerModal({ layer, onClose, onSaved }: Props) {
  const [name, setName] = useState(layer.layer_name);
  const [adminLevelInt, setAdminLevelInt] = useState<string>(
    layer.admin_level_int ? String(layer.admin_level_int) : ""
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const n = adminLevelInt ? Number(adminLevelInt) : null;
      const legacy = n ? `ADM${n}` : null;

      const { error: upErr } = await supabase
        .from("gis_layers")
        .update({
          layer_name: name,
          admin_level_int: n,
          admin_level: legacy,
        })
        .eq("id", layer.id);

      if (upErr) throw upErr;
      onSaved?.();
    } catch (e: any) {
      setError(e.message ?? "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalBase onClose={onClose}>
      <div className="relative z-[9999] w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
        <div className="mb-3 text-lg font-semibold">Edit GIS Layer</div>

        {error && (
          <div className="mb-3 inline-flex w-full items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-2 text-sm text-red-700">
            <AlertTriangle className="h-4 w-4" />
            {error}
          </div>
        )}

        <div className="grid gap-3">
          <div>
            <label className="text-sm font-medium">Layer name</label>
            <input
              type="text"
              className="mt-1 w-full rounded-lg border p-2"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

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
            <p className="mt-1 text-xs text-gray-500">
              Stores <code>admin_level_int</code> (canonical). Also updates legacy <code>admin_level</code> label.
            </p>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-gray-50"
            disabled={saving}
          >
            <XCircle className="h-4 w-4" />
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-3 py-2 text-sm text-white hover:bg-red-700 disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
            Save
          </button>
        </div>
      </div>
    </ModalBase>
  );
}

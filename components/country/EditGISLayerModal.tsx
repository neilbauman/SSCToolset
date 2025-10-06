"use client";

import ModalBase from "@/components/ui/ModalBase";
import { useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";

type EditGISLayerModalProps = {
  layer: {
    id: string;
    layer_name: string;
    admin_level_int?: number | null;
    admin_level?: string | null;
    crs?: string | null;
    source?: any;
  };
  onClose: () => void;
  onSaved: () => void;
};

export default function EditGISLayerModal({
  layer,
  onClose,
  onSaved,
}: EditGISLayerModalProps) {
  const [layerName, setLayerName] = useState(layer.layer_name || "");
  const [adminLevel, setAdminLevel] = useState<number | "">(layer.admin_level_int ?? "");
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    const { error } = await supabase
      .from("gis_layers")
      .update({
        layer_name: layerName,
        admin_level_int: adminLevel === "" ? null : Number(adminLevel),
      })
      .eq("id", layer.id);

    setIsSaving(false);
    if (error) {
      console.error(error);
      return;
    }
    onSaved();
    onClose();
  };

  return (
    <ModalBase open={true} title="Edit GIS Layer" onClose={onClose}>
      <div className="relative z-[9999] w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
        <div className="mb-3 text-lg font-semibold">Edit GIS Layer</div>

        <label className="block mb-2 text-sm font-medium text-gray-700">
          Layer Name
        </label>
        <input
          type="text"
          className="mb-3 w-full rounded border px-3 py-2 text-sm"
          value={layerName}
          onChange={(e) => setLayerName(e.target.value)}
        />

        <label className="block mb-2 text-sm font-medium text-gray-700">
          Admin Level
        </label>
        <select
          className="mb-4 w-full rounded border px-3 py-2 text-sm"
          value={adminLevel}
          onChange={(e) =>
            setAdminLevel(e.target.value === "" ? "" : Number(e.target.value))
          }
        >
          <option value="">Unassigned</option>
          {[1, 2, 3, 4, 5].map((l) => (
            <option key={l} value={l}>
              ADM{l}
            </option>
          ))}
        </select>

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded border px-3 py-1.5 text-sm hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {isSaving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </ModalBase>
  );
}

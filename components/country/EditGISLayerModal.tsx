"use client";

import React, { useState } from "react";
import ModalBase from "@/components/ui/ModalBase";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";

type EditGISLayerModalProps = {
  open: boolean;
  onClose: () => void;
  layer: {
    id: string;
    layer_name: string;
    admin_level?: string | null;
    is_active: boolean;
  };
  onSaved: () => Promise<void> | void;
};

export default function EditGISLayerModal({
  open,
  onClose,
  layer,
  onSaved,
}: EditGISLayerModalProps) {
  const [adminLevel, setAdminLevel] = useState(layer.admin_level ?? "");
  const [isActive, setIsActive] = useState(layer.is_active);

  const handleSave = async () => {
    const { error } = await supabase
      .from("gis_layers")
      .update({ admin_level: adminLevel || null, is_active: isActive })
      .eq("id", layer.id);

    if (error) {
      console.error("Error updating GIS layer:", error);
      alert("Failed to save changes");
      return;
    }
    await onSaved();
    onClose();
  };

  if (!open) return null;

  return (
    <ModalBase open={open} onClose={onClose} title="Edit GIS Layer">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Layer Name</label>
          <input
            type="text"
            value={layer.layer_name}
            disabled
            className="w-full border rounded p-2 bg-gray-100 text-gray-600"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            Administrative Level
          </label>
          <select
            value={adminLevel}
            onChange={(e) => setAdminLevel(e.target.value)}
            className="w-full border rounded p-2"
          >
            <option value="">— Not assigned —</option>
            <option value="ADM0">ADM0 (Country)</option>
            <option value="ADM1">ADM1 (Region)</option>
            <option value="ADM2">ADM2 (Province)</option>
            <option value="ADM3">ADM3 (Municipality)</option>
            <option value="ADM4">ADM4 (Barangay)</option>
            <option value="ADM5">ADM5 (Sub-Local)</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <input
            id="active"
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="h-4 w-4"
          />
          <label htmlFor="active" className="text-sm">
            Active on map
          </label>
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded bg-gray-100 hover:bg-gray-200 text-gray-700"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm rounded bg-[color:var(--gsc-red)] text-white hover:opacity-90"
          >
            Save Changes
          </button>
        </div>
      </div>
    </ModalBase>
  );
}

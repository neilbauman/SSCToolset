"use client";
import { useEffect, useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { ChevronRight, ChevronDown, RefreshCcw, Edit2, Trash2 } from "lucide-react";
import IndicatorLinkModal from "./IndicatorLinkModal";
import Modal from "@/components/ui/Modal";

// ✅ Moved here so it’s available everywhere in this file
type EntityType = "pillar" | "theme" | "subtheme";
export type Entity = { id: string; name: string; description?: string; type: EntityType };

type Pillar = { id: string; name: string; description: string };
type Theme = { id: string; name: string; description: string; pillar_id: string };
type Subtheme = { id: string; name: string; description: string; theme_id: string };
type IndicatorLink = {
  pillar_id: string | null;
  theme_id: string | null;
  subtheme_id: string | null;
  indicator_catalogue?: { code: string; name: string } | null;
};
function EditEntityModal({
  entity,
  onClose,
  onSaved,
}: {
  entity: Entity;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(entity.name);
  const [description, setDescription] = useState(entity.description || "");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    const table = `${entity.type}_catalogue`;
    const { error } = await supabase
      .from(table)
      .update({ name, description })
      .eq("id", entity.id);
    setSaving(false);
    if (error) alert("Failed to update: " + error.message);
    else {
      onClose();
      onSaved();
    }
  }

  return (
    <Modal open={true} onClose={onClose} title={`Edit ${entity.type}`}>
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-600">Name</label>
          <input
            className="w-full border rounded px-2 py-1 text-sm"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600">Description</label>
          <textarea
            className="w-full border rounded px-2 py-1 text-sm"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded"
            disabled={saving}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-3 py-1.5 text-sm bg-[var(--gsc-blue)] text-white rounded"
            disabled={saving}
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
export default CataloguePage;

"use client";

import { useState } from "react";
import Modal from "@/components/ui/Modal";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
};

export default function AddPillarModal({ open, onClose, onSaved }: Props) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!name.trim()) {
      alert("Please enter a pillar name.");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("pillar_catalogue")
      .insert({
        name: name.trim(),
        description: description.trim() || null,
      });
    setSaving(false);

    if (error) {
      console.error("Add pillar failed:", error);
      alert("Failed to add pillar.");
      return;
    }

    onSaved();
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="Add Pillar" width="max-w-lg">
      <div className="space-y-3">
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">Name</label>
          <input
            className="w-full border rounded px-3 py-2 text-sm"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Preparedness & Response"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">Description</label>
          <textarea
            className="w-full border rounded px-3 py-2 text-sm"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional details…"
            rows={4}
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={onClose}
            className="px-3 py-2 text-sm rounded-md border"
            disabled={saving}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-3 py-2 text-sm rounded-md"
            style={{
              background: "var(--gsc-blue)",
              color: "white",
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? "Saving…" : "Save Pillar"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

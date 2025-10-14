// components/configuration/framework-catalogue/AddSubthemeModal.tsx
"use client";

import { useState } from "react";
import Modal from "@/components/ui/Modal";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";

type ThemeRef = { id: string; name: string };

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  theme: ThemeRef; // minimal shape; avoids importing types from CataloguePage
};

export default function AddSubthemeModal({ open, onClose, onSaved, theme }: Props) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState<string>("");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!name.trim()) {
      alert("Please enter a subtheme name.");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("subtheme_catalogue")
      .insert({
        theme_id: theme.id,
        name: name.trim(),
        description: description.trim() || null,
      });
    setSaving(false);
    if (error) {
      console.error("Add subtheme failed:", error);
      alert("Failed to add subtheme.");
      return;
    }
    onSaved();
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Add Subtheme • ${theme.name}`}
      width="max-w-lg"
    >
      <div className="space-y-3">
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">Name</label>
          <input
            className="w-full border rounded px-3 py-2 text-sm"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Accessibility standards"
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
            className="px-3 py-2 text-sm rounded-md border"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-3 py-2 text-sm rounded-md"
            style={{ background: "var(--gsc-blue)", color: "white", opacity: saving ? 0.7 : 1 }}
          >
            {saving ? "Saving…" : "Save Subtheme"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

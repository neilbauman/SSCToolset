"use client";

import { useEffect, useState } from "react";
import Modal from "@/components/ui/Modal";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";

type Theme = {
  id: string;
  pillar_id: string | null;
  name: string;
  description: string | null;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  theme: Theme;
};

export default function EditThemeModal({ open, onClose, onSaved, theme }: Props) {
  const [name, setName] = useState(theme?.name ?? "");
  const [description, setDescription] = useState(theme?.description ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setName(theme?.name ?? "");
    setDescription(theme?.description ?? "");
  }, [theme?.id]);

  async function handleSave() {
    if (!name.trim()) {
      alert("Please provide a theme name.");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("theme_catalogue")
      .update({ name: name.trim(), description: description.trim() || null })
      .eq("id", theme.id);
    setSaving(false);

    if (error) {
      console.error("Update theme failed:", error);
      alert("Failed to update theme.");
      return;
    }
    onSaved();
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="Edit Theme" width="max-w-lg">
      <div className="space-y-3">
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">Name</label>
          <input
            className="w-full border rounded px-3 py-2 text-sm"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Theme name"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">Description</label>
          <textarea
            className="w-full border rounded px-3 py-2 text-sm"
            value={description ?? ""}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional details…"
            rows={4}
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button className="px-3 py-2 text-sm rounded-md border" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-3 py-2 text-sm rounded-md"
            style={{ background: "var(--gsc-blue)", color: "white", opacity: saving ? 0.7 : 1 }}
          >
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

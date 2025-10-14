"use client";

import { useEffect, useState } from "react";
import Modal from "@/components/ui/Modal";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";

type Subtheme = {
  id: string;
  theme_id: string | null;
  name: string;
  description: string | null;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  subtheme: Subtheme;
};

export default function EditSubthemeModal({ open, onClose, onSaved, subtheme }: Props) {
  const [name, setName] = useState(subtheme?.name ?? "");
  const [description, setDescription] = useState(subtheme?.description ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setName(subtheme?.name ?? "");
    setDescription(subtheme?.description ?? "");
  }, [subtheme?.id]);

  async function handleSave() {
    if (!name.trim()) {
      alert("Please provide a subtheme name.");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("subtheme_catalogue")
      .update({ name: name.trim(), description: description.trim() || null })
      .eq("id", subtheme.id);
    setSaving(false);

    if (error) {
      console.error("Update subtheme failed:", error);
      alert("Failed to update subtheme.");
      return;
    }
    onSaved();
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="Edit Subtheme" width="max-w-lg">
      <div className="space-y-3">
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1">Name</label>
          <input
            className="w-full border rounded px-3 py-2 text-sm"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Subtheme name"
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

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
  const [description, setDescription] = useState<string>("");
  const [canHold, setCanHold] = useState<boolean>(false);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!name.trim()) return alert("Name is required.");
    setSaving(true);
    const { error } = await supabase.from("pillar_catalogue").insert({
      name: name.trim(),
      description: description?.trim() || null,
      can_have_indicators: canHold,
    });
    setSaving(false);
    if (error) {
      console.error(error);
      alert("Failed to add pillar.");
      return;
    }
    onClose();
    onSaved();
  }

  return (
    <Modal open={open} onClose={onClose} title="Add Pillar" width="max-w-lg">
      <div className="space-y-3">
        <div>
          <label className="text-sm font-medium text-gray-700">Name</label>
          <input className="mt-1 w-full rounded border px-3 py-2 text-sm" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700">Description</label>
          <textarea className="mt-1 w-full rounded border px-3 py-2 text-sm" rows={3} value={description || ""} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <label className="inline-flex items-center gap-2 text-sm">
          <input type="checkbox" checked={canHold} onChange={(e) => setCanHold(e.target.checked)} />
          Pillar can hold indicators
        </label>

        <div className="flex justify-end gap-2 pt-2">
          <button className="px-3 py-2 text-sm rounded-md border" onClick={onClose}>Cancel</button>
          <button disabled={saving} onClick={handleSave} className="px-3 py-2 text-sm rounded-md text-white" style={{ background: "var(--gsc-blue)" }}>
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

"use client";

import { useEffect, useState } from "react";
import Modal from "@/components/ui/Modal";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import type { Pillar } from "./CataloguePage";

type Props = {
  open: boolean;
  pillar: Pillar;
  onClose: () => void;
  onSaved: () => void;
};

export default function EditPillarModal({ open, pillar, onClose, onSaved }: Props) {
  const [name, setName] = useState(pillar.name);
  const [description, setDescription] = useState<string>(pillar.description || "");
  const [canHold, setCanHold] = useState<boolean>(!!pillar.can_have_indicators);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setName(pillar.name);
    setDescription(pillar.description || "");
    setCanHold(!!pillar.can_have_indicators);
  }, [pillar]);

  async function handleSave() {
    if (!name.trim()) return alert("Name is required.");
    setSaving(true);
    const { error } = await supabase.from("pillar_catalogue").update({
      name: name.trim(),
      description: description?.trim() || null,
      can_have_indicators: canHold,
    }).eq("id", pillar.id);
    setSaving(false);
    if (error) {
      console.error(error);
      alert("Update failed.");
      return;
    }
    onClose();
    onSaved();
  }

  return (
    <Modal open={open} onClose={onClose} title="Edit Pillar" width="max-w-lg">
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

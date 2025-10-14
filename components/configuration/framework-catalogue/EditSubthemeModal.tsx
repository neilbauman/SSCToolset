"use client";

import { useEffect, useState } from "react";
import Modal from "@/components/ui/Modal";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import type { Subtheme } from "./CataloguePage";

type Props = {
  open: boolean;
  subtheme: Subtheme;
  onClose: () => void;
  onSaved: () => void;
};

export default function EditSubthemeModal({ open, subtheme, onClose, onSaved }: Props) {
  const [name, setName] = useState(subtheme.name);
  const [description, setDescription] = useState<string>(subtheme.description || "");
  const [canHold, setCanHold] = useState<boolean>(!!subtheme.can_have_indicators);
  const [order, setOrder] = useState<number | "">(subtheme.sort_order ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setName(subtheme.name);
    setDescription(subtheme.description || "");
    setCanHold(!!subtheme.can_have_indicators);
    setOrder(subtheme.sort_order ?? "");
  }, [subtheme]);

  async function handleSave() {
    if (!name.trim()) return alert("Name is required.");
    setSaving(true);
    const { error } = await supabase.from("subtheme_catalogue").update({
      name: name.trim(),
      description: description?.trim() || null,
      can_have_indicators: canHold,
      sort_order: order === "" ? null : Number(order),
    }).eq("id", subtheme.id);
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
    <Modal open={open} onClose={onClose} title="Edit Subtheme" width="max-w-lg">
      <div className="space-y-3">
        <div>
          <label className="text-sm font-medium text-gray-700">Name</label>
          <input className="mt-1 w-full rounded border px-3 py-2 text-sm" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700">Description</label>
          <textarea className="mt-1 w-full rounded border px-3 py-2 text-sm" rows={3} value={description || ""} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div className="flex items-center gap-4">
          <label className="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" checked={canHold} onChange={(e) => setCanHold(e.target.checked)} />
            Subtheme can hold indicators
          </label>
          <div>
            <label className="text-sm font-medium text-gray-700">Sort order</label>
            <input type="number" className="mt-1 w-28 rounded border px-2 py-1 text-sm" value={order} onChange={(e) => setOrder(e.target.value === "" ? "" : Number(e.target.value))} />
          </div>
        </div>

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

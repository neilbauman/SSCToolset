"use client";

import { useState } from "react";
import Modal from "@/components/ui/Modal";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import type { Theme } from "./CataloguePage";

type Props = {
  open: boolean;
  theme: Theme;
  onClose: () => void;
  onSaved: () => void;
};

export default function AddSubthemeModal({ open, theme, onClose, onSaved }: Props) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState<string>("");
  const [canHold, setCanHold] = useState<boolean>(true);
  const [order, setOrder] = useState<number | "">("");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!name.trim()) return alert("Name is required.");
    setSaving(true);
    const { error } = await supabase.from("subtheme_catalogue").insert({
      theme_id: theme.id,
      name: name.trim(),
      description: description?.trim() || null,
      can_have_indicators: canHold,
      sort_order: order === "" ? null : Number(order),
    });
    setSaving(false);
    if (error) {
      console.error(error);
      alert("Failed to add subtheme.");
      return;
    }
    onClose();
    onSaved();
  }

  return (
    <Modal open={open} onClose={onClose} title={`Add Subtheme to ${theme.name}`} width="max-w-lg">
      <div className="space-y-3">
        <div className="text-xs text-gray-500">Theme: <span className="font-medium text-gray-700">{theme.name}</span></div>
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

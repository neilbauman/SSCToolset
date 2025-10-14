"use client";

import { useState } from "react";
import Modal from "@/components/ui/modal";
import type { Theme } from "./CataloguePage";

type Props = {
  open: boolean;
  onClose: () => void;
  theme: Theme;
  onSaved: (patch: { code?: string; name?: string; description?: string }) => Promise<void> | void;
};

export default function EditThemeModal({ open, onClose, theme, onSaved }: Props) {
  const [code, setCode] = useState(theme.code);
  const [name, setName] = useState(theme.name);
  const [description, setDescription] = useState(theme.description || "");

  async function handleSave() {
    await onSaved({ code: code.trim(), name: name.trim(), description: description.trim() });
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="Edit Theme" width="max-w-lg">
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700">Code</label>
          <input className="mt-1 w-full border rounded px-2 py-1" value={code} onChange={(e) => setCode(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Name</label>
          <input className="mt-1 w-full border rounded px-2 py-1" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Description</label>
          <textarea className="mt-1 w-full border rounded px-2 py-1" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button className="px-3 py-2 text-sm rounded-md border" onClick={onClose}>Cancel</button>
          <button className="px-3 py-2 text-sm rounded-md" style={{ background: "var(--gsc-blue)", color: "white" }} onClick={handleSave}>Save</button>
        </div>
      </div>
    </Modal>
  );
}

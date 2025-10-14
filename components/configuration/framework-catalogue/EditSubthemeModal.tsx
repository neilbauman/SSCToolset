"use client";

import { useState } from "react";
import Modal from "@/components/ui/modal";
import type { Subtheme } from "./CataloguePage";

type Props = {
  open: boolean;
  onClose: () => void;
  subtheme: Subtheme;
  onSaved: (patch: { code?: string; name?: string; description?: string }) => Promise<void> | void;
};

export default function EditSubthemeModal({ open, onClose, subtheme, onSaved }: Props) {
  const [code, setCode] = useState(subtheme.code);
  const [name, setName] = useState(subtheme.name);
  const [description, setDescription] = useState(subtheme.description || "");

  async function handleSave() {
    await onSaved({ code: code.trim(), name: name.trim(), description: description.trim() });
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="Edit Subtheme" width="max-w-lg">
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

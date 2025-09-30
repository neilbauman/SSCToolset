"use client";

import { useState } from "react";
import Modal from "../ui/Modal";
import type { NormalizedFramework } from "@/lib/types/framework";
import { updatePillar, updateTheme, updateSubtheme } from "@/lib/services/framework";

type Props = {
  entity: NormalizedFramework;
  onClose: () => void;
  onSaveLocal: (updated: { name: string; description: string }) => void;
};

export default function EditEntityModal({ entity, onClose, onSaveLocal }: Props) {
  const [name, setName] = useState(entity.name);
  const [description, setDescription] = useState(entity.description ?? "");
  const [loading, setLoading] = useState(false);

  async function handleSave() {
    if (!name.trim()) return;

    setLoading(true);
    try {
      // Update catalogue table depending on type
      if (entity.type === "pillar") {
        await updatePillar(entity.id, { name: name.trim(), description: description.trim() });
      } else if (entity.type === "theme") {
        await updateTheme(entity.id, { name: name.trim(), description: description.trim() });
      } else if (entity.type === "subtheme") {
        await updateSubtheme(entity.id, { name: name.trim(), description: description.trim() });
      }

      // Update local tree state so UI reflects immediately
      onSaveLocal({ name: name.trim(), description: description.trim() });
      onClose();
    } catch (err: any) {
      console.error("Error updating entity:", err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={true} onClose={onClose}>
      <h2 className="text-lg font-semibold mb-4">Edit {entity.type}</h2>
      <div className="space-y-4">
        <input
          type="text"
          value={name}
          disabled={loading}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name"
          className="w-full rounded-md border px-3 py-2 text-sm"
        />
        <textarea
          value={description}
          disabled={loading}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description"
          className="w-full rounded-md border px-3 py-2 text-sm"
        />
        <div className="flex justify-end space-x-2">
          <button
            className="px-4 py-2 rounded-md bg-gray-100 hover:bg-gray-200 text-sm disabled:opacity-50"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 text-sm disabled:opacity-50"
            onClick={handleSave}
            disabled={loading}
          >
            {loading ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

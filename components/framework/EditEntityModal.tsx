"use client";

import { useState } from "react";
import Modal from "../ui/Modal";
import type { NormalizedFramework } from "@/lib/types/framework";

type Props = {
  entity: NormalizedFramework;
  onClose: () => void;
  onSave: (updated: { name: string; description: string }) => void;
};

export default function EditEntityModal({ entity, onClose, onSave }: Props) {
  const [name, setName] = useState(entity.name);
  const [description, setDescription] = useState(entity.description ?? "");

  return (
    <Modal open={true} onClose={onClose}>
      <h2 className="text-lg font-semibold mb-4">Edit {entity.type}</h2>
      <div className="space-y-4">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name"
          className="w-full rounded-md border px-3 py-2 text-sm"
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description"
          className="w-full rounded-md border px-3 py-2 text-sm"
        />
        <div className="flex justify-end space-x-2">
          <button
            className="px-4 py-2 rounded-md bg-gray-100 hover:bg-gray-200 text-sm"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 text-sm"
            onClick={() => {
              if (!name.trim()) return;
              onSave({ name: name.trim(), description: description.trim() });
              onClose();
            }}
          >
            Save
          </button>
        </div>
      </div>
    </Modal>
  );
}

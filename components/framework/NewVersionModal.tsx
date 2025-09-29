"use client";

import { useState } from "react";
import Modal from "../ui/Modal";

type Props = {
  onClose: () => void;
  onSubmit: (name: string) => Promise<void>;
};

export default function NewVersionModal({ onClose, onSubmit }: Props) {
  const [name, setName] = useState("");

  return (
    <Modal title="New Framework Version" onClose={onClose}>
      <div className="space-y-4">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter version name"
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
            onClick={async () => {
              if (!name.trim()) return;
              await onSubmit(name.trim());
            }}
          >
            Create
          </button>
        </div>
      </div>
    </Modal>
  );
}

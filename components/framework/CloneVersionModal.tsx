"use client";

import { useState } from "react";
import Modal from "../ui/Modal";

type Props = {
  initialName: string;
  onClose: () => void;
  onSubmit: (name: string) => Promise<void>;
};

export default function CloneVersionModal({ initialName, onClose, onSubmit }: Props) {
  const [name, setName] = useState(initialName);

  return (
    <Modal onClose={onClose}>
      <h2 className="text-lg font-semibold mb-4">Clone Framework Version</h2>
      <div className="space-y-4">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
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
            Clone
          </button>
        </div>
      </div>
    </Modal>
  );
}

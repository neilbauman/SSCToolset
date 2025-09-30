"use client";

import { useState } from "react";
import Modal from "../ui/Modal";

type Props = {
  onClose: () => void;
  onSubmit: (name: string) => Promise<void>;
};

export default function NewVersionModal({ onClose, onSubmit }: Props) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) return;
    try {
      setLoading(true);
      await onSubmit(name.trim());
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={true} onClose={onClose}>
      <h2 className="text-lg font-semibold mb-4">New Framework Version</h2>
      <div className="space-y-4">
        <input
          type="text"
          value={name}
          disabled={loading}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter version name"
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
            onClick={handleCreate}
            disabled={loading}
          >
            {loading ? "Creating…" : "Create"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

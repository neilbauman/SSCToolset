"use client";

import { useState } from "react";

type Props = {
  open: boolean;
  initialName: string;
  onClose: () => void;
  onSave: (newName: string) => Promise<void>;
};

export default function EditVersionModal({
  open,
  initialName,
  onClose,
  onSave,
}: Props) {
  const [name, setName] = useState(initialName || "");
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await onSave(name.trim());
      onClose();
    } catch (err: any) {
      console.error("Error updating version:", err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 w-[400px]">
        <h2 className="text-lg font-semibold mb-4">Edit Framework Version</h2>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full border rounded px-3 py-2 mb-4"
          placeholder="Enter new name"
        />
        <div className="flex justify-end space-x-2">
          <button
            className="px-4 py-2 rounded border text-gray-700"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

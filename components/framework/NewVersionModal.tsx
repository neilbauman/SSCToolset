"use client";

import { useState } from "react";
import { createVersion } from "@/lib/services/framework";

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated: (id: string) => void; // callback with new version id
};

export default function NewVersionModal({ open, onClose, onCreated }: Props) {
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const handleSave = async () => {
    if (!name.trim()) {
      setError("Name is required");
      return;
    }
    try {
      setSaving(true);
      setError(null);
      const v = await createVersion(name.trim());
      onCreated(v.id);
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-md shadow-lg w-[400px] p-5">
        <h2 className="text-lg font-semibold mb-3">New Framework Version</h2>
        <input
          type="text"
          placeholder="Enter version name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full border rounded px-3 py-2 text-sm mb-3"
          autoFocus
        />
        {error && <div className="text-red-600 text-sm mb-2">{error}</div>}

        <div className="flex justify-end space-x-2">
          <button
            className="px-3 py-1.5 text-sm rounded border text-gray-600 hover:bg-gray-50"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            className="px-3 py-1.5 text-sm rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Saving..." : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}

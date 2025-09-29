// components/framework/CloneVersionModal.tsx
"use client";

import { useState } from "react";

type Props = {
  onClose: () => void;
  onConfirm: (newName: string) => Promise<void>; // ✅ add this
};

export default function CloneVersionModal({ onClose, onConfirm }: Props) {
  const [name, setName] = useState("");

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
      <div className="bg-white rounded-md shadow-md p-6 w-96">
        <h2 className="text-lg font-semibold mb-4">Clone Version</h2>

        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter new version name"
          className="w-full border rounded px-2 py-1 mb-4 text-sm"
        />

        <div className="flex justify-end space-x-2">
          <button
            onClick={onClose}
            className="px-3 py-1 text-sm border rounded hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              if (name.trim()) {
                onConfirm(name.trim()); // ✅ pass name back
                onClose();
              }
            }}
            className="px-3 py-1 text-sm rounded bg-blue-600 text-white hover:bg-blue-700"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

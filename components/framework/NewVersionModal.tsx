"use client";

import { useState } from "react";

type Props = {
  onClose: () => void;
  onCreate: (name: string) => void;
};

export default function NewVersionModal({ onClose, onCreate }: Props) {
  const [name, setName] = useState("");

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-30 z-50">
      <div className="bg-white rounded-lg shadow-lg w-96 p-6">
        <h2 className="text-lg font-semibold mb-4">Create New Framework Version</h2>
        <input
          type="text"
          placeholder="Enter version name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 mb-4 text-sm"
        />
        <div className="flex justify-end space-x-2">
          <button
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-100"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
            onClick={() => {
              if (name.trim()) {
                onCreate(name.trim());
                onClose();
              }
            }}
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
}

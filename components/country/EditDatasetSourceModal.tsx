"use client";

import { useState } from "react";
import { X } from "lucide-react";

interface EditDatasetSourceModalProps {
  open: boolean;
  onClose: () => void;
  datasetName: string;
  currentSource: { name: string; url?: string } | null;
  onSave: (source: { name: string; url?: string }) => void;
}

export default function EditDatasetSourceModal({
  open,
  onClose,
  datasetName,
  currentSource,
  onSave,
}: EditDatasetSourceModalProps) {
  const [name, setName] = useState(currentSource?.name || "");
  const [url, setUrl] = useState(currentSource?.url || "");

  if (!open) return null;

  const handleSubmit = () => {
    if (!name.trim()) return; // require name
    onSave({
      name: name.trim(),
      url: url.trim() || undefined,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
        >
          <X className="w-5 h-5" />
        </button>
        <h2 className="text-lg font-semibold mb-4">
          Edit Source for {datasetName}
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium">Source Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 block w-full border rounded-md px-3 py-2 text-sm"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Source URL</label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.org/dataset"
              className="mt-1 block w-full border rounded-md px-3 py-2 text-sm"
            />
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-md text-sm bg-gray-200 hover:bg-gray-300"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-3 py-1.5 rounded-md text-sm bg-[color:var(--gsc-green)] text-white hover:opacity-90"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

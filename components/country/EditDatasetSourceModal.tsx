"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";

export interface EditDatasetSourceModalProps {
  open: boolean;
  onClose: () => void;
  source?: { name: string; url?: string };
  onSave: (newSource: { name: string; url?: string }) => Promise<void>;
}

export default function EditDatasetSourceModal({
  open,
  onClose,
  source,
  onSave,
}: EditDatasetSourceModalProps) {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");

  useEffect(() => {
    if (source) {
      setName(source.name || "");
      setUrl(source.url || "");
    } else {
      setName("");
      setUrl("");
    }
  }, [source, open]);

  if (!open) return null;

  const handleSave = async () => {
    await onSave({ name, url: url.trim() === "" ? undefined : url });
    onClose();
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6 relative">
        {/* Close button */}
        <button
          className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
          onClick={onClose}
        >
          <X className="w-5 h-5" />
        </button>

        {/* Title */}
        <h2 className="text-lg font-semibold mb-4">Edit Dataset Source</h2>

        {/* Form */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Source Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm"
              placeholder="e.g., National Statistics Office"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Source URL (optional)
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm"
              placeholder="https://example.com/dataset"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded bg-gray-100 text-gray-700 hover:bg-gray-200"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm rounded bg-[color:var(--gsc-blue)] text-white hover:opacity-90"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

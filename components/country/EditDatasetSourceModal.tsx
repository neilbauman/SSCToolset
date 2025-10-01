"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

export interface EditDatasetSourceModalProps {
  open: boolean;
  onClose: () => void;
  source?: { name: string; url?: string } | null;
  onSave: (newSource: { name: string; url?: string }) => void | Promise<void>;
}

export default function EditDatasetSourceModal({
  open,
  onClose,
  source,
  onSave,
}: EditDatasetSourceModalProps) {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");

  // Prefill form when modal opens
  useEffect(() => {
    if (open) {
      setName(source?.name || "");
      setUrl(source?.url || "");
    }
  }, [open, source]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6 relative">
        {/* Close button */}
        <button
          className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
          onClick={onClose}
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-lg font-semibold mb-4">Edit Dataset Source</h2>

        <div className="space-y-4">
          {/* Source name */}
          <div>
            <label className="block text-sm font-medium mb-1">Source Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="border rounded w-full px-3 py-1.5 text-sm"
              placeholder="e.g. Philippine Statistics Authority"
            />
          </div>

          {/* Source URL */}
          <div>
            <label className="block text-sm font-medium mb-1">Source URL (optional)</label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="border rounded w-full px-3 py-1.5 text-sm"
              placeholder="https://example.org/dataset"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button
            className="px-3 py-1.5 text-sm rounded bg-gray-100 hover:bg-gray-200"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="px-3 py-1.5 text-sm rounded bg-[color:var(--gsc-green)] text-white hover:opacity-90"
            onClick={() => {
              if (!name.trim()) return;
              onSave({ name: name.trim(), url: url.trim() || undefined });
              onClose();
            }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

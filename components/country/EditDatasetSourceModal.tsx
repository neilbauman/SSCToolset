"use client";

import { useState, useEffect } from "react";

type Source = {
  name: string;
  url?: string;
};

export default function EditDatasetSourceModal({
  open,
  onClose,
  source,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  source?: Source;
  onSave: (src: Source) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");

  useEffect(() => {
    if (source) {
      setName(source.name);
      setUrl(source.url || "");
    } else {
      setName("");
      setUrl("");
    }
  }, [source, open]);

  const handleSave = async () => {
    if (!name.trim()) return;
    await onSave({ name: name.trim(), url: url.trim() || undefined });
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
        <h2 className="text-lg font-semibold mb-4">Edit Dataset Source</h2>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Source Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 block w-full border rounded px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Source URL (optional)
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="mt-1 block w-full border rounded px-3 py-2 text-sm"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-sm rounded bg-gray-100 hover:bg-gray-200"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!name.trim()}
            className="px-3 py-1.5 text-sm rounded bg-[color:var(--gsc-blue)] text-white hover:opacity-90 disabled:opacity-50"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

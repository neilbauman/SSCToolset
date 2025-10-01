"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";

export interface EditDatasetSourceModalProps {
  open: boolean;
  onClose: () => void;
  source?: { name: string; url?: string };
  onSave: (newSource: { name: string; url?: string }) => void | Promise<void>;
}

export default function EditDatasetSourceModal({ open, onClose, source, onSave }: EditDatasetSourceModalProps) {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");

  useEffect(() => {
    if (source) {
      setName(source.name || "");
      setUrl(source.url || "");
    }
  }, [source, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md relative">
        <button onClick={onClose} className="absolute top-3 right-3 text-gray-500 hover:text-gray-700">
          <X className="w-5 h-5" />
        </button>
        <h2 className="text-lg font-semibold mb-4">Edit Dataset Source</h2>
        <div className="mb-3">
          <label className="block text-sm font-medium">Source Name</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="border rounded px-3 py-2 w-full text-sm" />
        </div>
        <div className="mb-3">
          <label className="block text-sm font-medium">Source URL (optional)</label>
          <input type="text" value={url} onChange={(e) => setUrl(e.target.value)} className="border rounded px-3 py-2 w-full text-sm" />
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose} className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded">Cancel</button>
          <button onClick={() => { onSave({ name, url: url || undefined }); onClose(); }} className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">Save</button>
        </div>
      </div>
    </div>
  );
}

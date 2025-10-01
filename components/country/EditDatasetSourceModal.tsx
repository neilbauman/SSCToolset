"use client";

import { useState } from "react";
import { X } from "lucide-react";

interface EditDatasetSourceModalProps {
  open: boolean;
  onClose: () => void;
  datasetName: string;
  currentSource: string;
  onSave: (newSource: string) => Promise<void> | void;
}

export default function EditDatasetSourceModal({
  open,
  onClose,
  datasetName,
  currentSource,
  onSave,
}: EditDatasetSourceModalProps) {
  const [source, setSource] = useState(currentSource || "");
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const handleSave = async () => {
    setLoading(true);
    try {
      await onSave(source);
      onClose();
    } catch (err) {
      console.error("Failed to save dataset source:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">
            Edit Source – {datasetName}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-gray-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Input */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">
            Dataset Source
          </label>
          <input
            type="text"
            value={source}
            onChange={(e) => setSource(e.target.value)}
            className="w-full border rounded px-3 py-2 text-sm"
            placeholder="e.g. OCHA COD – HDX"
          />
          <p className="text-xs text-gray-500 mt-1">
            Provide a descriptive source or URL for this dataset.
          </p>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-4 py-2 rounded bg-[color:var(--gsc-green)] text-white hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

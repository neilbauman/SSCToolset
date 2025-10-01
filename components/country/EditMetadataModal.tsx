"use client";

import { useState } from "react";
import { X, Plus, Trash2 } from "lucide-react";

interface DatasetSource {
  name: string;
  url: string;
}

interface Metadata {
  iso: string;
  name: string;
  admLabels: {
    adm0: string;
    adm1: string;
    adm2: string;
    adm3: string;
    adm4: string;
    adm5: string;
  };
  datasetSources: DatasetSource[];
  extra?: Record<string, string>;
}

export default function EditMetadataModal({
  open,
  onClose,
  metadata,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  metadata: Metadata;
  onSave: (updated: Metadata) => void;
}) {
  const [localMeta, setLocalMeta] = useState<Metadata>({
    ...metadata,
    datasetSources: metadata.datasetSources || [],
    extra: metadata.extra || {},
  });

  if (!open) return null;

  const handleAdmChange = (field: string, value: string) => {
    setLocalMeta((prev) => ({
      ...prev,
      admLabels: { ...prev.admLabels, [field]: value },
    }));
  };

  const handleDatasetChange = (idx: number, field: "name" | "url", value: string) => {
    const updated = [...localMeta.datasetSources];
    updated[idx] = { ...updated[idx], [field]: value };
    setLocalMeta((prev) => ({ ...prev, datasetSources: updated }));
  };

  const handleAddDataset = () => {
    setLocalMeta((prev) => ({
      ...prev,
      datasetSources: [...prev.datasetSources, { name: "", url: "" }],
    }));
  };

  const handleDeleteDataset = (idx: number) => {
    const updated = localMeta.datasetSources.filter((_, i) => i !== idx);
    setLocalMeta((prev) => ({ ...prev, datasetSources: updated }));
  };

  const handleExtraChange = (key: string, newKey: string, value: string) => {
    const updated = { ...localMeta.extra };
    delete updated[key];
    updated[newKey || key] = value;
    setLocalMeta((prev) => ({ ...prev, extra: updated }));
  };

  const handleAddExtra = () => {
    const newKey = `field_${Object.keys(localMeta.extra || {}).length + 1}`;
    setLocalMeta((prev) => ({
      ...prev,
      extra: { ...prev.extra, [newKey]: "" },
    }));
  };

  const handleDeleteExtra = (key: string) => {
    const updated = { ...localMeta.extra };
    delete updated[key];
    setLocalMeta((prev) => ({ ...prev, extra: updated }));
  };

  const handleSave = () => {
    onSave(localMeta);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-3xl p-6 overflow-y-auto max-h-[90vh]">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Edit Metadata</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Core */}
        <h3 className="font-medium mb-2">Core Metadata</h3>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="text-sm text-gray-600">Country ISO</label>
            <input
              type="text"
              value={localMeta.iso}
              disabled
              className="border rounded px-3 py-2 text-sm w-full bg-gray-100"
            />
          </div>
          <div>
            <label className="text-sm text-gray-600">Country Name</label>
            <input
              type="text"
              value={localMeta.name}
              onChange={(e) =>
                setLocalMeta((prev) => ({ ...prev, name: e.target.value }))
              }
              className="border rounded px-3 py-2 text-sm w-full"
            />
          </div>
        </div>

        {/* ADM Labels */}
        <h3 className="font-medium mb-2">Administrative Labels</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
          {(["adm0", "adm1", "adm2", "adm3", "adm4", "adm5"] as const).map((lvl) => (
            <div key={lvl}>
              <label className="text-xs text-gray-500">{lvl.toUpperCase()} Label</label>
              <input
                type="text"
                value={localMeta.admLabels[lvl]}
                onChange={(e) => handleAdmChange(lvl, e.target.value)}
                className="border rounded px-3 py-2 text-sm w-full"
              />
            </div>
          ))}
        </div>

        {/* Sources */}
        <h3 className="font-medium mb-2">Sources</h3>
        <div className="space-y-2 mb-4">
          {localMeta.datasetSources.map((ds, idx) => (
            <div key={idx} className="flex gap-2 items-center">
              <input
                type="text"
                value={ds.name}
                onChange={(e) => handleDatasetChange(idx, "name", e.target.value)}
                placeholder="Source name"
                className="border rounded px-3 py-2 text-sm w-1/3"
              />
              <input
                type="text"
                value={ds.url}
                onChange={(e) => handleDatasetChange(idx, "url", e.target.value)}
                placeholder="https://..."
                className="border rounded px-3 py-2 text-sm w-2/3"
              />
              <button
                onClick={() => handleDeleteDataset(idx)}
                className="text-red-600 hover:text-red-800"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
        <button
          onClick={handleAddDataset}
          className="mt-2 flex items-center gap-1 text-sm text-blue-600 hover:underline"
        >
          <Plus className="w-4 h-4" /> Add Source
        </button>

        {/* Extra Metadata */}
        <h3 className="font-medium mt-6 mb-2">Extra Metadata</h3>
        <div className="space-y-2 mb-4">
          {Object.entries(localMeta.extra || {}).map(([key, val]) => (
            <div key={key} className="flex gap-2 items-center">
              <input
                type="text"
                defaultValue={key}
                onBlur={(e) =>
                  handleExtraChange(key, e.target.value.trim() || key, val)
                }
                placeholder="Key"
                className="border rounded px-3 py-2 text-sm w-1/3"
              />
              <input
                type="text"
                value={val}
                onChange={(e) => handleExtraChange(key, key, e.target.value)}
                placeholder="Value"
                className="border rounded px-3 py-2 text-sm w-2/3"
              />
              <button
                onClick={() => handleDeleteExtra(key)}
                className="text-red-600 hover:text-red-800"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
        <button
          onClick={handleAddExtra}
          className="mt-2 flex items-center gap-1 text-sm text-blue-600 hover:underline"
        >
          <Plus className="w-4 h-4" /> Add Extra Field
        </button>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-sm rounded bg-gray-100 text-gray-800 hover:bg-gray-200"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-3 py-1.5 text-sm rounded bg-[color:var(--gsc-green)] text-white hover:opacity-90"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { X, Plus, Trash2 } from "lucide-react";

interface Metadata {
  iso: string;
  name: string;
  admLabels: {
    adm1: string;
    adm2: string;
    adm3: string;
  };
  sources: {
    boundaries: string;
    population: string;
  };
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
    extra: metadata.extra || {},
  });

  if (!open) return null;

  const handleCoreChange = (
    section: "admLabels" | "sources",
    field: string,
    value: string
  ) => {
    setLocalMeta((prev) => ({
      ...prev,
      [section]: { ...prev[section], [field]: value },
    }));
  };

  const handleExtraChange = (key: string, value: string) => {
    setLocalMeta((prev) => ({
      ...prev,
      extra: { ...prev.extra, [key]: value },
    }));
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
      <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Edit Metadata</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          {/* ISO & Country Name */}
          <div className="grid grid-cols-2 gap-4">
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

          {/* Core fields */}
          <h3 className="font-medium">Administrative Labels</h3>
          <div className="grid grid-cols-3 gap-4">
            <input
              type="text"
              value={localMeta.admLabels.adm1}
              onChange={(e) =>
                handleCoreChange("admLabels", "adm1", e.target.value)
              }
              placeholder="ADM1 name"
              className="border rounded px-3 py-2 text-sm w-full"
            />
            <input
              type="text"
              value={localMeta.admLabels.adm2}
              onChange={(e) =>
                handleCoreChange("admLabels", "adm2", e.target.value)
              }
              placeholder="ADM2 name"
              className="border rounded px-3 py-2 text-sm w-full"
            />
            <input
              type="text"
              value={localMeta.admLabels.adm3}
              onChange={(e) =>
                handleCoreChange("admLabels", "adm3", e.target.value)
              }
              placeholder="ADM3 name"
              className="border rounded px-3 py-2 text-sm w-full"
            />
          </div>

          <h3 className="font-medium">Data Sources</h3>
          <input
            type="text"
            value={localMeta.sources.boundaries}
            onChange={(e) =>
              handleCoreChange("sources", "boundaries", e.target.value)
            }
            placeholder="Boundaries source"
            className="border rounded px-3 py-2 text-sm w-full mb-2"
          />
          <input
            type="text"
            value={localMeta.sources.population}
            onChange={(e) =>
              handleCoreChange("sources", "population", e.target.value)
            }
            placeholder="Population source"
            className="border rounded px-3 py-2 text-sm w-full"
          />

          {/* Flexible fields */}
          <h3 className="font-medium mt-4">Extra Metadata</h3>
          <div className="space-y-2">
            {Object.entries(localMeta.extra || {}).map(([key, val]) => (
              <div key={key} className="flex gap-2 items-center">
                <input
                  type="text"
                  value={key}
                  disabled
                  className="border rounded px-3 py-2 text-sm w-1/3 bg-gray-100"
                />
                <input
                  type="text"
                  value={val}
                  onChange={(e) => handleExtraChange(key, e.target.value)}
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
        </div>

        {/* Footer */}
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

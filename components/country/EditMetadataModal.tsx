"use client";

import { useState } from "react";
import { X, Plus, Trash2 } from "lucide-react";

interface EditMetadataModalProps {
  open: boolean;
  onClose: () => void;
  metadata: {
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
    datasetSources: { name: string; url: string }[];
    extra: Record<string, string>;
  };
  onSave: (updated: EditMetadataModalProps["metadata"]) => Promise<void>;
}

export default function EditMetadataModal({
  open,
  onClose,
  metadata,
  onSave,
}: EditMetadataModalProps) {
  const [form, setForm] = useState(metadata);

  if (!open) return null;

  const handleFieldChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleAdmChange = (level: keyof typeof form.admLabels, value: string) => {
    setForm((prev) => ({
      ...prev,
      admLabels: { ...prev.admLabels, [level]: value },
    }));
  };

  const handleSourceChange = (
    idx: number,
    field: "name" | "url",
    value: string
  ) => {
    const updated = [...form.datasetSources];
    updated[idx] = {
      ...updated[idx],
      [field]: value.trim(),
    };
    setForm((prev) => ({ ...prev, datasetSources: updated }));
  };

  const addSource = () => {
    setForm((prev) => ({
      ...prev,
      datasetSources: [...(prev.datasetSources || []), { name: "", url: "" }],
    }));
  };

  const removeSource = (idx: number) => {
    const updated = [...form.datasetSources];
    updated.splice(idx, 1);
    setForm((prev) => ({ ...prev, datasetSources: updated }));
  };

  const handleExtraChange = (key: string, value: string) => {
    setForm((prev) => ({
      ...prev,
      extra: { ...prev.extra, [key]: value },
    }));
  };

  const addExtra = () => {
    setForm((prev) => ({
      ...prev,
      extra: { ...prev.extra, [`field_${Object.keys(prev.extra).length + 1}`]: "" },
    }));
  };

  const removeExtra = (key: string) => {
    const updated = { ...form.extra };
    delete updated[key];
    setForm((prev) => ({ ...prev, extra: updated }));
  };

  const handleSubmit = async () => {
    // ✅ Clean datasetSources before save
    const cleanedSources = (form.datasetSources || [])
      .map((s) => ({
        name: (s.name || "").trim(),
        url: (s.url || "").trim(),
      }))
      .filter((s) => s.name && s.url); // drop incomplete rows

    await onSave({
      ...form,
      datasetSources: cleanedSources,
      extra: form.extra || {},
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-2xl shadow-lg p-6 relative">
        {/* Header */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
        >
          <X className="w-5 h-5" />
        </button>
        <h2 className="text-lg font-semibold mb-4">Edit Metadata</h2>

        {/* ISO + Name */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Country ISO</label>
            <input
              type="text"
              value={form.iso}
              onChange={(e) => handleFieldChange("iso", e.target.value.toUpperCase())}
              className="w-full border rounded p-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Country Name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => handleFieldChange("name", e.target.value)}
              className="w-full border rounded p-2 text-sm"
            />
          </div>
        </div>

        {/* ADM Labels */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          {Object.entries(form.admLabels).map(([k, v]) => (
            <div key={k}>
              <label className="block text-sm font-medium text-gray-700">
                {k.toUpperCase()} Label
              </label>
              <input
                type="text"
                value={v}
                onChange={(e) =>
                  handleAdmChange(k as keyof typeof form.admLabels, e.target.value)
                }
                className="w-full border rounded p-2 text-sm"
              />
            </div>
          ))}
        </div>

        {/* Sources */}
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-[color:var(--gsc-red)] mb-2">
            General Dataset Sources
          </h3>
          {form.datasetSources.map((src, idx) => (
            <div key={idx} className="flex gap-2 mb-2">
              <input
                type="text"
                placeholder="Name"
                value={src.name}
                onChange={(e) => handleSourceChange(idx, "name", e.target.value)}
                className="flex-1 border rounded p-2 text-sm"
              />
              <input
                type="text"
                placeholder="URL"
                value={src.url}
                onChange={(e) => handleSourceChange(idx, "url", e.target.value)}
                className="flex-1 border rounded p-2 text-sm"
              />
              <button
                onClick={() => removeSource(idx)}
                className="text-red-500 hover:text-red-700"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          <button
            onClick={addSource}
            className="flex items-center text-sm text-blue-600 hover:underline"
          >
            <Plus className="w-4 h-4 mr-1" /> Add Source
          </button>
        </div>

        {/* Extra Metadata */}
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-[color:var(--gsc-red)] mb-2">
            Extra Metadata
          </h3>
          {Object.entries(form.extra).map(([key, value]) => (
            <div key={key} className="flex gap-2 mb-2">
              <input
                type="text"
                value={key}
                readOnly
                className="w-1/3 border rounded p-2 text-sm bg-gray-100"
              />
              <input
                type="text"
                value={value}
                onChange={(e) => handleExtraChange(key, e.target.value)}
                className="flex-1 border rounded p-2 text-sm"
              />
              <button
                onClick={() => removeExtra(key)}
                className="text-red-500 hover:text-red-700"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          <button
            onClick={addExtra}
            className="flex items-center text-sm text-blue-600 hover:underline"
          >
            <Plus className="w-4 h-4 mr-1" /> Add Extra Field
          </button>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 rounded text-sm font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 bg-[color:var(--gsc-green)] text-white rounded text-sm font-medium hover:opacity-90"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

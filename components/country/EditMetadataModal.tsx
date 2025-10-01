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
    extra: Record<
      string,
      { label: string; value: string; url?: string }
    >;
  };
  onSave: (
    updated: EditMetadataModalProps["metadata"]
  ) => Promise<void>;
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

  const handleAdmChange = (
    level: keyof typeof form.admLabels,
    value: string
  ) => {
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
      datasetSources: [
        ...(prev.datasetSources || []),
        { name: "", url: "" },
      ],
    }));
  };

  const removeSource = (idx: number) => {
    const updated = [...form.datasetSources];
    updated.splice(idx, 1);
    setForm((prev) => ({ ...prev, datasetSources: updated }));
  };

  const handleExtraChange = (
    key: string,
    field: "label" | "value" | "url",
    value: string
  ) => {
    setForm((prev) => ({
      ...prev,
      extra: {
        ...prev.extra,
        [key]: {
          ...prev.extra[key],
          [field]: value,
        },
      },
    }));
  };

  const addExtra = () => {
    const newKey = `field_${Object.keys(form.extra).length + 1}`;
    setForm((prev) => ({
      ...prev,
      extra: {
        ...prev.extra,
        [newKey]: { label: "New Field", value: "", url: "" },
      },
    }));
  };

  const removeExtra = (key: string) => {
    const updated = { ...form.extra };
    delete updated[key];
    setForm((prev) => ({ ...prev, extra: updated }));
  };

  const handleSubmit = async () => {
    await onSave(form);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-3xl shadow-lg p-6 relative">
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
            <label className="block text-sm font-medium text-gray-700">
              Country ISO
            </label>
            <input
              type="text"
              value={form.iso}
              onChange={(e) =>
                handleFieldChange("iso", e.target.value.toUpperCase())
              }
              className="w-full border rounded p-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium

"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";

interface EditMetadataModalProps {
  open: boolean;
  onClose: () => void;
  metadata: {
    iso_code: string;
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
  onSave: (metadata: any) => Promise<void>;
}

export default function EditMetadataModal({
  open,
  onClose,
  metadata,
  onSave,
}: EditMetadataModalProps) {
  const [form, setForm] = useState(metadata);

  if (!open) return null;

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleLabelChange = (index: number, label: string) => {
    // normalize to snake_case key automatically
    const key = label.toLowerCase().replace(/\s+/g, "_");
    const entries = Object.entries(form.extra);
    const [oldKey, val] = entries[index];

    const updatedExtra = { ...form.extra };
    delete updatedExtra[oldKey];
    updatedExtra[key] = { ...val, label };
    setForm({ ...form, extra: updatedExtra });
  };

  const handleExtraChange = (
    index: number,
    field: "value" | "url",
    value: string
  ) => {
    const entries = Object.entries(form.extra);
    const [key, val] = entries[index];
    const updatedExtra = { ...form.extra, [key]: { ...val, [field]: value } };
    setForm({ ...form, extra: updatedExtra });
  };

  const addExtraField = () => {
    const newKey = `field_${Object.keys(form.extra).length + 1}`;
    setForm({
      ...form,
      extra: { ...form.extra, [newKey]: { label: "", value: "" } },
    });
  };

  const removeExtraField = (index: number) => {
    const entries = Object.entries(form.extra);
    const [key] = entries[index];
    const updatedExtra = { ...form.extra };
    delete updatedExtra[key];
    setForm({ ...form, extra: updatedExtra });
  };

  const handleSave = async () => {
    await onSave(form);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Edit Metadata</h2>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-gray-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ISO + Name */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-1">Country ISO</label>
            <input
              value={form.iso_code}
              onChange={(e) => handleChange("iso_code", e.target.value)}
              className="w-full border rounded px-2 py-1"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Country Name</label>
            <input
              value={form.name}
              onChange={(e) => handleChange("name", e.target.value)}
              className="w-full border rounded px-2 py-1"
            />
          </div>
        </div>

        {/* ADM Labels */}
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-[color:var(--gsc-red)] mb-2">
            Admin Labels
          </h3>
          {Object.entries(form.admLabels).map(([k, v]) => (
            <div key={k} className="mb-2">
              <label className="block text-xs font-medium mb-1 uppercase">
                {k}
              </label>
              <input
                value={v}
                onChange={(e) =>
                  setForm({
                    ...form,
                    admLabels: { ...form.admLabels, [k]: e.target.value },
                  })
                }
                className="w-full border rounded px-2 py-1"
              />
            </div>
          ))}
        </div>

        {/* Dataset Sources */}
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-[color:var(--gsc-red)] mb-2">
            Dataset Sources
          </h3>
          {form.datasetSources.map((src, i) => (
            <div key={i} className="flex gap-2 mb-2">
              <input
                value={src.name}
                onChange={(e) => {
                  const updated = [...form.datasetSources];
                  updated[i].name = e.target.value;
                  setForm({ ...form, datasetSources: updated });
                }}
                className="flex-1 border rounded px-2 py-1"
                placeholder="Source Name"
              />
              <input
                value={src.url}
                onChange={(e) => {
                  const updated = [...form.datasetSources];
                  updated[i].url = e.target.value;
                  setForm({ ...form, datasetSources: updated });
                }}
                className="flex-1 border rounded px-2 py-1"
                placeholder="Source URL"
              />
            </div>
          ))}
          <button
            onClick={() =>
              setForm({
                ...form,
                datasetSources: [...form.datasetSources, { name: "", url: "" }],
              })
            }
            className="text-sm text-blue-600 hover:underline"
          >
            + Add Source
          </button>
        </div>

        {/* Extra Metadata */}
        <div>
          <h3 className="text-sm font-semibold text-[color:var(--gsc-red)] mb-2">
            Extra Metadata
          </h3>
          {Object.entries(form.extra).map(([key, val], i) => (
            <div key={i} className="grid grid-cols-4 gap-2 mb-2">
              {/* Auto-generated key */}
              <input
                value={key}
                readOnly
                className="col-span-1 border rounded px-2 py-1 text-gray-500 bg-gray-100"
              />
              {/* Human-readable label */}
              <input
                value={val.label}
                onChange={(e) => handleLabelChange(i, e.target.value)}
                className="col-span-1 border rounded px-2 py-1"
                placeholder="Label (human readable)"
              />
              {/* Value */}
              <input
                value={val.value}
                onChange={(e) => handleExtraChange(i, "value", e.target.value)}
                className="col-span-1 border rounded px-2 py-1"
                placeholder="Value"
              />
              {/* Optional URL */}
              <input
                value={val.url || ""}
                onChange={(e) => handleExtraChange(i, "url", e.target.value)}
                className="col-span-1 border rounded px-2 py-1"
                placeholder="URL (optional)"
              />
              <button
                onClick={() => removeExtraField(i)}
                className="text-red-600 text-xs"
              >
                ✕
              </button>
            </div>
          ))}
          <button
            onClick={addExtraField}
            className="text-sm text-blue-600 hover:underline"
          >
            + Add Extra Field
          </button>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 rounded bg-[color:var(--gsc-green)] text-white hover:opacity-90"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

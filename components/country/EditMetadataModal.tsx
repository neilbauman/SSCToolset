"use client";

import { useState, useEffect } from "react";

type Source = { name: string; url?: string };
type ExtraEntry = { label: string; value: string; url?: string };

type Metadata = {
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
  datasetSources: Source[];
  extra: Record<string, ExtraEntry>;
};

export default function EditMetadataModal({
  open,
  onClose,
  metadata,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  metadata: Metadata;
  onSave: (m: Metadata) => Promise<void>;
}) {
  const [form, setForm] = useState<Metadata>(metadata);

  const [newLabel, setNewLabel] = useState("");
  const [newValue, setNewValue] = useState("");
  const [newUrl, setNewUrl] = useState("");

  useEffect(() => {
    if (metadata) setForm(metadata);
  }, [metadata, open]);

  const handleSave = async () => {
    await onSave(form);
    onClose();
  };

  const handleUpdateExtra = (
    key: string,
    field: keyof ExtraEntry,
    value: string
  ) => {
    const current = form.extra[key] || { label: "", value: "" };
    const updated: ExtraEntry = { ...current, [field]: value };
    setForm({ ...form, extra: { ...form.extra, [key]: updated } });
  };

  const handleRemoveExtra = (key: string) => {
    const updated = { ...form.extra };
    delete updated[key];
    setForm({ ...form, extra: updated });
  };

  const handleAddExtra = () => {
    if (!newLabel.trim()) return;
    const newKey = newLabel.toLowerCase().replace(/\s+/g, "_");
    setForm({
      ...form,
      extra: {
        ...form.extra,
        [newKey]: { label: newLabel.trim(), value: newValue, url: newUrl || undefined },
      },
    });
    setNewLabel("");
    setNewValue("");
    setNewUrl("");
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-3xl overflow-y-auto max-h-[90vh]">
        <h2 className="text-lg font-semibold mb-4">Edit Metadata</h2>

        {/* Country basics */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium">ISO Code</label>
            <input
              type="text"
              value={form.iso_code}
              onChange={(e) =>
                setForm({ ...form, iso_code: e.target.value })
              }
              className="mt-1 block w-full border rounded px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Country Name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="mt-1 block w-full border rounded px-3 py-2 text-sm"
            />
          </div>
        </div>

        {/* Admin labels */}
        <div className="grid grid-cols-3 gap-4 mt-4">
          {Object.entries(form.admLabels).map(([lvl, val]) => (
            <div key={lvl}>
              <label className="block text-sm font-medium uppercase">
                {lvl}
              </label>
              <input
                type="text"
                value={val}
                onChange={(e) =>
                  setForm({
                    ...form,
                    admLabels: { ...form.admLabels, [lvl]: e.target.value },
                  })
                }
                className="mt-1 block w-full border rounded px-3 py-2 text-sm"
              />
            </div>
          ))}
        </div>

        {/* Dataset sources */}
        <div className="mt-4">
          <h3 className="text-sm font-semibold mb-2">Dataset Sources</h3>
          {form.datasetSources.map((src, i) => (
            <div key={i} className="flex gap-2 mb-2">
              <input
                type="text"
                placeholder="Name"
                value={src.name}
                onChange={(e) => {
                  const updated = [...form.datasetSources];
                  updated[i] = { ...updated[i], name: e.target.value };
                  setForm({ ...form, datasetSources: updated });
                }}
                className="border px-3 py-1 rounded flex-1 text-sm"
              />
              <input
                type="url"
                placeholder="URL"
                value={src.url || ""}
                onChange={(e) => {
                  const updated = [...form.datasetSources];
                  updated[i] = { ...updated[i], url: e.target.value };
                  setForm({ ...form, datasetSources: updated });
                }}
                className="border px-3 py-1 rounded flex-1 text-sm"
              />
            </div>
          ))}
          <button
            onClick={() =>
              setForm({
                ...form,
                datasetSources: [
                  ...form.datasetSources,
                  { name: "", url: "" },
                ],
              })
            }
            className="text-sm text-blue-600 hover:underline"
          >
            + Add Source
          </button>
        </div>

        {/* Extra metadata */}
        <div className="mt-4">
          <h3 className="text-sm font-semibold mb-2">Extra Metadata</h3>
          {Object.entries(form.extra).map(([k, v]) => (
            <div key={k} className="grid grid-cols-4 gap-2 mb-2">
              <div>
                <label className="block text-xs text-gray-500">Key</label>
                <input
                  type="text"
                  value={k}
                  readOnly
                  className="border px-3 py-1 rounded text-sm bg-gray-100"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500">Label</label>
                <input
                  type="text"
                  value={v.label}
                  onChange={(e) => handleUpdateExtra(k, "label", e.target.value)}
                  className="border px-3 py-1 rounded text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500">Value</label>
                <input
                  type="text"
                  value={v.value}
                  onChange={(e) => handleUpdateExtra(k, "value", e.target.value)}
                  className="border px-3 py-1 rounded text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500">URL (optional)</label>
                <input
                  type="url"
                  value={v.url || ""}
                  onChange={(e) => handleUpdateExtra(k, "url", e.target.value)}
                  className="border px-3 py-1 rounded text-sm"
                />
              </div>
              <button
                onClick={() => handleRemoveExtra(k)}
                className="col-span-4 text-red-600 text-xs mt-1"
              >
                Remove
              </button>
            </div>
          ))}

          {/* Add new extra */}
          <div className="grid grid-cols-4 gap-2 mt-3">
            <div>
              <label className="block text-xs text-gray-500">Label</label>
              <input
                type="text"
                placeholder="Label"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                className="border px-3 py-1 rounded text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500">Value</label>
              <input
                type="text"
                placeholder="Value"
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                className="border px-3 py-1 rounded text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500">URL (optional)</label>
              <input
                type="url"
                placeholder="URL"
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                className="border px-3 py-1 rounded text-sm"
              />
            </div>
          </div>
          <button
            onClick={handleAddExtra}
            className="text-sm text-blue-600 hover:underline mt-2"
          >
            + Add Extra Metadata
          </button>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-sm rounded bg-gray-100 hover:bg-gray-200"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-3 py-1.5 text-sm rounded bg-[color:var(--gsc-blue)] text-white hover:opacity-90"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

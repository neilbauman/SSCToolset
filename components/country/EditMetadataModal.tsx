"use client";

import { useState, useEffect } from "react";

type Source = { name: string; url?: string };
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
  extra: Record<string, string>;
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
  const [newExtraKey, setNewExtraKey] = useState("");
  const [newExtraValue, setNewExtraValue] = useState("");

  useEffect(() => {
    if (metadata) {
      setForm(metadata);
    }
  }, [metadata, open]);

  const handleChangeLabel = (level: keyof Metadata["admLabels"], value: string) => {
    setForm({
      ...form,
      admLabels: { ...form.admLabels, [level]: value },
    });
  };

  const handleAddExtra = () => {
    if (!newExtraKey.trim()) return;
    setForm({
      ...form,
      extra: { ...form.extra, [newExtraKey]: newExtraValue },
    });
    setNewExtraKey("");
    setNewExtraValue("");
  };

  const handleRemoveExtra = (key: string) => {
    const updated = { ...form.extra };
    delete updated[key];
    setForm({ ...form, extra: updated });
  };

  const handleSave = async () => {
    await onSave(form);
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-2xl">
        <h2 className="text-lg font-semibold mb-4">Edit Metadata</h2>

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
                  handleChangeLabel(lvl as keyof Metadata["admLabels"], e.target.value)
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
                datasetSources: [...form.datasetSources, { name: "", url: "" }],
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
            <div key={k} className="flex gap-2 mb-2">
              <input
                type="text"
                value={k}
                readOnly
                className="border px-3 py-1 rounded flex-1 text-sm bg-gray-100"
              />
              <input
                type="text"
                value={v}
                onChange={(e) => {
                  setForm({
                    ...form,
                    extra: { ...form.extra, [k]: e.target.value },
                  });
                }}
                className="border px-3 py-1 rounded flex-1 text-sm"
              />
              <button
                onClick={() => handleRemoveExtra(k)}
                className="text-red-600 text-sm"
              >
                Remove
              </button>
            </div>
          ))}
          <div className="flex gap-2 mt-2">
            <input
              type="text"
              placeholder="Key"
              value={newExtraKey}
              onChange={(e) => setNewExtraKey(e.target.value)}
              className="border px-3 py-1 rounded flex-1 text-sm"
            />
            <input
              type="text"
              placeholder="Value"
              value={newExtraValue}
              onChange={(e) => setNewExtraValue(e.target.value)}
              className="border px-3 py-1 rounded flex-1 text-sm"
            />
            <button
              onClick={handleAddExtra}
              className="text-sm text-blue-600 hover:underline"
            >
              Add
            </button>
          </div>
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

"use client";

import { useEffect, useMemo, useState } from "react";
import { X, Plus, Trash2 } from "lucide-react";

type ExtraEntry = {
  label: string;
  value: string;
  url?: string;
};

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
    extra: Record<string, ExtraEntry>;
  };
  onSave: (
    updated: EditMetadataModalProps["metadata"]
  ) => Promise<void>;
}

/** Normalize a label into a machine key */
function normalizeKey(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[\s\-]+/g, "_")
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

export default function EditMetadataModal({
  open,
  onClose,
  metadata,
  onSave,
}: EditMetadataModalProps) {
  const [form, setForm] = useState(deepClone(metadata));

  // Keep local form in sync if metadata changes while modal is open
  useEffect(() => {
    if (open) setForm(deepClone(metadata));
  }, [open, metadata]);

  const extraArray = useMemo(() => {
    return Object.entries(form.extra || {}).map(([key, entry]) => ({
      key,
      ...entry,
    }));
  }, [form.extra]);

  const setExtraFromArray = (
    rows: Array<{ key: string } & ExtraEntry>
  ) => {
    const record: Record<string, ExtraEntry> = {};
    for (const row of rows) {
      const safeKey = normalizeKey(row.label || row.key || "field");
      record[safeKey] = {
        label: row.label?.trim() || safeKey,
        value: row.value ?? "",
        url: row.url?.trim() || undefined,
      };
    }
    setForm((prev) => ({ ...prev, extra: record }));
  };

  if (!open) return null;

  const handleFieldChange = (field: keyof typeof form, value: string) => {
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
      [field]: value,
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

  // ------- Extra metadata -------
  const updateExtraRow = (
    rowIndex: number,
    field: "label" | "value" | "url",
    value: string
  ) => {
    const rows = deepClone(extraArray);
    rows[rowIndex][field] = value;

    // Auto-sync key from label always
    if (field === "label") {
      rows[rowIndex].key = normalizeKey(value);
    }

    setExtraFromArray(rows);
  };

  const addExtra = () => {
    const rows = deepClone(extraArray);
    rows.push({
      key: `field_${rows.length + 1}`,
      label: "New Field",
      value: "",
      url: "",
    });
    setExtraFromArray(rows);
  };

  const removeExtra = (rowIndex: number) => {
    const rows = deepClone(extraArray);
    rows.splice(rowIndex, 1);
    setExtraFromArray(rows);
  };

  const handleSubmit = async () => {
    const cleanedSources = (form.datasetSources || [])
      .map((s) => ({
        name: (s.name || "").trim(),
        url: (s.url || "").trim(),
      }))
      .filter((s) => s.name && s.url);

    const cleanedExtra = deepClone(form.extra || {});
    for (const k of Object.keys(cleanedExtra)) {
      const entry = cleanedExtra[k];
      entry.label = (entry.label || "").trim();
      entry.value = (entry.value || "").trim();
      entry.url = entry.url?.trim() || undefined;
    }

    await onSave({
      ...form,
      iso: (form.iso || "").toUpperCase(),
      datasetSources: cleanedSources,
      extra: cleanedExtra,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
      <div className="bg-white rounded-lg w-full max-w-4xl shadow-lg p-6 relative">
        {/* Header */}
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
        >
          <X className="w-5 h-5" />
        </button>
        <h2 className="text-lg font-semibold mb-4">Edit Metadata</h2>

        {/* ISO + Name */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
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
            <label className="block text-sm font-medium text-gray-700">
              Country Name
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => handleFieldChange("name", e.target.value)}
              className="w-full border rounded p-2 text-sm"
            />
          </div>
        </div>

        {/* ADM Labels */}
        <div className="mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(
              [
                ["adm0", "ADM0 Label"],
                ["adm1", "ADM1 Label"],
                ["adm2", "ADM2 Label"],
                ["adm3", "ADM3 Label"],
                ["adm4", "ADM4 Label"],
                ["adm5", "ADM5 Label"],
              ] as Array<[keyof typeof form.admLabels, string]>
            ).map(([lv, label]) => (
              <div key={lv}>
                <label className="block text-sm font-medium text-gray-700">
                  {label}
                </label>
                <input
                  type="text"
                  value={form.admLabels[lv] || ""}
                  onChange={(e) => handleAdmChange(lv, e.target.value)}
                  className="w-full border rounded p-2 text-sm"
                />
              </div>
            ))}
          </div>
        </div>

        {/* General Dataset Sources */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-[color:var(--gsc-red)] mb-2">
            General Dataset Sources
          </h3>
          {(form.datasetSources || []).map((src, idx) => (
            <div key={idx} className="flex flex-col md:flex-row gap-2 mb-2">
              <input
                type="text"
                placeholder="Name (e.g., HDX Portal)"
                value={src.name}
                onChange={(e) => handleSourceChange(idx, "name", e.target.value)}
                className="flex-1 border rounded p-2 text-sm"
              />
              <input
                type="url"
                placeholder="URL (https://...)"
                value={src.url}
                onChange={(e) => handleSourceChange(idx, "url", e.target.value)}
                className="flex-1 border rounded p-2 text-sm"
              />
              <button
                onClick={() => removeSource(idx)}
                className="shrink-0 text-red-500 hover:text-red-700 px-2 py-2 rounded self-start md:self-auto"
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
        <div className="mb-2">
          <h3 className="text-sm font-semibold text-[color:var(--gsc-red)] mb-2">
            Extra Metadata
          </h3>
          <div className="rounded border border-gray-200 divide-y">
            {extraArray.length === 0 && (
              <div className="p-3 text-sm text-gray-500">
                No extra metadata yet.
              </div>
            )}
            {extraArray.map((row, idx) => (
              <div key={`${row.key}-${idx}`} className="p-3">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-2">
                  {/* Readonly key */}
                  <div className="md:col-span-3">
                    <label className="block text-xs font-medium text-gray-600">
                      Key (auto-generated)
                    </label>
                    <input
                      type="text"
                      value={row.key}
                      readOnly
                      className="w-full border rounded p-2 text-sm bg-gray-100 text-gray-500 cursor-not-allowed"
                    />
                  </div>
                  {/* Editable label */}
                  <div className="md:col-span-3">
                    <label className="block text-xs font-medium text-gray-600">
                      Label (human readable)
                    </label>
                    <input
                      type="text"
                      value={row.label}
                      onChange={(e) => updateExtraRow(idx, "label", e.target.value)}
                      className="w-full border rounded p-2 text-sm"
                      placeholder="Official languages"
                    />
                  </div>
                  {/* Value */}
                  <div className="md:col-span-4">
                    <label className="block text-xs font-medium text-gray-600">
                      Value
                    </label>
                    <input
                      type="text"
                      value={row.value}
                      onChange={(e) => updateExtraRow(idx, "value", e.target.value)}
                      className="w-full border rounded p-2 text-sm"
                    />
                  </div>
                  {/* Optional URL */}
                  <div className="md:col-span-1">
                    <label className="block text-xs font-medium text-gray-600">
                      URL (optional)
                    </label>
                    <input
                      type="url"
                      value={row.url || ""}
                      onChange={(e) => updateExtraRow(idx, "url", e.target.value)}
                      className="w-full border rounded p-2 text-sm"
                    />
                  </div>
                  {/* Delete */}
                  <div className="md:col-span-1 flex items-end">
                    <button
                      onClick={() => removeExtra(idx)}
                      className="w-full text-red-500 hover:text-red-700 px-2 py-2 rounded"
                    >
                      <Trash2 className="w-4 h-4 mx-auto" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={addExtra}
            className="mt-2 flex items-center text-sm text-blue-600 hover:underline"
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

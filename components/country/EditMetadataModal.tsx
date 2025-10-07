"use client";

import { useState, useEffect } from "react";
import Modal from "@/components/ui/Modal";

type AdminLabels = {
  adm0: string;
  adm1: string;
  adm2: string;
  adm3: string;
  adm4: string;
  adm5: string;
};

type MetadataForm = {
  iso_code: string;
  name: string;
  admLabels: AdminLabels;
  datasetSources: string[];
  extra: Record<string, any>;
};

interface EditMetadataModalProps {
  open: boolean;
  onClose: () => void;
  metadata: MetadataForm;
  onSave: (updated: MetadataForm) => Promise<void> | void;
}

export default function EditMetadataModal({
  open,
  onClose,
  metadata,
  onSave,
}: EditMetadataModalProps) {
  const [form, setForm] = useState<MetadataForm>(metadata);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(metadata);
    }
  }, [open, metadata]);

  const handleChange = (
    key: keyof MetadataForm,
    value: string | string[] | Record<string, any>
  ) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleAdmLabelChange = (key: keyof AdminLabels, value: string) => {
    setForm((prev) => ({
      ...prev,
      admLabels: {
        ...prev.admLabels,
        [key]: value,
      },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(form);
      onClose();
    } catch (err) {
      console.error("Error saving metadata:", err);
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <Modal open={open} onClose={onClose}>
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Edit Country Metadata</h2>

        {/* Country Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="text-sm">
            <span className="block font-medium mb-1">ISO Code</span>
            <input
              type="text"
              value={form.iso_code}
              onChange={(e) => handleChange("iso_code", e.target.value)}
              className="w-full border rounded px-2 py-1 text-sm"
              disabled
            />
          </label>

          <label className="text-sm">
            <span className="block font-medium mb-1">Country Name</span>
            <input
              type="text"
              value={form.name}
              onChange={(e) => handleChange("name", e.target.value)}
              className="w-full border rounded px-2 py-1 text-sm"
            />
          </label>
        </div>

        {/* Administrative Labels */}
        <div>
          <h3 className="text-sm font-semibold mb-2 text-gray-700">
            Administrative Labels
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {Object.entries(form.admLabels).map(([key, value]) => (
              <label key={key} className="text-sm">
                <span className="block font-medium mb-1 uppercase">{key}</span>
                <input
                  type="text"
                  value={value}
                  onChange={(e) => handleAdmLabelChange(key as keyof AdminLabels, e.target.value)}
                  className="w-full border rounded px-2 py-1 text-sm"
                  placeholder={`Label for ${key}`}
                />
              </label>
            ))}
          </div>
        </div>

        {/* Dataset Sources */}
        <div>
          <h3 className="text-sm font-semibold mb-2 text-gray-700">
            Dataset Sources
          </h3>
          <textarea
            value={form.datasetSources.join("\n")}
            onChange={(e) => handleChange("datasetSources", e.target.value.split("\n"))}
            rows={4}
            className="w-full border rounded px-2 py-1 text-sm font-mono"
            placeholder="List one source per line (e.g., OCHA, NSO, UNHCR)"
          />
        </div>

        {/* Extra Metadata (JSON) */}
        <div>
          <h3 className="text-sm font-semibold mb-2 text-gray-700">Extra Metadata (JSON)</h3>
          <textarea
            value={JSON.stringify(form.extra, null, 2)}
            onChange={(e) => {
              try {
                const parsed = JSON.parse(e.target.value);
                handleChange("extra", parsed);
              } catch {
                // ignore invalid JSON input for now
              }
            }}
            rows={6}
            className="w-full border rounded px-2 py-1 text-sm font-mono"
            placeholder='{"key": "value"}'
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-3">
          <button
            onClick={onClose}
            className="border rounded px-3 py-1 text-sm hover:bg-gray-50"
            disabled={saving}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-[color:var(--gsc-red)] text-white rounded px-3 py-1 text-sm hover:opacity-90 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

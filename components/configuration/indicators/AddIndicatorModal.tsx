"use client";

import { useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";

type AddIndicatorModalProps = {
  open: boolean;
  onClose: () => void;
  onSaved: () => Promise<void>;
};

export default function AddIndicatorModal({ open, onClose, onSaved }: AddIndicatorModalProps) {
  const [form, setForm] = useState({
    code: "",
    name: "",
    description: "",
    unit: "",
    type: "gradient",
    topic: "",
    data_type: "percentage",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  async function handleSave() {
    setSaving(true);
    setError(null);

    const { error } = await supabase.from("indicator_catalogue").insert([
      {
        code: form.code.trim(),
        name: form.name.trim(),
        description: form.description.trim(),
        unit: form.unit.trim(),
        type: form.type.trim(),
        topic: form.topic.trim(),
        data_type: form.data_type.trim(),
      },
    ]);

    setSaving(false);

    if (error) {
      console.error("Failed to add indicator:", error);
      setError("Failed to add indicator.");
      return;
    }

    await onSaved();
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-lg p-6">
        <h2 className="text-lg font-semibold mb-4 text-[var(--gsc-blue)]">Add Indicator</h2>

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700">Code</label>
            <input
              name="code"
              value={form.code}
              onChange={handleChange}
              className="w-full border rounded px-2 py-1 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Name</label>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              className="w-full border rounded px-2 py-1 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              className="w-full border rounded px-2 py-1 text-sm"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">Unit</label>
              <input
                name="unit"
                value={form.unit}
                onChange={handleChange}
                className="w-full border rounded px-2 py-1 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Type</label>
              <input
                name="type"
                value={form.type}
                onChange={handleChange}
                className="w-full border rounded px-2 py-1 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Topic</label>
            <input
              name="topic"
              value={form.topic}
              onChange={handleChange}
              className="w-full border rounded px-2 py-1 text-sm"
            />
          </div>
        </div>

        {error && <p className="text-sm text-red-600 mt-2">{error}</p>}

        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={onClose}
            className="px-3 py-2 rounded-md text-sm border text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-3 py-2 rounded-md text-sm text-white"
            style={{ backgroundColor: "var(--gsc-blue)" }}
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

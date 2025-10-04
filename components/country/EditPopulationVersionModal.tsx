"use client";

import { useState, useEffect } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";

type Props = {
  open: boolean;
  onClose: () => void;
  version: {
    id: string;
    title: string;
    year: number;
    dataset_date?: string;
    source?: string;
    notes?: string;
  };
  onSave: () => Promise<void>;
};

export default function EditPopulationVersionModal({
  open,
  onClose,
  version,
  onSave,
}: Props) {
  const [form, setForm] = useState(version);

  useEffect(() => {
    if (version) setForm(version);
  }, [version]);

  if (!open) return null;

  const handleChange = (key: string, value: any) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    await supabase
      .from("population_dataset_versions")
      .update({
        title: form.title,
        year: form.year,
        dataset_date: form.dataset_date || null,
        source: form.source || null,
        notes: form.notes || null,
      })
      .eq("id", form.id);

    await onSave();
    onClose();
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-lg">
        <h2 className="text-lg font-semibold mb-4 text-gray-900">
          Edit Population Version
        </h2>

        <div className="space-y-3 text-sm">
          <div>
            <label className="block text-gray-700 font-medium mb-1">
              Title
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => handleChange("title", e.target.value)}
              className="border rounded px-2 py-1 w-full"
            />
          </div>

          <div>
            <label className="block text-gray-700 font-medium mb-1">
              Year
            </label>
            <input
              type="number"
              value={form.year}
              onChange={(e) => handleChange("year", Number(e.target.value))}
              className="border rounded px-2 py-1 w-full"
            />
          </div>

          <div>
            <label className="block text-gray-700 font-medium mb-1">
              Dataset Date
            </label>
            <input
              type="date"
              value={form.dataset_date || ""}
              onChange={(e) => handleChange("dataset_date", e.target.value)}
              className="border rounded px-2 py-1 w-full"
            />
          </div>

          <div>
            <label className="block text-gray-700 font-medium mb-1">
              Source
            </label>
            <input
              type="text"
              value={form.source || ""}
              onChange={(e) => handleChange("source", e.target.value)}
              className="border rounded px-2 py-1 w-full"
            />
          </div>

          <div>
            <label className="block text-gray-700 font-medium mb-1">
              Notes
            </label>
            <textarea
              value={form.notes || ""}
              onChange={(e) => handleChange("notes", e.target.value)}
              className="border rounded px-2 py-1 w-full h-20"
            />
          </div>
        </div>

        <div className="flex justify-end mt-5 space-x-2">
          <button
            onClick={onClose}
            className="px-4 py-2 border rounded text-sm text-gray-700 hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 rounded text-sm bg-[color:var(--gsc-red)] text-white hover:opacity-90"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

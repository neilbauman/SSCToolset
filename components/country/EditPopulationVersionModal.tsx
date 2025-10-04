"use client";
import React, { useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";

type EditPopulationVersionModalProps = {
  open: boolean;
  version: any;
  onClose: () => void;
  onSave: () => void;
};

export default function EditPopulationVersionModal({
  open,
  version,
  onClose,
  onSave,
}: EditPopulationVersionModalProps) {
  const [form, setForm] = useState({
    title: version?.title || "",
    year: version?.year || "",
    source: version?.source || "",
    notes: version?.notes || "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!open) return null;

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    const { error } = await supabase
      .from("population_dataset_versions")
      .update({
        title: form.title,
        year: form.year,
        source: form.source,
        notes: form.notes,
      })
      .eq("id", version.id);

    if (error) {
      setError(error.message);
      setSaving(false);
      return;
    }

    setSuccess(true);
    setTimeout(() => {
      setSaving(false);
      setSuccess(false);
      onClose();
      onSave();
    }, 1000);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
        <h2 className="text-lg font-semibold mb-3 text-[color:var(--gsc-red)]">
          Edit Population Version
        </h2>
        <div className="space-y-3 text-sm">
          <div>
            <label className="block font-medium">Title</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full border rounded px-2 py-1 mt-1"
            />
          </div>
          <div>
            <label className="block font-medium">Year</label>
            <input
              type="number"
              value={form.year}
              onChange={(e) => setForm({ ...form, year: e.target.value })}
              className="w-full border rounded px-2 py-1 mt-1"
            />
          </div>
          <div>
            <label className="block font-medium">Source (optional)</label>
            <input
              type="text"
              value={form.source}
              onChange={(e) => setForm({ ...form, source: e.target.value })}
              className="w-full border rounded px-2 py-1 mt-1"
            />
          </div>
          <div>
            <label className="block font-medium">Notes (optional)</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full border rounded px-2 py-1 mt-1"
            />
          </div>
        </div>

        {error && <p className="text-[color:var(--gsc-red)] text-sm mt-3">{error}</p>}
        {success && <p className="text-green-600 text-sm mt-3">✔ Saved successfully</p>}

        <div className="flex justify-end gap-3 mt-5">
          <button
            onClick={onClose}
            className="bg-gray-100 text-gray-800 px-3 py-1.5 rounded hover:bg-gray-200"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-[color:var(--gsc-red)] text-white px-3 py-1.5 rounded hover:opacity-90 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

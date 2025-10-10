"use client";

import { useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";

type EditPopulationVersionModalProps = {
  version: {
    id: string;
    title: string;
    year: number | null;
    dataset_date: string | null;
    source: string | null;
    notes?: string | null;
  };
  onClose: () => void;
  onSaved: () => Promise<void>;
};

export default function EditPopulationVersionModal({ version, onClose, onSaved }: EditPopulationVersionModalProps) {
  const [form, setForm] = useState(version);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await supabase
      .from("population_dataset_versions")
      .update({
        title: form.title?.trim() || null,
        year: form.year || null,
        dataset_date: form.dataset_date || null,
        source: form.source || null,
        notes: form.notes || null,
      })
      .eq("id", form.id);
    setSaving(false);
    await onSaved();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-5 w-full max-w-md">
        <h3 className="text-lg font-semibold mb-3">Edit Population Dataset</h3>

        <div className="space-y-2 text-sm">
          {["title", "year", "dataset_date", "source", "notes"].map(f => (
            <label key={f} className="block capitalize">
              {f.replace("_", " ")}
              {f === "notes" ? (
                <textarea
                  value={(form as any)[f] ?? ""}
                  onChange={e => setForm({ ...form, [f]: e.target.value || null })}
                  className="border rounded w-full px-2 py-1 mt-1 text-sm"
                />
              ) : (
                <input
                  type={f === "year" ? "number" : f === "dataset_date" ? "date" : "text"}
                  value={(form as any)[f] ?? ""}
                  onChange={e => setForm({ ...form, [f]: e.target.value || null })}
                  className="border rounded w-full px-2 py-1 mt-1"
                />
              )}
            </label>
          ))}
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={onClose}
            className="px-3 py-1 text-sm border rounded"
            disabled={saving}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-3 py-1 text-sm bg-[color:var(--gsc-green)] text-white rounded"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

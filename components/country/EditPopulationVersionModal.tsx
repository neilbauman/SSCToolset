"use client";
import { useState } from "react";
import { X } from "lucide-react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";

export interface EditPopulationVersionModalProps {
  version: {
    id: string;
    title: string;
    year: number | null;
    dataset_date: string | null;
    source_name: string | null;
    source_url: string | null;
    notes: string | null;
  };
  onClose: () => void;
  onSaved: () => Promise<void> | void;
}

export default function EditPopulationVersionModal({
  version,
  onClose,
  onSaved,
}: EditPopulationVersionModalProps) {
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
        source_name: form.source_name?.trim() || null,
        source_url: form.source_url?.trim() || null,
        notes: form.notes?.trim() || null,
      })
      .eq("id", form.id);
    setSaving(false);
    await onSaved();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-5 w-full max-w-md">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-lg font-semibold">Edit Population Version</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3 text-sm">
          {[
            "title",
            "year",
            "dataset_date",
            "source_name",
            "source_url",
            "notes",
          ].map((f) => (
            <label key={f} className="block capitalize">
              {f.replace("_", " ")}
              {f === "notes" ? (
                <textarea
                  value={(form as any)[f] ?? ""}
                  onChange={(e) =>
                    setForm({ ...form, [f]: e.target.value || null })
                  }
                  className="border rounded w-full px-2 py-1 mt-1 text-sm"
                />
              ) : (
                <input
                  type={
                    f === "year"
                      ? "number"
                      : f === "dataset_date"
                      ? "date"
                      : f === "source_url"
                      ? "url"
                      : "text"
                  }
                  value={(form as any)[f] ?? ""}
                  onChange={(e) =>
                    setForm({ ...form, [f]: e.target.value || null })
                  }
                  className="border rounded w-full px-2 py-1 mt-1 text-sm"
                />
              )}
            </label>
          ))}
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose} className="px-3 py-1 text-sm border rounded">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-3 py-1 text-sm bg-[color:var(--gsc-green)] text-white rounded hover:opacity-90"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

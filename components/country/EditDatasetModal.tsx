"use client";

import { useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { X } from "lucide-react";
import type { DatasetMeta } from "@/types/datasets";

type Props = {
  open: boolean;
  dataset: DatasetMeta;
  onClose: () => void;
  onSave: () => void;
};

export default function EditDatasetModal({ open, dataset, onClose, onSave }: Props) {
  const [form, setForm] = useState<DatasetMeta>(dataset);
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  const handleChange = (field: keyof DatasetMeta, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("dataset_metadata")
      .update({
        title: form.title,
        description: form.description,
        year: form.year,
        unit: form.unit,
        admin_level: form.admin_level,
        data_type: form.data_type,
        source: form.source,
        theme: form.theme,
      })
      .eq("id", form.id);
    setSaving(false);
    if (!error) onSave();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-5 w-full max-w-lg">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-lg font-semibold">Edit Dataset</h3>
          <button onClick={onClose}>
            <X className="w-5 h-5 text-gray-500 hover:text-black" />
          </button>
        </div>

        <div className="space-y-3 text-sm">
          {[
            ["Title", "title"],
            ["Description", "description"],
            ["Year", "year"],
            ["Unit", "unit"],
            ["Admin Level", "admin_level"],
            ["Data Type", "data_type"],
            ["Theme", "theme"],
            ["Source", "source"],
          ].map(([label, key]) => (
            <div key={key}>
              <label className="block text-gray-700">{label}</label>
              <input
                type={key === "year" ? "number" : "text"}
                value={(form as any)[key] || ""}
                onChange={(e) => handleChange(key as keyof DatasetMeta, e.target.value)}
                className="border rounded w-full px-2 py-1 mt-1 text-sm"
              />
            </div>
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

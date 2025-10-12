"use client";

import { useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { X, Loader2 } from "lucide-react";
import type { DatasetMeta } from "@/types/datasets";

type Props = {
  open: boolean;
  onClose: () => void;
  countryIso: string;
  onUploaded: () => void;
};

export default function AddDatasetModal({ open, onClose, countryIso, onUploaded }: Props) {
  const [form, setForm] = useState<Partial<DatasetMeta>>({
    title: "",
    description: "",
    year: undefined,
    unit: "",
    admin_level: "ADM0",
    data_type: "numeric",
    theme: "",
    source: "",
    upload_type: "manual",
    country_iso: countryIso,
  });
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  const handleChange = (field: keyof DatasetMeta, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!form.title) {
      alert("A dataset title is required.");
      return;
    }
    setSaving(true);

    const { error } = await supabase.from("dataset_metadata").insert([
      {
        title: form.title,
        description: form.description || null,
        year: form.year ? Number(form.year) : null,
        unit: form.unit || null,
        admin_level: form.admin_level || "ADM0",
        data_type: form.data_type || "numeric",
        theme: form.theme || null,
        source: form.source || null,
        upload_type: form.upload_type || "manual",
        country_iso: countryIso,
      },
    ]);

    setSaving(false);
    if (error) {
      console.error("Error inserting dataset:", error);
      alert("Error saving dataset. Check console for details.");
    } else {
      onUploaded();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-5 w-full max-w-lg">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-lg font-semibold text-[color:var(--gsc-gray)]">
            Add Dataset
          </h3>
          <button onClick={onClose}>
            <X className="w-5 h-5 text-gray-500 hover:text-black" />
          </button>
        </div>

        <div className="space-y-3 text-sm">
          {[
            ["Title *", "title", "text"],
            ["Description", "description", "text"],
            ["Year", "year", "number"],
            ["Unit", "unit", "text"],
          ].map(([label, key, type]) => (
            <div key={key}>
              <label className="block text-gray-700">{label}</label>
              <input
                type={type}
                value={(form as any)[key] || ""}
                onChange={(e) => handleChange(key as keyof DatasetMeta, e.target.value)}
                className="border rounded w-full px-2 py-1 mt-1 text-sm"
              />
            </div>
          ))}

          <div>
            <label className="block text-gray-700">Admin Level</label>
            <select
              value={form.admin_level || "ADM0"}
              onChange={(e) => handleChange("admin_level", e.target.value)}
              className="border rounded w-full px-2 py-1 mt-1 text-sm"
            >
              <option value="ADM0">ADM0 (National)</option>
              <option value="ADM1">ADM1</option>
              <option value="ADM2">ADM2</option>
              <option value="ADM3">ADM3</option>
              <option value="ADM4">ADM4</option>
            </select>
          </div>

          <div>
            <label className="block text-gray-700">Data Type</label>
            <select
              value={form.data_type || "numeric"}
              onChange={(e) => handleChange("data_type", e.target.value)}
              className="border rounded w-full px-2 py-1 mt-1 text-sm"
            >
              <option value="numeric">Numeric</option>
              <option value="percentage">Percentage</option>
              <option value="categorical">Categorical</option>
            </select>
          </div>

          <div>
            <label className="block text-gray-700">Theme</label>
            <input
              type="text"
              value={form.theme || ""}
              onChange={(e) => handleChange("theme", e.target.value)}
              className="border rounded w-full px-2 py-1 mt-1 text-sm"
              placeholder="e.g. Population, Health, Economy"
            />
          </div>

          <div>
            <label className="block text-gray-700">Source</label>
            <input
              type="text"
              value={form.source || ""}
              onChange={(e) => handleChange("source", e.target.value)}
              className="border rounded w-full px-2 py-1 mt-1 text-sm"
              placeholder="e.g. National Statistics Office"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-5">
          <button
            onClick={onClose}
            className="px-3 py-1 text-sm border rounded text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-3 py-1 text-sm bg-[color:var(--gsc-red)] text-white rounded hover:opacity-90 flex items-center"
          >
            {saving ? (
              <>
                <Loader2 className="animate-spin w-4 h-4 mr-1" /> Saving...
              </>
            ) : (
              "Save Dataset"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

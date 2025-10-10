"use client";

import { useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";

export default function AddNationalStatModal({
  open,
  onClose,
  countryIso,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  countryIso: string;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState("");
  const [value, setValue] = useState("");
  const [unit, setUnit] = useState("");
  const [source, setSource] = useState("");
  const [theme, setTheme] = useState("");
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const handleSave = async () => {
    if (!title || !value) return alert("Please fill in all required fields.");
    setLoading(true);

    const { error } = await supabase.from("dataset_metadata").insert([
      {
        country_iso: countryIso,
        title,
        description: "National Statistic",
        source,
        theme,
        upload_type: "national_statistic",
        admin_level: "ADM0",
        join_field: null,
        value: parseFloat(value),
        unit,
        created_at: new Date().toISOString(),
      },
    ]);

    if (error) {
      alert("Save failed: " + error.message);
    } else {
      alert("Saved successfully.");
      onSaved();
      onClose();
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 z-50 flex justify-center items-center">
      <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-lg">
        <h2 className="text-lg font-semibold mb-4">Add National Statistic</h2>

        <label className="block mb-1 text-sm font-medium">Title</label>
        <input
          className="w-full border rounded p-2 mb-3"
          placeholder="e.g. Average Household Size"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <label className="block mb-1 text-sm font-medium">Value</label>
        <input
          type="number"
          className="w-full border rounded p-2 mb-3"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />

        <label className="block mb-1 text-sm font-medium">Unit</label>
        <input
          className="w-full border rounded p-2 mb-3"
          placeholder="e.g. people, %, km²"
          value={unit}
          onChange={(e) => setUnit(e.target.value)}
        />

        <label className="block mb-1 text-sm font-medium">Source</label>
        <input
          className="w-full border rounded p-2 mb-3"
          placeholder="e.g. National Statistics Office"
          value={source}
          onChange={(e) => setSource(e.target.value)}
        />

        <label className="block mb-1 text-sm font-medium">Theme</label>
        <input
          className="w-full border rounded p-2 mb-3"
          placeholder="e.g. Demographics"
          value={theme}
          onChange={(e) => setTheme(e.target.value)}
        />

        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-3 py-1 text-sm border rounded">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:opacity-90"
          >
            {loading ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

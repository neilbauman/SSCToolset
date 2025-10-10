"use client";

import { useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { X } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  countryIso: string;
  dataset: any;
}

export default function EditDatasetModal({ open, onClose, onSaved, countryIso, dataset }: Props) {
  const [title, setTitle] = useState(dataset.title || "");
  const [theme, setTheme] = useState(dataset.theme || "");
  const [adminLevel, setAdminLevel] = useState(dataset.admin_level || "ADM0");
  const [sourceName, setSourceName] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!title.trim()) return alert("Title is required");
    setSaving(true);

    const source =
      sourceName || sourceUrl ? JSON.stringify({ name: sourceName, url: sourceUrl }) : dataset.source || null;

    if (dataset.id) {
      await supabase
        .from("dataset_metadata")
        .update({
          title,
          theme,
          admin_level: adminLevel,
          source,
          updated_at: new Date().toISOString(),
        })
        .eq("id", dataset.id);
    } else {
      await supabase.from("dataset_metadata").insert([
        {
          country_iso: countryIso,
          title,
          theme,
          admin_level: adminLevel,
          source,
          upload_type: "manual",
        },
      ]);
    }

    setSaving(false);
    onSaved();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-5 w-full max-w-md">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-lg font-semibold">{dataset.id ? "Edit Dataset" : "Add Dataset"}</h3>
          <button onClick={onClose}>
            <X className="w-5 h-5 text-gray-500 hover:text-black" />
          </button>
        </div>

        <div className="space-y-2 text-sm">
          <label className="block">
            Title <span className="text-red-600">*</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="border rounded w-full px-2 py-1 mt-1"
            />
          </label>

          <label className="block">
            Theme
            <input
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              className="border rounded w-full px-2 py-1 mt-1"
            />
          </label>

          <label className="block">
            Admin Level
            <select
              value={adminLevel}
              onChange={(e) => setAdminLevel(e.target.value)}
              className="border rounded w-full px-2 py-1 mt-1"
            >
              {["ADM0", "ADM1", "ADM2", "ADM3", "ADM4", "ADM5"].map((lvl) => (
                <option key={lvl}>{lvl}</option>
              ))}
            </select>
          </label>

          <label className="block">
            Source Name
            <input
              value={sourceName}
              onChange={(e) => setSourceName(e.target.value)}
              className="border rounded w-full px-2 py-1 mt-1"
            />
          </label>

          <label className="block">
            Source URL
            <input
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              className="border rounded w-full px-2 py-1 mt-1"
            />
          </label>
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose} className="px-3 py-1 text-sm border rounded">
            Cancel
          </button>
          <button
            disabled={saving}
            onClick={handleSave}
            className="px-3 py-1 text-sm bg-[color:var(--gsc-green)] text-white rounded hover:opacity-90"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

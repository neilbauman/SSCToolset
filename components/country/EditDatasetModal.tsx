"use client";
import { useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { Loader2 } from "lucide-react";

interface EditDatasetModalProps {
  open: boolean;
  dataset: any;
  onClose: () => void;
  onUpdated: () => void;
}

export default function EditDatasetModal({ open, dataset, onClose, onUpdated }: EditDatasetModalProps) {
  const [form, setForm] = useState(() => {
    let src = null;
    try {
      src = dataset.source ? JSON.parse(dataset.source) : null;
    } catch {
      src = null;
    }
    return {
      title: dataset.title || "",
      description: dataset.description || "",
      sourceName: src?.name || "",
      sourceUrl: src?.url || "",
    };
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const sourceObj =
      form.sourceName && form.sourceUrl
        ? JSON.stringify({ name: form.sourceName, url: form.sourceUrl })
        : form.sourceName
        ? JSON.stringify({ name: form.sourceName })
        : null;

    const { error } = await supabase
      .from("dataset_metadata")
      .update({
        title: form.title.trim(),
        description: form.description || null,
        source: sourceObj,
        updated_at: new Date().toISOString(),
      })
      .eq("id", dataset.id);

    setSaving(false);
    if (error) {
      console.error(error);
      alert("Error saving changes.");
    } else {
      onUpdated();
      onClose();
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-5 w-full max-w-md">
        <h2 className="text-lg font-semibold mb-3">Edit Dataset</h2>

        <div className="space-y-3 mb-4">
          <div>
            <label className="block text-sm font-medium">Title *</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="border rounded px-2 py-1 w-full text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="border rounded px-2 py-1 w-full text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Source Name</label>
            <input
              type="text"
              value={form.sourceName}
              onChange={(e) => setForm({ ...form, sourceName: e.target.value })}
              className="border rounded px-2 py-1 w-full text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Source URL</label>
            <input
              type="text"
              value={form.sourceUrl}
              onChange={(e) => setForm({ ...form, sourceUrl: e.target.value })}
              className="border rounded px-2 py-1 w-full text-sm"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-1 text-sm border rounded">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-3 py-1 text-sm bg-[color:var(--gsc-green)] text-white rounded flex items-center gap-1 disabled:opacity-60"
          >
            {saving && <Loader2 className="animate-spin w-4 h-4" />} Save
          </button>
        </div>
      </div>
    </div>
  );
}

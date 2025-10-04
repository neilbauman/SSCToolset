"use client";

import { useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";

type Props = {
  open: boolean;
  onClose: () => void;
  version: {
    id: string;
    title: string;
    year: number;
    dataset_date: string | null;
    source: string | null;
    notes: string | null;
  };
  onSaved: () => Promise<void> | void;
};

export default function EditAdminDatasetVersionModal({
  open,
  onClose,
  version,
  onSaved,
}: Props) {
  const [title, setTitle] = useState(version.title || "");
  const [year, setYear] = useState<number>(version.year || new Date().getFullYear());
  const [datasetDate, setDatasetDate] = useState<string>(version.dataset_date || "");
  const [source, setSource] = useState<string>(version.source || "");
  const [notes, setNotes] = useState<string>(version.notes || "");
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  const save = async () => {
    setSaving(true);
    await supabase
      .from("admin_dataset_versions")
      .update({
        title: title || null,
        year: year || null,
        dataset_date: datasetDate || null,
        source: source || null,
        notes: notes || null,
      })
      .eq("id", version.id);

    setSaving(false);
    await onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="w-full max-w-md rounded bg-white p-4 shadow-lg">
        <h3 className="text-lg font-semibold mb-3">Edit Version</h3>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Title</label>
            <input
              className="w-full border rounded px-3 py-2 text-sm"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., NSO Gazetteer 2021"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Year</label>
            <input
              type="number"
              className="w-full border rounded px-3 py-2 text-sm"
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value || "0", 10))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Dataset Date</label>
            <input
              type="date"
              className="w-full border rounded px-3 py-2 text-sm"
              value={datasetDate}
              onChange={(e) => setDatasetDate(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Source</label>
            <input
              className="w-full border rounded px-3 py-2 text-sm"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              placeholder="e.g., https://nso.gov/data"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Notes</label>
            <textarea
              className="w-full border rounded px-3 py-2 text-sm"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3 py-1 text-sm rounded border hover:bg-gray-50"
            disabled={saving}
          >
            Cancel
          </button>
          <button
            onClick={save}
            className="px-3 py-1 text-sm rounded bg-[color:var(--gsc-red)] text-white hover:opacity-90 disabled:opacity-60"
            disabled={saving}
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

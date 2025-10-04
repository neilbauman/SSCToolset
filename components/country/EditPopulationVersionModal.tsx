"use client";

import { useState } from "react";
import { Dialog } from "@headlessui/react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { X, Pencil } from "lucide-react";

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
  onSave: () => void;
};

export default function EditPopulationVersionModal({
  open,
  onClose,
  version,
  onSave,
}: Props) {
  const [title, setTitle] = useState(version.title);
  const [year, setYear] = useState(version.year);
  const [datasetDate, setDatasetDate] = useState(version.dataset_date || "");
  const [source, setSource] = useState(version.source || "");
  const [notes, setNotes] = useState(version.notes || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async () => {
    try {
      if (!title || !year) {
        setError("Title and year are required.");
        return;
      }

      setSaving(true);
      const { error: updateError } = await supabase
        .from("population_dataset_versions")
        .update({
          title,
          year,
          dataset_date: datasetDate || null,
          source,
          notes,
        })
        .eq("id", version.id);

      if (updateError) throw updateError;

      setSaving(false);
      onSave();
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Error updating version.");
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="bg-white rounded-lg p-6 w-full max-w-md shadow-lg">
          <div className="flex justify-between items-center mb-4">
            <Dialog.Title className="text-lg font-semibold flex items-center gap-2">
              <Pencil className="w-5 h-5 text-[color:var(--gsc-red)]" />
              Edit Population Version
            </Dialog.Title>
            <button onClick={onClose}>
              <X className="w-5 h-5 text-gray-500 hover:text-gray-700" />
            </button>
          </div>

          {error && <p className="text-red-600 text-sm mb-2">{error}</p>}

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium">Title *</label>
              <input
                type="text"
                className="border rounded w-full p-2 text-sm"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium">Year *</label>
              <input
                type="number"
                className="border rounded w-full p-2 text-sm"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
              />
            </div>

            <div>
              <label className="block text-sm font-medium">Dataset Date</label>
              <input
                type="date"
                className="border rounded w-full p-2 text-sm"
                value={datasetDate}
                onChange={(e) => setDatasetDate(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium">Source</label>
              <input
                type="text"
                className="border rounded w-full p-2 text-sm"
                value={source}
                onChange={(e) => setSource(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium">Notes</label>
              <textarea
                className="border rounded w-full p-2 text-sm"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-sm border rounded hover:bg-gray-50"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-3 py-1.5 text-sm rounded text-white bg-[color:var(--gsc-red)] hover:opacity-90"
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}

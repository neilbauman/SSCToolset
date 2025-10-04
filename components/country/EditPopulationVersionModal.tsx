"use client";

import { useState, useEffect } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";

type Props = {
  open: boolean;
  onClose: () => void;
  version: any | null;
  onUpdated: () => void;
};

export default function EditPopulationVersionModal({ open, onClose, version, onUpdated }: Props) {
  const [title, setTitle] = useState("");
  const [year, setYear] = useState<number | "">("");
  const [datasetDate, setDatasetDate] = useState("");
  const [source, setSource] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (version) {
      setTitle(version.title || "");
      setYear(version.year || "");
      setDatasetDate(version.dataset_date || "");
      setSource(version.source || "");
      setNotes(version.notes || "");
    }
  }, [version]);

  const handleSave = async () => {
    if (!version) return;
    await supabase
      .from("population_dataset_versions")
      .update({
        title,
        year,
        dataset_date: datasetDate || null,
        source,
        notes,
      })
      .eq("id", version.id);
    onUpdated();
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-lg">
        <h2 className="text-lg font-semibold mb-4">Edit Population Dataset</h2>
        <div className="space-y-3">
          <input
            type="text"
            placeholder="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="border rounded w-full px-3 py-2 text-sm"
          />
          <input
            type="number"
            placeholder="Year"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="border rounded w-full px-3 py-2 text-sm"
          />
          <input
            type="date"
            value={datasetDate}
            onChange={(e) => setDatasetDate(e.target.value)}
            className="border rounded w-full px-3 py-2 text-sm"
          />
          <input
            type="text"
            placeholder="Source"
            value={source}
            onChange={(e) => setSource(e.target.value)}
            className="border rounded w-full px-3 py-2 text-sm"
          />
          <textarea
            placeholder="Notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="border rounded w-full px-3 py-2 text-sm"
          />
        </div>
        <div className="flex justify-end space-x-2 mt-4">
          <button onClick={onClose} className="px-4 py-2 border rounded text-sm">
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-[color:var(--gsc-red)] text-white rounded text-sm"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

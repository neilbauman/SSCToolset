"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";

type Version = {
  id: string;
  title: string | null;
  year: number;
  dataset_date: string | null;
  source: string | null;
  is_active: boolean;
  country_iso: string;
  notes?: string | null;
};

type Props = {
  open: boolean;
  onClose: () => void;
  version: Version;
  onSaved: () => void;
};

export default function EditPopulationVersionModal({ open, onClose, version, onSaved }: Props) {
  const [title, setTitle] = useState<string>(version.title || "");
  const [year, setYear] = useState<number>(version.year);
  const [datasetDate, setDatasetDate] = useState<string>(version.dataset_date || "");
  const [source, setSource] = useState<string>(version.source || "");
  const [notes, setNotes] = useState<string>(version.notes || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setTitle(version.title || "");
      setYear(version.year);
      setDatasetDate(version.dataset_date || "");
      setSource(version.source || "");
      setNotes(version.notes || "");
      setBusy(false);
      setError(null);
    }
  }, [open, version]);

  if (!open) return null;

  const handleSave = async () => {
    setError(null);
    setBusy(true);
    try {
      const { error: e } = await supabase
        .from("population_dataset_versions")
        .update({
          title: title || null,
          year,
          dataset_date: datasetDate || null,
          source: source || null,
          notes: notes || null,
        })
        .eq("id", version.id);
      if (e) throw e;
      onSaved();
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to save.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[1000]">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-4">
        <h3 className="text-lg font-semibold mb-3">Edit Population Version</h3>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium">Title (optional)</label>
            <input className="border rounded px-3 py-1 w-full" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium">Year</label>
            <input
              type="number"
              className="border rounded px-3 py-1 w-40"
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value || "0", 10))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Dataset Date</label>
            <input
              type="date"
              className="border rounded px-3 py-1"
              value={datasetDate}
              onChange={(e) => setDatasetDate(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Source (optional)</label>
            <input className="border rounded px-3 py-1 w-full" value={source} onChange={(e) => setSource(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium">Notes (optional)</label>
            <textarea className="border rounded px-3 py-1 w-full" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          {error && <div className="text-red-700 text-sm">{error}</div>}
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-1 border rounded disabled:opacity-50" disabled={busy}>
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-3 py-1 rounded text-white bg-[color:var(--gsc-red)] disabled:opacity-50"
            disabled={busy}
          >
            {busy ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

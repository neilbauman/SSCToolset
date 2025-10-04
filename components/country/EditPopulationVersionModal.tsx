"use client";

import { useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";

type PopulationVersion = {
  id: string;
  title: string;
  year: number;
  dataset_date?: string;
  source?: string;
  is_active: boolean;
};

type Props = {
  open: boolean;
  onClose: () => void;
  version: PopulationVersion | null;
  onSave: () => void;
};

export default function EditPopulationVersionModal({
  open,
  onClose,
  version,
  onSave,
}: Props) {
  const [title, setTitle] = useState(version?.title || "");
  const [year, setYear] = useState(version?.year || new Date().getFullYear());
  const [datasetDate, setDatasetDate] = useState(version?.dataset_date || "");
  const [source, setSource] = useState(version?.source || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!version) return;
    setLoading(true);
    setError(null);

    try {
      const { error: err } = await supabase
        .from("population_dataset_versions")
        .update({
          title,
          year,
          dataset_date: datasetDate || null,
          source,
        })
        .eq("id", version.id);

      if (err) throw err;

      onSave();
      onClose();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <div className="p-4 space-y-3">
        <h2 className="text-lg font-semibold">Edit Population Dataset</h2>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <input
          type="text"
          placeholder="Title"
          className="border rounded px-2 py-1 w-full"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <input
          type="number"
          placeholder="Year"
          className="border rounded px-2 py-1 w-full"
          value={year}
          onChange={(e) => setYear(parseInt(e.target.value))}
        />
        <input
          type="date"
          className="border rounded px-2 py-1 w-full"
          value={datasetDate}
          onChange={(e) => setDatasetDate(e.target.value)}
        />
        <input
          type="text"
          placeholder="Source"
          className="border rounded px-2 py-1 w-full"
          value={source}
          onChange={(e) => setSource(e.target.value)}
        />
        <div className="flex justify-end gap-2 mt-3">
          <button onClick={onClose} className="px-3 py-1 border rounded">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-3 py-1 bg-[color:var(--gsc-red)] text-white rounded hover:opacity-90"
          >
            {loading ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </Dialog>
  );
}

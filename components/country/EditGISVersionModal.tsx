"use client";

import { useEffect, useState } from "react";
import Modal from "@/components/ui/Modal";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";

interface Props {
  open: boolean;
  version: {
    id: string;
    title: string;
    source?: string | null;
    year?: number | null;
  };
  onClose: () => void;
  onSaved: () => Promise<void> | void;
}

export default function EditGISVersionModal({ open, version, onClose, onSaved }: Props) {
  const [title, setTitle] = useState(version?.title || "");
  const [source, setSource] = useState(version?.source || "");
  const [year, setYear] = useState<string>(version?.year ? String(version.year) : "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && version) {
      setTitle(version.title || "");
      setSource(version.source || "");
      setYear(version.year ? String(version.year) : "");
      setError(null);
      setBusy(false);
    }
  }, [open, version]);

  const handleSave = async () => {
    if (!title.trim()) {
      setError("Title is required.");
      return;
    }

    try {
      setBusy(true);
      setError(null);

      const updates = {
        title: title.trim(),
        source: source?.trim() || null,
        year: year ? parseInt(year, 10) : null,
      };

      const { error } = await supabase
        .from("gis_dataset_versions")
        .update(updates)
        .eq("id", version.id);

      if (error) throw error;

      await onSaved();
      onClose();
    } catch (e: any) {
      console.error("Error updating GIS version:", e);
      setError(e.message || "Failed to update version.");
    } finally {
      setBusy(false);
    }
  };

  if (!open) return null;

  return (
    <Modal open={open} onClose={onClose}>
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Edit Dataset Version</h3>

        {error && (
          <div className="text-sm text-red-700 bg-red-50 border border-red-200 p-2 rounded">
            {error}
          </div>
        )}

        <div className="space-y-3">
          <label className="block text-sm">
            <span className="block font-medium mb-1">Title *</span>
            <input
              type="text"
              className="w-full border rounded px-2 py-1 text-sm"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Version title (e.g., Philippines GIS 2025)"
            />
          </label>

          <label className="block text-sm">
            <span className="block font-medium mb-1">Source</span>
            <input
              type="text"
              className="w-full border rounded px-2 py-1 text-sm"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              placeholder="e.g., PSA, OCHA, NAMRIA"
            />
          </label>

          <label className="block text-sm">
            <span className="block font-medium mb-1">Year</span>
            <input
              type="number"
              className="w-full border rounded px-2 py-1 text-sm"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              placeholder="e.g., 2024"
              min="1900"
              max={new Date().getFullYear() + 1}
            />
          </label>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <button
            onClick={onClose}
            className="border rounded px-3 py-1 text-sm"
            disabled={busy}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={busy}
            className="bg-[color:var(--gsc-red)] text-white rounded px-3 py-1 text-sm disabled:opacity-60"
          >
            {busy ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

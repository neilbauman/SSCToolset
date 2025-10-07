"use client";

import { useEffect, useState } from "react";
import Modal from "@/components/ui/Modal";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";

interface Props {
  open: boolean;
  onClose: () => void;
  countryIso: string; // ✅ added to fix build
  datasetVersionId?: string;
  onSaved: () => void;
}

export default function EditGISVersionModal({
  open,
  onClose,
  countryIso,
  datasetVersionId,
  onSaved,
}: Props) {
  const isEditing = Boolean(datasetVersionId);

  const [title, setTitle] = useState("");
  const [year, setYear] = useState<number | null>(null);
  const [source, setSource] = useState("");
  const [isActive, setIsActive] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load existing data if editing
  useEffect(() => {
    const fetchVersion = async () => {
      if (!datasetVersionId) return;
      const { data, error } = await supabase
        .from("gis_dataset_versions")
        .select("*")
        .eq("id", datasetVersionId)
        .single();
      if (error) {
        console.error("Error fetching version:", error);
        return;
      }
      if (data) {
        setTitle(data.title || "");
        setYear(data.year || null);
        setSource(data.source || "");
        setIsActive(!!data.is_active);
      }
    };
    if (open && isEditing) fetchVersion();
  }, [open, datasetVersionId, isEditing]);

  const handleSave = async () => {
    if (!title.trim()) {
      setError("Title is required.");
      return;
    }

    setBusy(true);
    setError(null);

    try {
      if (isEditing) {
        const { error: updateErr } = await supabase
          .from("gis_dataset_versions")
          .update({
            title,
            year,
            source,
            is_active: isActive,
            updated_at: new Date().toISOString(),
          })
          .eq("id", datasetVersionId);
        if (updateErr) throw updateErr;
      } else {
        const { error: insertErr } = await supabase
          .from("gis_dataset_versions")
          .insert({
            country_iso: countryIso,
            title,
            year,
            source,
            is_active: isActive,
            created_at: new Date().toISOString(),
          });
        if (insertErr) throw insertErr;
      }
      onSaved();
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to save GIS dataset version.");
    } finally {
      setBusy(false);
    }
  };

  if (!open) return null;

  return (
    <Modal open={open} onClose={onClose}>
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">
          {isEditing ? "Edit GIS Dataset Version" : "Add New GIS Dataset Version"}
        </h3>

        {error && (
          <div className="text-sm text-red-700 bg-red-50 border border-red-200 p-2 rounded">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="text-sm">
            <span className="block mb-1 font-medium">Title *</span>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full border rounded px-2 py-1 text-sm"
              placeholder="e.g., National Boundaries 2024"
            />
          </label>

          <label className="text-sm">
            <span className="block mb-1 font-medium">Year</span>
            <input
              type="number"
              value={year ?? ""}
              onChange={(e) => setYear(e.target.value ? parseInt(e.target.value) : null)}
              className="w-full border rounded px-2 py-1 text-sm"
              placeholder="e.g., 2024"
            />
          </label>

          <label className="text-sm md:col-span-2">
            <span className="block mb-1 font-medium">Source</span>
            <input
              type="text"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className="w-full border rounded px-2 py-1 text-sm"
              placeholder="e.g., OCHA, UNHCR, National Mapping Agency"
            />
          </label>

          <label className="flex items-center gap-2 text-sm md:col-span-2">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
            />
            <span>Mark as active version</span>
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
            className="bg-[color:var(--gsc-red)] text-white rounded px-3 py-1 text-sm disabled:opacity-60"
            disabled={busy}
          >
            {busy ? "Saving..." : isEditing ? "Save Changes" : "Add Version"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

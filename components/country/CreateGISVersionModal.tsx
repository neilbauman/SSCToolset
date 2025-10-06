"use client";

import { useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";

interface CreateGISVersionModalProps {
  countryIso: string;
  onClose: () => void;
  onCreated: () => Promise<void> | void;
}

export default function CreateGISVersionModal({
  countryIso,
  onClose,
  onCreated,
}: CreateGISVersionModalProps) {
  const [title, setTitle] = useState("");
  const [year, setYear] = useState<number | "">("");
  const [source, setSource] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const GSC_RED = "#C72B2B";

  const handleCreate = async () => {
    try {
      if (!title) return setError("Please enter a dataset title.");
      setCreating(true);
      setError(null);

      // Deactivate old active version
      await supabase
        .from("gis_dataset_versions")
        .update({ is_active: false })
        .eq("country_iso", countryIso)
        .eq("is_active", true);

      // Insert new version
      const { error: insertError } = await supabase
        .from("gis_dataset_versions")
        .insert([
          {
            country_iso: countryIso,
            title,
            year: year || null,
            source: source || null,
            is_active: true,
          },
        ]);

      if (insertError) throw insertError;

      await onCreated();
      onClose();
    } catch (err: any) {
      console.error("CreateGISVersionModal error:", err.message);
      setError(err.message || "Failed to create version.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/30"
      onClick={onClose}
    >
      <div
        className="relative z-[2100] w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-4 text-lg font-semibold">Create New GIS Version</h2>

        <label className="block text-sm font-medium text-gray-700 mb-1">
          Title
        </label>
        <input
          className="w-full rounded border p-2 text-sm mb-3"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. NAMRIA Dataset"
        />

        <label className="block text-sm font-medium text-gray-700 mb-1">
          Year
        </label>
        <input
          type="number"
          className="w-full rounded border p-2 text-sm mb-3"
          value={year}
          onChange={(e) => setYear(e.target.value ? Number(e.target.value) : "")}
          placeholder="e.g. 2024"
        />

        <label className="block text-sm font-medium text-gray-700 mb-1">
          Source (optional)
        </label>
        <input
          className="w-full rounded border p-2 text-sm mb-3"
          value={source}
          onChange={(e) => setSource(e.target.value)}
          placeholder="e.g. PSA / NAMRIA"
        />

        {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded border px-4 py-2 text-sm hover:bg-gray-50"
            disabled={creating}
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={creating}
            className="rounded px-4 py-2 text-sm text-white hover:opacity-90"
            style={{ backgroundColor: GSC_RED }}
          >
            {creating ? "Creating..." : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}

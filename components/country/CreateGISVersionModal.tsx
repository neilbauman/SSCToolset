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
  const [sourceName, setSourceName] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const GSC_RED = "#630710";
  const GSC_BLUE = "#004b87";

  const handleCreate = async () => {
    try {
      if (!title.trim()) return setError("Please enter a dataset title.");
      if (sourceUrl && !/^https?:\/\//i.test(sourceUrl)) {
        return setError("Source URL must start with http:// or https://");
      }

      setCreating(true);
      setError(null);

      // Deactivate old active version for this country
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
            source_name: sourceName || null,
            source_url: sourceUrl || null,
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
        <h2 className="mb-4 text-lg font-semibold text-[color:var(--gsc-blue)]">
          Create New GIS Version
        </h2>

        {/* Title */}
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Title
        </label>
        <input
          className="w-full rounded border p-2 text-sm mb-3"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. NAMRIA Dataset"
        />

        {/* Year */}
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

        <hr className="my-4 border-gray-200" />

        <h3 className="text-sm font-medium text-gray-800 mb-2">
          Source Information (Optional)
        </h3>

        {/* Source Name */}
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Source Name
        </label>
        <input
          className="w-full rounded border p-2 text-sm mb-3"
          value={sourceName}
          onChange={(e) => setSourceName(e.target.value)}
          placeholder="e.g. Philippine Statistics Authority / NAMRIA"
        />

        {/* Source URL */}
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Source URL
        </label>
        <input
          className="w-full rounded border p-2 text-sm mb-3"
          value={sourceUrl}
          onChange={(e) => setSourceUrl(e.target.value)}
          placeholder="e.g. https://data.gov.ph/dataset/..."
        />

        {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

        {/* Actions */}
        <div className="flex justify-end gap-3 mt-4">
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

"use client";

import { useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";

interface EditGISVersionModalProps {
  versionId: string;
  currentValues: {
    title: string;
    year?: number | null;
    source_name?: string | null;
    source_url?: string | null;
  };
  onClose: () => void;
  onSaved: () => Promise<void> | void;
}

export default function EditGISVersionModal({
  versionId,
  currentValues,
  onClose,
  onSaved,
}: EditGISVersionModalProps) {
  const [title, setTitle] = useState(currentValues.title);
  const [year, setYear] = useState<number | "">(currentValues.year || "");
  const [sourceName, setSourceName] = useState(currentValues.source_name || "");
  const [sourceUrl, setSourceUrl] = useState(currentValues.source_url || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const GSC_RED = "#630710";
  const GSC_BLUE = "#004b87";

  const handleSave = async () => {
    try {
      if (!title.trim()) return setError("Title cannot be empty.");
      if (sourceUrl && !/^https?:\/\//i.test(sourceUrl)) {
        return setError("Source URL must start with http:// or https://");
      }

      setSaving(true);
      setError(null);

      const { error: updateError } = await supabase
        .from("gis_dataset_versions")
        .update({
          title: title.trim(),
          year: year || null,
          source_name: sourceName.trim() || null,
          source_url: sourceUrl.trim() || null,
        })
        .eq("id", versionId);

      if (updateError) throw updateError;

      await onSaved();
      onClose();
    } catch (err: any) {
      console.error("EditGISVersionModal error:", err.message);
      setError(err.message || "Failed to update version.");
    } finally {
      setSaving(false);
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
          Edit GIS Version
        </h2>

        {/* Title */}
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Title
        </label>
        <input
          className="w-full rounded border p-2 text-sm mb-3"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
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
        />

        <hr className="my-4 border-gray-200" />

        <h3 className="text-sm font-medium text-gray-800 mb-2">
          Source Information
        </h3>

        {/* Source Name */}
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Source Name
        </label>
        <input
          className="w-full rounded border p-2 text-sm mb-3"
          value={sourceName}
          onChange={(e) => setSourceName(e.target.value)}
        />

        {/* Source URL */}
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Source URL
        </label>
        <input
          className="w-full rounded border p-2 text-sm mb-3"
          value={sourceUrl}
          onChange={(e) => setSourceUrl(e.target.value)}
          placeholder="https://..."
        />

        {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

        {/* Actions */}
        <div className="flex justify-end gap-3 mt-4">
          <button
            onClick={onClose}
            className="rounded border px-4 py-2 text-sm hover:bg-gray-50"
            disabled={saving}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded px-4 py-2 text-sm text-white hover:opacity-90"
            style={{ backgroundColor: GSC_BLUE }}
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

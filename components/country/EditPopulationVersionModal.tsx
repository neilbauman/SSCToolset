"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";

interface EditPopulationVersionModalProps {
  open: boolean;
  onClose: () => void;
  versionId: string | null;
  countryIso: string;
  onSaved: () => void;
}

interface PopulationVersion {
  id: string;
  title: string;
  year: number | null;
  dataset_date: string | null;
  source: string | null;
  notes: string | null;
  is_active: boolean;
}

export default function EditPopulationVersionModal({
  open,
  onClose,
  versionId,
  countryIso,
  onSaved,
}: EditPopulationVersionModalProps) {
  const [version, setVersion] = useState<PopulationVersion | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && versionId) loadVersion();
  }, [open, versionId]);

  const loadVersion = async () => {
    const { data, error } = await supabase
      .from("population_dataset_versions")
      .select("*")
      .eq("id", versionId)
      .maybeSingle();

    if (!error && data) setVersion(data as PopulationVersion);
  };

  const handleSave = async () => {
    if (!version) return;

    setSaving(true);
    setError(null);

    const { id, title, year, dataset_date, source, notes } = version;

    const { error } = await supabase
      .from("population_dataset_versions")
      .update({
        title: title?.trim() || null,
        year: year || null,
        dataset_date: dataset_date || null,
        source: source || null,
        notes: notes || null,
      })
      .eq("id", id);

    if (error) {
      console.error(error);
      setError("Failed to save changes.");
      setSaving(false);
      return;
    }

    setSaving(false);
    onSaved();
    onClose();
  };

  if (!open || !version) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-5 w-full max-w-md">
        <h3 className="text-lg font-semibold mb-3 text-[color:var(--gsc-red)]">
          Edit Population Dataset Version
        </h3>

        <div className="space-y-2 text-sm">
          {[
            { key: "title", label: "Title", type: "text" },
            { key: "year", label: "Year", type: "number" },
            { key: "dataset_date", label: "Dataset Date", type: "date" },
            { key: "source", label: "Source", type: "text" },
            { key: "notes", label: "Notes", type: "textarea" },
          ].map(({ key, label, type }) => (
            <label key={key} className="block capitalize">
              {label}
              {type === "textarea" ? (
                <textarea
                  value={(version as any)[key] ?? ""}
                  onChange={(e) =>
                    setVersion({
                      ...version,
                      [key]: e.target.value || null,
                    })
                  }
                  className="border rounded w-full px-2 py-1 mt-1 text-sm"
                />
              ) : (
                <input
                  type={type}
                  value={(version as any)[key] ?? ""}
                  onChange={(e) =>
                    setVersion({
                      ...version,
                      [key]:
                        type === "number"
                          ? Number(e.target.value)
                          : e.target.value || null,
                    })
                  }
                  className="border rounded w-full px-2 py-1 mt-1"
                />
              )}
            </label>
          ))}

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-3 py-1 text-sm border rounded"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-3 py-1 text-sm bg-[color:var(--gsc-green)] text-white rounded"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

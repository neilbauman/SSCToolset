"use client";

import { useState, useEffect } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { X, Save } from "lucide-react";

interface EditAdminDatasetVersionModalProps {
  open: boolean;
  onClose: () => void;
  versionId: string;
  onSaved: () => void;
}

export default function EditAdminDatasetVersionModal({
  open,
  onClose,
  versionId,
  onSaved,
}: EditAdminDatasetVersionModalProps) {
  const [title, setTitle] = useState("");
  const [year, setYear] = useState<number | null>(null);
  const [datasetDate, setDatasetDate] = useState("");
  const [sourceName, setSourceName] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  // Fetch current version metadata
  useEffect(() => {
    if (!open || !versionId) return;

    const fetchVersion = async () => {
      const { data, error } = await supabase
        .from("admin_dataset_versions")
        .select("*")
        .eq("id", versionId)
        .single();

      if (error) {
        console.error("Error fetching version:", error);
        return;
      }

      if (data) {
        setTitle(data.title ?? "");
        setYear(data.year ?? null);
        setDatasetDate(data.dataset_date ?? "");
        setNotes(data.notes ?? "");

        if (data.source) {
          if (typeof data.source === "string") {
            setSourceName(data.source);
          } else if (typeof data.source === "object") {
            setSourceName(data.source.name ?? "");
            setSourceUrl(data.source.url ?? "");
          }
        }
      }
    };

    fetchVersion();
  }, [open, versionId]);

  const handleSave = async () => {
    setLoading(true);
    try {
      const source =
        sourceName || sourceUrl
          ? { name: sourceName || null, url: sourceUrl || null }
          : null;

      const { error } = await supabase
        .from("admin_dataset_versions")
        .update({
          title,
          year,
          dataset_date: datasetDate || null,
          source,
          notes,
          updated_at: new Date().toISOString(),
        })
        .eq("id", versionId);

      if (error) throw error;

      onSaved();
      onClose();
    } catch (err) {
      console.error("Error saving version:", err);
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-lg p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-lg font-semibold mb-4 text-[color:var(--gsc-blue)]">
          Edit Dataset Version
        </h2>

        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium text-gray-700">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full border rounded px-2 py-1 text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-gray-700">Year</label>
              <input
                type="number"
                value={year ?? ""}
                onChange={(e) => setYear(e.target.value ? Number(e.target.value) : null)}
                className="w-full border rounded px-2 py-1 text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">
                Dataset Date
              </label>
              <input
                type="date"
                value={datasetDate || ""}
                onChange={(e) => setDatasetDate(e.target.value)}
                className="w-full border rounded px-2 py-1 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Source Name</label>
            <input
              type="text"
              value={sourceName}
              onChange={(e) => setSourceName(e.target.value)}
              className="w-full border rounded px-2 py-1 text-sm"
              placeholder="e.g., Philippine Statistics Authority"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Source URL</label>
            <input
              type="url"
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              className="w-full border rounded px-2 py-1 text-sm"
              placeholder="https://psa.gov.ph"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full border rounded px-2 py-1 text-sm"
              placeholder="Additional details about this dataset..."
            />
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-sm border rounded text-gray-700 hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-3 py-1.5 text-sm bg-[color:var(--gsc-red)] text-white rounded hover:opacity-90 disabled:opacity-50 flex items-center gap-1"
          >
            <Save className="w-4 h-4" />
            {loading ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

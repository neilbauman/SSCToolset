"use client";

import { useState, useEffect } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { Loader2 } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  versionId: string;
  onSaved: () => void;
}

/**
 * Modal for editing an existing Admin Dataset Version.
 * Supports title, year, dataset date, source name, source URL, and notes.
 * Persists changes to Supabase table: admin_dataset_versions
 */
export default function EditAdminDatasetVersionModal({
  open,
  onClose,
  versionId,
  onSaved,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: "",
    year: "",
    dataset_date: "",
    source_name: "",
    source_url: "",
    notes: "",
  });

  // Fetch version info
  useEffect(() => {
    if (!open || !versionId) return;
    const fetchVersion = async () => {
      const { data, error } = await supabase
        .from("admin_dataset_versions")
        .select("*")
        .eq("id", versionId)
        .single();

      if (error || !data) return console.error("Error fetching version:", error);

      let srcName = "";
      let srcUrl = "";

      try {
        const parsed = JSON.parse(data.source || "{}");
        srcName = parsed.name || "";
        srcUrl = parsed.url || "";
      } catch {
        // handle legacy plain-text source field
        srcName = data.source || "";
      }

      setForm({
        title: data.title || "",
        year: data.year?.toString() || "",
        dataset_date: data.dataset_date || "",
        source_name: srcName,
        source_url: srcUrl,
        notes: data.notes || "",
      });
    };
    fetchVersion();
  }, [open, versionId]);

  // Save changes
  const handleSave = async () => {
    setLoading(true);
    try {
      const sourceJson =
        form.source_name || form.source_url
          ? JSON.stringify({
              name: form.source_name,
              url: form.source_url,
            })
          : null;

      const { error } = await supabase
        .from("admin_dataset_versions")
        .update({
          title: form.title.trim(),
          year: form.year ? parseInt(form.year) : null,
          dataset_date: form.dataset_date || null,
          source: sourceJson,
          notes: form.notes || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", versionId);

      if (error) throw error;

      onSaved();
      onClose();
    } catch (err) {
      console.error("Error saving dataset version:", err);
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-5 w-full max-w-md">
        <h3 className="text-lg font-semibold mb-3">Edit Dataset Version</h3>

        <div className="space-y-3 text-sm">
          <label className="block">
            Title
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="border rounded w-full px-2 py-1 mt-1"
            />
          </label>

          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              Year
              <input
                type="number"
                value={form.year}
                onChange={(e) => setForm({ ...form, year: e.target.value })}
                className="border rounded w-full px-2 py-1 mt-1"
              />
            </label>
            <label className="block">
              Dataset Date
              <input
                type="date"
                value={form.dataset_date}
                onChange={(e) =>
                  setForm({ ...form, dataset_date: e.target.value })
                }
                className="border rounded w-full px-2 py-1 mt-1"
              />
            </label>
          </div>

          <label className="block">
            Source Name (optional)
            <input
              type="text"
              value={form.source_name}
              onChange={(e) =>
                setForm({ ...form, source_name: e.target.value })
              }
              className="border rounded w-full px-2 py-1 mt-1"
            />
          </label>

          <label className="block">
            Source URL (optional)
            <input
              type="url"
              value={form.source_url}
              onChange={(e) => setForm({ ...form, source_url: e.target.value })}
              className="border rounded w-full px-2 py-1 mt-1"
            />
          </label>

          <label className="block">
            Notes
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="border rounded w-full px-2 py-1 mt-1"
              rows={2}
            />
          </label>
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={onClose}
            className="px-3 py-1 text-sm border rounded hover:bg-gray-50"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-3 py-1 text-sm bg-[color:var(--gsc-green)] text-white rounded hover:opacity-90 flex items-center gap-1"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />} Save
          </button>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { Loader2, Save } from "lucide-react";

export default function EditDatasetModal({ open, onClose, dataset, onUpdated }: any) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [sourceName, setSourceName] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (dataset) {
      setTitle(dataset.title || "");
      setDescription(dataset.description || "");
      const parsedSource = dataset.source ? JSON.parse(dataset.source) : {};
      setSourceName(parsedSource?.name || "");
      setSourceUrl(parsedSource?.url || "");
      setYear(dataset.year || new Date().getFullYear());
    }
  }, [dataset]);

  if (!open || !dataset) return null;

  async function handleSave() {
    if (!title) return alert("Title is required.");

    setLoading(true);
    const { error } = await supabase
      .from("dataset_metadata")
      .update({
        title,
        description,
        year,
        source: JSON.stringify({
          name: sourceName || null,
          url: sourceUrl || null,
        }),
        updated_at: new Date().toISOString(),
      })
      .eq("id", dataset.id);

    setLoading(false);

    if (error) {
      console.error(error);
      alert("Failed to update dataset.");
    } else {
      alert("Dataset updated successfully.");
      onUpdated();
      onClose();
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-lg">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-[color:var(--gsc-gray)]">
            Edit Dataset
          </h2>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="text-sm font-medium">Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full border rounded p-2 text-sm"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Year</label>
            <input
              type="number"
              min="1900"
              max={new Date().getFullYear() + 1}
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value, 10))}
              className="w-full border rounded p-2 text-sm"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full border rounded p-2 text-sm"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Source</label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Source name"
                className="border rounded p-2 text-sm"
                value={sourceName}
                onChange={(e) => setSourceName(e.target.value)}
              />
              <input
                type="url"
                placeholder="Source URL"
                className="border rounded p-2 text-sm"
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
              />
            </div>
          </div>

          <div className="border-t pt-4">
            <p className="text-xs text-gray-500">
              <b>Type:</b> {dataset.upload_type || "—"} |{" "}
              <b>Data:</b> {dataset.data_type || "—"} |{" "}
              <b>Admin Level:</b> {dataset.admin_level || "—"}
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2 px-6 py-3 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded border border-gray-300 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-4 py-2 text-sm rounded text-white flex items-center gap-2"
            style={{ backgroundColor: "var(--gsc-red)" }}
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin w-4 h-4" /> Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" /> Save
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { X, Save } from "lucide-react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";

type DatasetMeta = {
  id: string;
  title: string;
  description: string | null;
  source: string | null; // JSON string {name,url}
  year: number | null;
  upload_type: string | null;
  theme: string | null;
  indicator_id: string | null;
};

type Props = {
  open: boolean;
  onClose: () => void;
  dataset: DatasetMeta | null;
  onSaved?: () => Promise<void> | void;
};

const FIELD =
  "border rounded px-2 py-1 w-full text-sm focus:outline-none focus:ring-1 focus:ring-[color:var(--gsc-red)]";
const LABEL = "text-xs font-semibold text-[color:var(--gsc-gray)]";
const GSC_BUTTON =
  "px-3 py-1.5 rounded text-white bg-[color:var(--gsc-red)] hover:opacity-90";

export default function EditDatasetModal({
  open,
  onClose,
  dataset,
  onSaved,
}: Props) {
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [year, setYear] = useState<string>("");
  const [srcName, setSrcName] = useState("");
  const [srcUrl, setSrcUrl] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open || !dataset) return;
    setTitle(dataset.title || "");
    setDesc(dataset.description || "");
    setYear(dataset.year ? String(dataset.year) : "");
    try {
      const j = dataset.source ? JSON.parse(dataset.source) : {};
      setSrcName(j?.name || "");
      setSrcUrl(j?.url || "");
    } catch {
      setSrcName("");
      setSrcUrl("");
    }
  }, [open, dataset]);

  async function handleSave() {
    if (!dataset) return;
    setBusy(true);
    try {
      const source =
        srcName.trim() || srcUrl.trim()
          ? JSON.stringify({ name: srcName || null, url: srcUrl || null })
          : null;

      const { error } = await supabase
        .from("dataset_metadata")
        .update({
          title: title.trim(),
          description: desc || null,
          year: year ? Number(year) : null,
          source,
        })
        .eq("id", dataset.id);
      if (error) throw error;

      if (onSaved) await onSaved();
      onClose();
    } catch (e) {
      console.error(e);
      alert("Failed to save dataset.");
    } finally {
      setBusy(false);
    }
  }

  if (!open || !dataset) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
      <div className="bg-white w-full max-w-2xl rounded-lg shadow-lg">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h3 className="text-lg font-semibold">Edit Dataset</h3>
          <button className="p-1" onClick={onClose} aria-label="Close">
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          <div>
            <label className={LABEL}>Title</label>
            <input className={FIELD} value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <label className={LABEL}>Description</label>
            <textarea
              className={FIELD}
              rows={3}
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className={LABEL}>Year</label>
              <input
                className={FIELD}
                type="number"
                inputMode="numeric"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                placeholder="YYYY"
              />
            </div>
            <div className="col-span-2">
              <label className={LABEL}>Source</label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  className={FIELD}
                  placeholder="Source Name"
                  value={srcName}
                  onChange={(e) => setSrcName(e.target.value)}
                />
                <input
                  className={FIELD}
                  placeholder="URL"
                  value={srcUrl}
                  onChange={(e) => setSrcUrl(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t px-4 py-3">
          <button className="px-3 py-1.5 border rounded" onClick={onClose}>
            Cancel
          </button>
          <button disabled={busy} onClick={handleSave} className={GSC_BUTTON}>
            <Save className="w-4 h-4 inline-block mr-1" />
            {busy ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

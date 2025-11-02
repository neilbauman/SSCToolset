"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";

type DatasetMeta = {
  dataset_id: string;
  title: string;
  country_iso: string;
  admin_level: string;
  dataset_type: string | null;
};

type Props = {
  open: boolean;
  onClose: () => void;
  instanceId: string;
  /** optional; defaults to "underlying_vulnerability" */
  category?: string;
  onAdded?: () => Promise<void> | void;
};

export default function AddLayerModal({
  open,
  onClose,
  instanceId,
  category = "underlying_vulnerability",
  onAdded,
}: Props) {
  const [datasets, setDatasets] = useState<DatasetMeta[]>([]);
  const [sel, setSel] = useState<string>("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    (async () => {
      const { data, error } = await supabase
        .from("unified_datasets")
        .select(
          "dataset_id,title,country_iso,admin_level,dataset_type"
        )
        .order("title", { ascending: true });
      if (!error) setDatasets(data as any);
    })();
  }, [open]);

  const save = async () => {
    if (!sel) return;
    setSaving(true);
    try {
      // insert into instance_layers
      const { error } = await supabase.from("instance_layers").insert({
        instance_id: instanceId,
        dataset_id: sel,
        category,
        subcategory: null,
      });
      if (error) throw error;
      await onAdded?.();
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 bg-black/40 flex items-center justify-center">
      <div className="w-full max-w-lg bg-white rounded-lg p-4 shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">Add dataset to {category.replaceAll("_"," ")}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-black">
            ✕
          </button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Dataset</label>
            <select
              value={sel}
              onChange={(e) => setSel(e.currentTarget.value)}
              className="w-full border rounded px-3 py-2"
            >
              <option value="" disabled>
                Select a dataset…
              </option>
              {datasets.map((d) => (
                <option key={d.dataset_id} value={d.dataset_id}>
                  {d.title} • {d.admin_level}
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={onClose} className="px-3 py-1 rounded bg-gray-100 hover:bg-gray-200">
              Cancel
            </button>
            <button
              onClick={save}
              disabled={!sel || saving}
              className="px-3 py-1 rounded bg-[color:var(--gsc-green)] text-white hover:opacity-90 disabled:opacity-50"
            >
              {saving ? "Adding…" : "Add"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

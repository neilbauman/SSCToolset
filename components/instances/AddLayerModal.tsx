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

type Methodology = {
  id: string;
  name: string;
  function_name: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  instanceId: string;
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
  const [methods, setMethods] = useState<Methodology[]>([]);
  const [selDataset, setSelDataset] = useState("");
  const [selMethod, setSelMethod] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    (async () => {
      const { data: d1, error: e1 } = await supabase
        .from("unified_datasets")
        .select("dataset_id,title,country_iso,admin_level,dataset_type")
        .order("title");
      if (!e1) setDatasets(d1 ?? []);

      const { data: d2, error: e2 } = await supabase
        .from("methodologies")
        .select("id,name,function_name")
        .order("name");
      if (!e2) setMethods(d2 ?? []);
    })();
  }, [open]);

  const save = async () => {
    if (!selDataset || !selMethod) return;
    setSaving(true);
    setErr(null);
    try {
      const { error } = await supabase.from("instance_layers").insert({
        instance_id: instanceId,
        dataset_id: selDataset,
        methodology_id: selMethod,
        category,
        subcategory: null,
      });
      if (error) throw error;

      // Immediately apply the selected methodology
      const { error: rpcError } = await supabase.rpc("apply_methodology_to_category", {
        p_instance_id: instanceId,
        p_category: category,
      });
      if (rpcError) throw rpcError;

      await onAdded?.();
      onClose();
    } catch (e: any) {
      console.error(e);
      setErr(e.message ?? "Unexpected error");
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 bg-black/40 flex items-center justify-center">
      <div className="w-full max-w-lg bg-white rounded-lg p-4 shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">
            Add dataset to {category.replaceAll("_", " ")}
          </h3>
          <button onClick={onClose} className="text-gray-500 hover:text-black">
            ✕
          </button>
        </div>

        {err && <div className="text-sm text-red-600 mb-2">{err}</div>}

        <div className="space-y-3">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Dataset</label>
            <select
              value={selDataset}
              onChange={(e) => setSelDataset(e.currentTarget.value)}
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

          <div>
            <label className="block text-sm text-gray-600 mb-1">Methodology</label>
            <select
              value={selMethod}
              onChange={(e) => setSelMethod(e.currentTarget.value)}
              className="w-full border rounded px-3 py-2"
            >
              <option value="" disabled>
                Select a methodology…
              </option>
              {methods.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={onClose}
              className="px-3 py-1 rounded bg-gray-100 hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              onClick={save}
              disabled={!selDataset || !selMethod || saving}
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

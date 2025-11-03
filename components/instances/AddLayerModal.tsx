"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";

type DatasetMeta = {
  dataset_id: string;
  title: string;
  admin_level: string;
  origin: string;
};

type Methodology = { id: string; name: string };

type Props = {
  open: boolean;
  onClose: () => void;
  instanceId: string;
  onAdded?: () => Promise<void> | void;
};

const CATEGORY_LABELS: Record<string, string> = {
  ssc_p1: "SSC P1 – Shelter Enclosure",
  ssc_p2: "SSC P2 – Interior Livability",
  ssc_p3: "SSC P3 – Settlement & Access",
  hazard: "Hazards",
  underlying_vulnerability: "Underlying Vulnerabilities",
};

export default function AddLayerModal({ open, onClose, instanceId, onAdded }: Props) {
  const [datasets, setDatasets] = useState<DatasetMeta[]>([]);
  const [methods, setMethods] = useState<Methodology[]>([]);
  const [selDataset, setSelDataset] = useState("");
  const [selCat, setSelCat] = useState("");
  const [selMethod, setSelMethod] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    (async () => {
      const { data } = await supabase
        .from("unified_datasets")
        .select("dataset_id,title,admin_level,origin")
        .order("title");
      setDatasets(data || []);
      const { data: m } = await supabase
        .from("methodologies")
        .select("id,name")
        .order("name");
      setMethods(m || []);
    })();
  }, [open]);

  const save = async () => {
    if (!selDataset || !selCat) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("instance_layers").insert({
        instance_id: instanceId,
        dataset_id: selDataset,
        category: selCat,
        subcategory: null,
        methodology_id: selMethod || null,
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
      <div className="w-full max-w-lg bg-white rounded-lg p-4 shadow-lg space-y-4">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-semibold text-gray-800 text-base">
            Add Dataset to Instance
          </h3>
          <button onClick={onClose} className="text-gray-500 hover:text-black">
            ✕
          </button>
        </div>

        <div className="space-y-2">
          <div>
            <label className="text-sm text-gray-600 block mb-1">Category</label>
            <select
              value={selCat}
              onChange={(e) => setSelCat(e.currentTarget.value)}
              className="w-full border rounded px-3 py-2 text-sm"
            >
              <option value="" disabled>Select category…</option>
              {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm text-gray-600 block mb-1">Dataset</label>
            <select
              value={selDataset}
              onChange={(e) => setSelDataset(e.currentTarget.value)}
              className="w-full border rounded px-3 py-2 text-sm"
            >
              <option value="" disabled>Select dataset…</option>
              {datasets.map((d) => (
                <option key={d.dataset_id} value={d.dataset_id}>
                  {d.title} • {d.admin_level} ({d.origin})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm text-gray-600 block mb-1">Methodology</label>
            <select
              value={selMethod}
              onChange={(e) => setSelMethod(e.currentTarget.value)}
              className="w-full border rounded px-3 py-2 text-sm"
            >
              <option value="">(None)</option>
              {methods.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex justify-end pt-3 gap-2">
          <button onClick={onClose} className="px-3 py-1 rounded bg-gray-100 text-sm hover:bg-gray-200">
            Cancel
          </button>
          <button
            onClick={save}
            disabled={!selDataset || !selCat || saving}
            className="px-3 py-1 rounded bg-[color:var(--gsc-green)] text-white text-sm hover:opacity-90 disabled:opacity-50"
          >
            {saving ? "Adding…" : "Add"}
          </button>
        </div>
      </div>
    </div>
  );
}

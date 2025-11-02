"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { X } from "lucide-react";

type AddLayerModalProps = {
  open: boolean;
  onClose: () => void;
  instanceId: string;
};

type Dataset = {
  id: string;
  title: string;
  dataset_type: string;
  country_iso: string;
};

const CATEGORY_OPTIONS = [
  { key: "Underlying Vulnerability", label: "Underlying Vulnerability" },
  { key: "Hazard", label: "Hazard" },
  { key: "Pillar 1 – Shelter", label: "Pillar 1 – Shelter" },
  { key: "Pillar 2 – Domestic Life", label: "Pillar 2 – Domestic Life" },
  { key: "Pillar 3 – Settlement", label: "Pillar 3 – Settlement" },
];

export default function AddLayerModal({
  open,
  onClose,
  instanceId,
}: AddLayerModalProps) {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [selectedDataset, setSelectedDataset] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [subcategory, setSubcategory] = useState<string>("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) loadDatasets();
  }, [open]);

  const loadDatasets = async () => {
    const { data, error } = await supabase
      .from("dataset_metadata")
      .select("id, title, dataset_type, country_iso")
      .order("title");
    if (!error && data) setDatasets(data);
  };

  const handleAdd = async () => {
    if (!selectedDataset || !selectedCategory) return alert("Select dataset and category first.");
    setLoading(true);
    const { error } = await supabase.from("instance_layers").insert([
      {
        instance_id: instanceId,
        dataset_id: selectedDataset,
        category: selectedCategory,
        subcategory: subcategory || null,
      },
    ]);
    setLoading(false);
    if (error) {
      alert(`Failed to add dataset: ${error.message}`);
      return;
    }
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-30 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-5 relative">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-lg font-semibold mb-3">Add Dataset to Instance</h2>

        <label className="block text-sm font-medium mb-1">Category</label>
        <select
          className="w-full border rounded p-2 mb-3"
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
        >
          <option value="">Select category</option>
          {CATEGORY_OPTIONS.map((opt) => (
            <option key={opt.key} value={opt.key}>
              {opt.label}
            </option>
          ))}
        </select>

        <label className="block text-sm font-medium mb-1">Dataset</label>
        <select
          className="w-full border rounded p-2 mb-3"
          value={selectedDataset}
          onChange={(e) => setSelectedDataset(e.target.value)}
        >
          <option value="">Select dataset</option>
          {datasets.map((d) => (
            <option key={d.id} value={d.id}>
              {d.title} ({d.country_iso})
            </option>
          ))}
        </select>

        <label className="block text-sm font-medium mb-1">Subcategory (optional)</label>
        <input
          type="text"
          className="w-full border rounded p-2 mb-4"
          value={subcategory}
          onChange={(e) => setSubcategory(e.target.value)}
          placeholder="e.g. Structural Vulnerability"
        />

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-sm rounded bg-gray-100 hover:bg-gray-200"
          >
            Cancel
          </button>
          <button
            onClick={handleAdd}
            disabled={loading}
            className="px-3 py-1.5 text-sm rounded bg-[color:var(--gsc-green)] text-white hover:opacity-90"
          >
            {loading ? "Adding…" : "Add Dataset"}
          </button>
        </div>
      </div>
    </div>
  );
}

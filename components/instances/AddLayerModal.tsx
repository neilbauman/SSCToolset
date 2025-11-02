"use client";

import { useState, useEffect } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { X } from "lucide-react";

interface Dataset {
  id: string;
  title: string;
  dataset_type: string;
  admin_level: string;
}

interface Props {
  open: boolean;
  instanceId: string;
  onClose: () => void;
  onAdded: () => void;
}

const ACCENT = "#640811";

export default function AddLayerModal({ open, instanceId, onClose, onAdded }: Props) {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [selectedDataset, setSelectedDataset] = useState<string>("");
  const [category, setCategory] = useState<string>("underlying_vulnerability");
  const [subcategory, setSubcategory] = useState<string>("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    (async () => {
      const { data, error } = await supabase
        .from("dataset_metadata")
        .select("id, title, dataset_type, admin_level");
      if (error) console.error("Dataset load error:", error);
      else setDatasets(data || []);
    })();
  }, [open]);

  const handleAdd = async () => {
    if (!selectedDataset || !category) {
      alert("Please select a dataset and category.");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("instance_layers").insert([
      {
        instance_id: instanceId,
        dataset_id: selectedDataset,
        category,
        subcategory: category === "ssc_pillar" ? subcategory || "P1" : null,
      },
    ]);
    setSaving(false);
    if (error) {
      alert("Failed to add layer: " + error.message);
    } else {
      onAdded();
      onClose();
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-5 w-[95%] max-w-md">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-semibold">Add Dataset Layer</h2>
          <button onClick={onClose}><X className="w-4 h-4 text-gray-500" /></button>
        </div>

        <div className="space-y-3">
          <select
            className="border p-2 rounded w-full"
            value={selectedDataset}
            onChange={(e) => setSelectedDataset(e.target.value)}
          >
            <option value="">Select Dataset</option>
            {datasets.map((d) => (
              <option key={d.id} value={d.id}>
                {d.title} ({d.admin_level})
              </option>
            ))}
          </select>

          <select
            className="border p-2 rounded w-full"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="underlying_vulnerability">Underlying Vulnerability</option>
            <option value="hazard">Hazard</option>
            <option value="ssc_pillar">SSC Pillar</option>
          </select>

          {category === "ssc_pillar" && (
            <select
              className="border p-2 rounded w-full"
              value={subcategory}
              onChange={(e) => setSubcategory(e.target.value)}
            >
              <option value="">Select Pillar</option>
              <option value="P1">P1 – Shelter</option>
              <option value="P2">P2 – Domestic Life</option>
              <option value="P3">P3 – Settlement</option>
            </select>
          )}
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose} className="px-3 py-1 border rounded">Cancel</button>
          <button
            onClick={handleAdd}
            disabled={saving}
            className="px-3 py-1 text-white rounded"
            style={{ background: ACCENT }}
          >
            {saving ? "Adding..." : "Add"}
          </button>
        </div>
      </div>
    </div>
  );
}

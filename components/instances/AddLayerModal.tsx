"use client";

import { useState, useEffect } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";

type Props = {
  open: boolean;
  onClose: () => void;
  instanceId: string;
  onAdded?: () => void;
};

export default function AddLayerModal({ open, onClose, instanceId, onAdded }: Props) {
  const [datasets, setDatasets] = useState<any[]>([]);
  const [selectedDataset, setSelectedDataset] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("underlying_vulnerability");
  const [loading, setLoading] = useState(false);

  // Fetch datasets for the dropdown
  useEffect(() => {
    if (!open) return;
    const fetchDatasets = async () => {
      const { data, error } = await supabase
        .from("dataset_metadata")
        .select("id, title, country_iso, dataset_type, admin_level")
        .order("title", { ascending: true });
      if (!error && data) setDatasets(data);
    };
    fetchDatasets();
  }, [open]);

  const handleAdd = async () => {
    if (!selectedDataset || !selectedCategory) return;
    setLoading(true);
    try {
      const { error } = await supabase.from("instance_layers").insert({
        instance_id: instanceId, // ✅ critical link
        dataset_id: selectedDataset,
        category: selectedCategory,
        created_at: new Date().toISOString(),
      });
      if (error) throw error;
      onAdded?.();
      onClose();
    } catch (err) {
      console.error("Error adding layer:", err);
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-lg p-6 w-[90%] max-w-md space-y-4">
        <h2 className="text-lg font-semibold">Add Dataset to Instance</h2>

        <div>
          <label className="block text-sm font-medium mb-1">Select Dataset</label>
          <select
            value={selectedDataset}
            onChange={(e) => setSelectedDataset(e.target.value)}
            className="w-full border rounded p-2 text-sm"
          >
            <option value="">Select...</option>
            {datasets.map((d) => (
              <option key={d.id} value={d.id}>
                {d.title} ({d.admin_level})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Select Category</label>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full border rounded p-2 text-sm"
          >
            <option value="underlying_vulnerability">Underlying Vulnerability</option>
            <option value="hazard">Hazard</option>
            <option value="ssc_pillar">SSC Pillar</option>
          </select>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={onClose}
            className="px-3 py-1.5 bg-gray-200 rounded hover:bg-gray-300 text-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleAdd}
            disabled={loading}
            className="px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
          >
            {loading ? "Adding..." : "Add Dataset"}
          </button>
        </div>
      </div>
    </div>
  );
}

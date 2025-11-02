"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";

interface Props {
  open: boolean;
  onClose: () => void;
  instanceId: string;
  category: string; // NEW
  onAdded: () => Promise<void>;
}

export default function AddLayerModal({
  open,
  onClose,
  instanceId,
  category,
  onAdded,
}: Props) {
  const [datasets, setDatasets] = useState<any[]>([]);
  const [methodologies, setMethodologies] = useState<any[]>([]);
  const [selectedDataset, setSelectedDataset] = useState<string>("");
  const [selectedMethod, setSelectedMethod] = useState<string>("");
  const [subcategory, setSubcategory] = useState<string>("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;

    const fetchData = async () => {
      const { data: ds } = await supabase
        .from("dataset_metadata")
        .select("id, title, dataset_type, admin_level, record_count")
        .order("title");

      const { data: methods } = await supabase
        .from("methodologies")
        .select("id, name, method_type, config")
        .order("name");

      setDatasets(ds || []);
      setMethodologies(methods || []);
    };

    fetchData();
  }, [open]);

  const handleAdd = async () => {
    if (!selectedDataset || !selectedMethod) return;
    setLoading(true);

    try {
      const { error } = await supabase.from("instance_layers").insert([
        {
          instance_id: instanceId,
          dataset_id: selectedDataset,
          category: category,
          subcategory: subcategory || null,
          methodology_id: selectedMethod,
        },
      ]);

      if (error) throw error;
      await onAdded();
      onClose();
    } catch (err: any) {
      alert("Error adding dataset: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6">
        <h2 className="text-lg font-semibold mb-4">
          Add Dataset to {category.replace(/_/g, " ")}
        </h2>

        {/* Dataset dropdown */}
        <div className="mb-3">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Select Dataset
          </label>
          <select
            className="w-full border rounded px-3 py-2 text-sm"
            value={selectedDataset}
            onChange={(e) => setSelectedDataset(e.target.value)}
          >
            <option value="">-- Choose Dataset --</option>
            {datasets.map((d) => (
              <option key={d.id} value={d.id}>
                {d.title} ({d.admin_level})
              </option>
            ))}
          </select>
        </div>

        {/* Methodology dropdown */}
        <div className="mb-3">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Methodology
          </label>
          <select
            className="w-full border rounded px-3 py-2 text-sm"
            value={selectedMethod}
            onChange={(e) => setSelectedMethod(e.target.value)}
          >
            <option value="">-- Choose Methodology --</option>
            {methodologies.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>

        {/* Optional Subcategory */}
        {category === "ssc_pillar" && (
          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Subcategory (P1, P2, P3)
            </label>
            <input
              type="text"
              placeholder="e.g., P1"
              className="w-full border rounded px-3 py-2 text-sm"
              value={subcategory}
              onChange={(e) => setSubcategory(e.target.value)}
            />
          </div>
        )}

        {/* Buttons */}
        <div className="flex justify-end gap-3 mt-4">
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded bg-gray-200 text-gray-800 hover:bg-gray-300 text-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleAdd}
            disabled={!selectedDataset || !selectedMethod || loading}
            className="px-3 py-1.5 rounded bg-[color:var(--gsc-green)] text-white hover:opacity-90 text-sm"
          >
            {loading ? "Adding..." : "Add Dataset"}
          </button>
        </div>
      </div>
    </div>
  );
}

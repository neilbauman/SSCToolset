"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { Loader2, X } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  instanceId: string;
  onAdded: () => Promise<void>;
}

interface Dataset {
  id: string;
  title: string;
  dataset_type: string;
  admin_level: string;
  record_count: number;
}

interface Methodology {
  id: string;
  name: string;
  method_type: string;
  function_name: string;
}

export default function AddLayerModal({
  open,
  onClose,
  instanceId,
  onAdded,
}: Props) {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [methodologies, setMethodologies] = useState<Methodology[]>([]);
  const [selectedDataset, setSelectedDataset] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedMethodology, setSelectedMethodology] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const categories = [
    { value: "underlying_vulnerability", label: "Underlying Vulnerability" },
    { value: "hazard", label: "Hazard" },
    { value: "ssc_pillar_p1", label: "SSC Pillar P1" },
    { value: "ssc_pillar_p2", label: "SSC Pillar P2" },
    { value: "ssc_pillar_p3", label: "SSC Pillar P3" },
  ];

  // Fetch datasets and methodologies on mount
  useEffect(() => {
    if (!open) return;

    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const [datasetRes, methodologyRes] = await Promise.all([
          supabase
            .from("dataset_metadata")
            .select("id, title, dataset_type, admin_level, record_count")
            .order("title"),
          supabase
            .from("methodologies")
            .select("id, name, method_type, function_name")
            .order("name"),
        ]);

        if (datasetRes.error) throw datasetRes.error;
        if (methodologyRes.error) throw methodologyRes.error;

        setDatasets(datasetRes.data || []);
        setMethodologies(methodologyRes.data || []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [open]);

  const handleAdd = async () => {
    if (!selectedDataset || !selectedCategory) {
      setError("Please select both a dataset and a category.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const { error: insertError } = await supabase.from("instance_layers").insert({
        instance_id: instanceId,
        dataset_id: selectedDataset,
        category: selectedCategory,
        methodology_id: selectedMethodology || null,
      });

      if (insertError) throw insertError;

      setSelectedDataset("");
      setSelectedCategory("");
      setSelectedMethodology("");
      onClose();
      await onAdded();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-start pt-24 z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-lg mx-2 p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-lg font-semibold mb-4">Add Analytical Layer</h2>

        {error && (
          <div className="bg-red-100 text-red-700 text-sm p-2 rounded mb-3">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center items-center h-32">
            <Loader2 className="w-5 h-5 animate-spin text-gray-500" />
          </div>
        ) : (
          <>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Dataset
                </label>
                <select
                  value={selectedDataset}
                  onChange={(e) => setSelectedDataset(e.target.value)}
                  className="w-full border rounded px-2 py-1 text-sm"
                >
                  <option value="">Select dataset...</option>
                  {datasets.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.title} ({d.admin_level})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Category
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full border rounded px-2 py-1 text-sm"
                >
                  <option value="">Select category...</option>
                  {categories.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Methodology
                </label>
                <select
                  value={selectedMethodology}
                  onChange={(e) => setSelectedMethodology(e.target.value)}
                  className="w-full border rounded px-2 py-1 text-sm"
                >
                  <option value="">Select methodology (optional)...</option>
                  {methodologies.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.method_type})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end mt-5 gap-3">
              <button
                onClick={onClose}
                className="px-3 py-2 rounded bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleAdd}
                disabled={saving}
                className="px-3 py-2 rounded bg-green-600 hover:bg-green-700 text-white text-sm flex items-center gap-2 disabled:opacity-60"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                Add Layer
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

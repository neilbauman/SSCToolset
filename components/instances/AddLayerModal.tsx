"use client";
import { useEffect, useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";

interface Props {
  open: boolean;
  onClose: () => void;
  instanceId: string;
  onAdded: () => void;
}

export default function AddLayerModal({ open, onClose, instanceId, onAdded }: Props) {
  const [datasets, setDatasets] = useState<any[]>([]);
  const [methods, setMethods] = useState<any[]>([]);
  const [datasetId, setDatasetId] = useState("");
  const [category, setCategory] = useState("underlying_vulnerability");
  const [subcategory, setSubcategory] = useState("");
  const [methodologyId, setMethodologyId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const fetchData = async () => {
      const { data: ds } = await supabase
        .from("unified_datasets")
        .select("dataset_id, title, dataset_type, country_iso")
        .limit(100);
      setDatasets(ds || []);

      const { data: m } = await supabase
        .from("methodologies")
        .select("id, name, method_type")
        .order("name", { ascending: true });
      setMethods(m || []);
    };
    fetchData();
  }, [open]);

  const handleAdd = async () => {
    if (!datasetId || !category) {
      setError("Select at least a dataset and category.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase.from("instance_layers").insert({
        instance_id: instanceId,
        dataset_id: datasetId,
        category,
        subcategory: subcategory || null,
        methodology_id: methodologyId || null,
      });
      if (error) throw error;
      onAdded();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md relative">
        <h2 className="text-lg font-semibold mb-4">Add Dataset to Instance</h2>

        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium text-gray-700">Dataset</label>
            <select
              value={datasetId}
              onChange={(e) => setDatasetId(e.target.value)}
              className="w-full border rounded px-2 py-1.5 text-sm mt-1"
            >
              <option value="">Select dataset</option>
              {datasets.map((d) => (
                <option key={d.dataset_id} value={d.dataset_id}>
                  {d.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full border rounded px-2 py-1.5 text-sm mt-1"
            >
              <option value="underlying_vulnerability">Underlying Vulnerability</option>
              <option value="hazard">Hazard</option>
              <option value="ssc_pillar">SSC Pillar</option>
            </select>
          </div>

          {category === "ssc_pillar" && (
            <div>
              <label className="text-sm font-medium text-gray-700">Subcategory</label>
              <select
                value={subcategory}
                onChange={(e) => setSubcategory(e.target.value)}
                className="w-full border rounded px-2 py-1.5 text-sm mt-1"
              >
                <option value="">Select SSC Pillar</option>
                <option value="P1">P1 — Enclosure</option>
                <option value="P2">P2 — Livability</option>
                <option value="P3">P3 — Settlement</option>
              </select>
            </div>
          )}

          <div>
            <label className="text-sm font-medium text-gray-700">Methodology</label>
            <select
              value={methodologyId}
              onChange={(e) => setMethodologyId(e.target.value)}
              className="w-full border rounded px-2 py-1.5 text-sm mt-1"
            >
              <option value="">Default (none)</option>
              {methods.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          {error && <p className="text-red-600 text-sm">{error}</p>}

          <div className="flex justify-end gap-2 pt-3">
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-sm rounded bg-gray-200 hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              onClick={handleAdd}
              disabled={loading}
              className="px-3 py-1.5 text-sm rounded bg-[color:var(--gsc-green)] text-white hover:opacity-90 disabled:opacity-50"
            >
              {loading ? "Adding…" : "Add"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

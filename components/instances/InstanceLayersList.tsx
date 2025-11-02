"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";

type Props = {
  instanceId: string;
  category: string;
  onChanged?: () => void;
};

export default function InstanceLayersList({
  instanceId,
  category,
  onChanged,
}: Props) {
  const [layers, setLayers] = useState<any[]>([]);
  const [methodologies, setMethodologies] = useState<any[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchLayers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("instance_layers_detailed")
      .select("*")
      .eq("instance_id", instanceId)
      .eq("category", category);
    setLoading(false);
    if (error) setErr(error.message);
    else setLayers(data || []);
  };

  const fetchMethods = async () => {
    const { data } = await supabase.from("methodologies").select("id,name");
    setMethodologies(data || []);
  };

  useEffect(() => {
    fetchLayers();
    fetchMethods();
  }, [instanceId, category]);

  const updateMethodology = async (layerId: string, methodId: string) => {
    await supabase
      .from("instance_layers")
      .update({ methodology_id: methodId })
      .eq("id", layerId);
    fetchLayers();
  };

  const applyMethodology = async (layerId: string) => {
    const layer = layers.find((l) => l.id === layerId);
    if (!layer) return;
    await supabase.rpc("apply_methodology_to_category", {
      p_instance_id: instanceId,
      p_category: category,
    });
    fetchLayers();
    onChanged?.();
  };

  const removeLayer = async (layerId: string) => {
    if (!confirm("Remove this dataset from the instance?")) return;
    const { error } = await supabase
      .from("instance_layers")
      .delete()
      .eq("id", layerId);
    if (error) alert("Error removing: " + error.message);
    fetchLayers();
    onChanged?.();
  };

  return (
    <div className="border rounded-lg p-3 bg-white">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-semibold text-gray-800">
          Datasets in {category.replaceAll("_", " ")}
        </h3>
        <button
          onClick={fetchLayers}
          className="px-2 py-1 text-sm border rounded hover:bg-gray-50"
        >
          Refresh
        </button>
      </div>
      {err && <div className="text-sm text-red-600">{err}</div>}

      {loading ? (
        <div className="text-gray-500 text-sm">Loading…</div>
      ) : (
        <div>
          {layers.map((l) => (
            <div
              key={l.id}
              className="flex items-center justify-between border rounded px-3 py-2 mb-2 bg-gray-50"
            >
              <div>
                <div className="font-medium">{l.dataset_title}</div>
                <div className="text-xs text-gray-500">
                  {l.admin_level} • {l.dataset_type || "gradient"}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={l.methodology_id || ""}
                  onChange={(e) =>
                    updateMethodology(l.id, e.currentTarget.value)
                  }
                  className="border rounded px-2 py-1 text-sm"
                >
                  <option value="">Choose methodology…</option>
                  {methodologies.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => applyMethodology(l.id)}
                  className="px-3 py-1 bg-[color:var(--gsc-green)] text-white rounded text-sm"
                >
                  Apply
                </button>
                <button
                  onClick={() => removeLayer(l.id)}
                  className="px-3 py-1 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}

          {layers.length === 0 && (
            <div className="text-sm text-gray-500">No datasets added.</div>
          )}
        </div>
      )}

      <div className="pt-3 flex justify-end">
        <button
          onClick={() => applyMethodology("rebuild")}
          className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:opacity-90"
        >
          Rebuild Composite
        </button>
      </div>
    </div>
  );
}

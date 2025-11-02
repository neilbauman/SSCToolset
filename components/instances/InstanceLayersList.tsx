"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";

type Layer = {
  id: string;
  dataset_title: string;
  admin_level: string;
  dataset_type: string;
  methodology_name: string | null;
  methodology_function: string | null;
  category: string;
  subcategory: string | null;
};

type Props = {
  instanceId: string;
  category: string;
  onChanged?: () => void;
};

export default function InstanceLayersList({ instanceId, category, onChanged }: Props) {
  const [layers, setLayers] = useState<Layer[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const fetchLayers = async () => {
    setLoading(true);
    setErr(null);

    const { data, error } = await supabase
      .from("instance_layers_view")
      .select("*")
      .eq("instance_id", instanceId)
      .eq("category", category)
      .order("created_at", { ascending: true });

    if (error) {
      setErr(error.message);
      setLayers([]);
    } else {
      setLayers((data as Layer[]) ?? []);
    }

    setLoading(false);
  };

  const removeLayer = async (layerId: string) => {
    if (!confirm("Remove this dataset from the instance?")) return;
    const { error } = await supabase.rpc("remove_instance_layer", { p_layer_id: layerId });
    if (error) alert("Error removing layer: " + error.message);
    else fetchLayers();
    onChanged?.();
  };

  useEffect(() => {
    fetchLayers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instanceId, category]);

  return (
    <div className="rounded-md border bg-white text-sm">
      <div className="flex items-center justify-between px-3 py-2 border-b bg-gray-50">
        <div className="font-medium text-gray-800">Datasets</div>
        <div className="text-xs text-gray-500">{layers.length} total</div>
      </div>

      {loading && (
        <div className="px-4 py-6 text-gray-500 text-sm">Loading datasets…</div>
      )}

      {!loading && err && (
        <div className="px-4 py-3 text-red-600 text-sm">Error: {err}</div>
      )}

      {!loading && !err && layers.length === 0 && (
        <div className="px-4 py-6 text-gray-500 text-sm">No datasets linked yet.</div>
      )}

      {!loading && !err && layers.length > 0 && (
        <div className="overflow-auto max-h-[360px]">
          <table className="w-full text-xs border-t">
            <thead className="bg-gray-100 sticky top-0 text-gray-600">
              <tr>
                <th className="text-left px-3 py-2 w-1/3">Dataset</th>
                <th className="text-left px-3 py-2 w-16">Level</th>
                <th className="text-left px-3 py-2 w-24">Type</th>
                <th className="text-left px-3 py-2 w-1/3">Methodology</th>
                <th className="text-right px-3 py-2 w-16">Actions</th>
              </tr>
            </thead>
            <tbody>
              {layers.map((layer) => (
                <tr key={layer.id} className="border-t hover:bg-gray-50">
                  <td className="px-3 py-2 font-medium text-gray-800 truncate">
                    {layer.dataset_title}
                  </td>
                  <td className="px-3 py-2 text-gray-600">{layer.admin_level}</td>
                  <td className="px-3 py-2 text-gray-600">{layer.dataset_type}</td>
                  <td className="px-3 py-2 text-gray-700">
                    {layer.methodology_name || <span className="italic text-gray-400">None</span>}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      onClick={() => removeLayer(layer.id)}
                      className="text-red-600 hover:text-red-800"
                      title="Remove dataset"
                    >
                      🗑
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

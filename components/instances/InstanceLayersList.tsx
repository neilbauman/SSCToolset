"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";

interface LayerRow {
  id: string;
  dataset_title: string;
  admin_level: string;
  methodology_name?: string | null;
}

export default function InstanceLayersList({
  instanceId,
  category,
  onChanged,
}: {
  instanceId: string;
  category: string;
  onChanged: () => void;
}) {
  const [layers, setLayers] = useState<LayerRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const fetchLayers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("instance_layers_view")
      .select("id, dataset_title, admin_level, methodology_name")
      .eq("instance_id", instanceId)
      .eq("category", category)
      .order("dataset_title", { ascending: true });
    if (error) setErr(error.message);
    setLayers(data || []);
    setLoading(false);
  };

  const removeLayer = async (id: string) => {
    if (!confirm("Remove this dataset from instance?")) return;
    const { error } = await supabase.rpc("remove_instance_layer", { p_layer_id: id });
    if (error) alert(error.message);
    else await fetchLayers();
    onChanged();
  };

  useEffect(() => {
    fetchLayers();
  }, [instanceId, category]);

  return (
    <div className="rounded-lg border bg-white text-sm">
      <div className="border-b px-3 py-2 flex justify-between items-center">
        <span className="font-medium text-gray-700">
          Datasets ({layers.length})
        </span>
        {loading && <span className="text-xs text-gray-500">Loading…</span>}
      </div>

      {err && <div className="p-3 text-xs text-red-600">{err}</div>}

      {!err && layers.length === 0 && !loading && (
        <div className="p-3 text-xs text-gray-500">No datasets added.</div>
      )}

      {layers.length > 0 && (
        <table className="w-full text-xs">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="px-3 py-1.5 text-left w-1/2 font-medium">Dataset</th>
              <th className="px-2 py-1.5 text-left font-medium">Admin</th>
              <th className="px-2 py-1.5 text-left font-medium">Method</th>
              <th className="px-2 py-1.5 text-right font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {layers.map((l) => (
              <tr
                key={l.id}
                className="border-t hover:bg-gray-50 transition-colors"
              >
                <td className="px-3 py-1.5 text-gray-800 truncate">{l.dataset_title}</td>
                <td className="px-2 py-1.5 text-gray-600">{l.admin_level}</td>
                <td className="px-2 py-1.5 text-gray-500">
                  {l.methodology_name || "—"}
                </td>
                <td className="px-2 py-1.5 text-right">
                  <button
                    onClick={() => removeLayer(l.id)}
                    className="text-red-600 hover:text-red-700 hover:underline"
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

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
    <div className="rounded-lg border bg-white">
      <div className="border-b px-4 py-2 font-semibold flex justify-between items-center">
        <span>Datasets in {category.replaceAll("_", " ")}</span>
      </div>
      {loading ? (
        <div className="p-4 text-sm text-gray-500">Loading…</div>
      ) : layers.length === 0 ? (
        <div className="p-4 text-sm text-gray-500">No datasets yet.</div>
      ) : (
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="px-3 py-2">Dataset</th>
              <th className="px-3 py-2">Admin</th>
              <th className="px-3 py-2">Method</th>
              <th className="px-3 py-2 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {layers.map((l) => (
              <tr key={l.id} className="border-t hover:bg-gray-50">
                <td className="px-3 py-2">{l.dataset_title}</td>
                <td className="px-3 py-2">{l.admin_level}</td>
                <td className="px-3 py-2 text-gray-600">
                  {l.methodology_name || "—"}
                </td>
                <td className="px-3 py-2 text-right">
                  <button
                    onClick={() => removeLayer(l.id)}
                    className="text-red-600 text-sm hover:underline"
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {err && <div className="p-3 text-sm text-red-600">{err}</div>}
    </div>
  );
}

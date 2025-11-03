"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { Trash2 } from "lucide-react";

type InstanceLayer = {
  id: string;
  dataset_id: string;
  dataset_title: string;
  admin_level: string;
  dataset_type: string | null;
  origin: "base" | "derived" | null;
  created_at: string;
  methodology_name: string | null;
};

interface Props {
  instanceId: string;
  category: string;
  onChanged?: () => void;
}

export default function InstanceLayersList({
  instanceId,
  category,
  onChanged,
}: Props) {
  const [layers, setLayers] = useState<InstanceLayer[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const fetchLayers = async () => {
    setLoading(true);
    setErr(null);

    const { data, error } = await supabase
      .from("instance_layers_view") // ✅ unified view combining instance_layers + unified_datasets
      .select(
        "id, dataset_id, dataset_title, admin_level, dataset_type_resolved, origin, created_at, methodology_name"
      )
      .eq("instance_id", instanceId)
      .eq("category", category)
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      setErr(error.message);
      setLayers([]);
    } else {
      // standardize column naming for clarity
      const normalized = (data ?? []).map((d: any) => ({
        id: d.id,
        dataset_id: d.dataset_id,
        dataset_title: d.dataset_title ?? "(Untitled dataset)",
        admin_level: d.admin_level ?? "?",
        dataset_type: d.dataset_type_resolved ?? d.dataset_type ?? null,
        origin: d.origin ?? null,
        created_at: d.created_at,
        methodology_name: d.methodology_name,
      }));
      setLayers(normalized);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchLayers();
  }, [instanceId, category]);

  const removeLayer = async (layerId: string) => {
    if (!confirm("Remove this dataset from the category?")) return;

    const { error } = await supabase
      .from("instance_layers")
      .delete()
      .eq("id", layerId);

    if (error) {
      alert("Error removing layer: " + error.message);
    } else {
      await fetchLayers();
      onChanged?.();
    }
  };

  if (loading) return <div className="text-gray-500 text-xs">Loading…</div>;
  if (err)
    return (
      <div className="text-xs text-red-600 bg-red-50 border border-red-200 p-2 rounded">
        {err}
      </div>
    );

  if (layers.length === 0)
    return (
      <div className="text-gray-500 text-xs italic">
        No datasets added yet.
      </div>
    );

  return (
    <div className="rounded border bg-white text-xs">
      <table className="w-full">
        <thead className="bg-gray-50 text-gray-600">
          <tr>
            <th className="text-left px-3 py-2 font-medium">Dataset</th>
            <th className="text-left px-3 py-2">Level</th>
            <th className="text-left px-3 py-2">Type</th>
            <th className="text-left px-3 py-2">Origin</th>
            <th className="text-left px-3 py-2">Methodology</th>
            <th className="text-center px-3 py-2 w-10"></th>
          </tr>
        </thead>
        <tbody>
          {layers.map((l) => (
            <tr key={l.id} className="border-t hover:bg-gray-50">
              <td className="px-3 py-2 font-medium text-gray-800">
                {l.dataset_title}
              </td>
              <td className="px-3 py-2">{l.admin_level}</td>
              <td className="px-3 py-2">{l.dataset_type ?? "—"}</td>
              <td
                className={`px-3 py-2 ${
                  l.origin === "derived" ? "text-blue-600" : "text-gray-600"
                }`}
              >
                {l.origin ?? "base"}
              </td>
              <td className="px-3 py-2">
                {l.methodology_name ?? (
                  <span className="text-gray-400">Not applied</span>
                )}
              </td>
              <td className="px-3 py-2 text-center">
                <button
                  onClick={() => removeLayer(l.id)}
                  className="text-gray-400 hover:text-red-600"
                  title="Remove dataset"
                >
                  <Trash2 size={14} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

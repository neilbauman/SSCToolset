"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";

export default function InstanceLayersList({ instanceId, category, onChanged }: any) {
  const [layers, setLayers] = useState<any[]>([]);
  const [methods, setMethods] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("instance_layers_view")
      .select("*")
      .eq("instance_id", instanceId)
      .eq("category", category)
      .order("created_at", { ascending: true });
    const { data: m } = await supabase.from("methodologies").select("id,name").order("name");
    setMethods(m || []);
    setLayers(data || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [instanceId, category]);

  const apply = async (layerId: string) => {
    await supabase.rpc("apply_methodology_to_layer", { p_layer_id: layerId });
    await load();
    onChanged?.();
  };

  const updateMethod = async (layerId: string, methodId: string) => {
    await supabase
      .from("instance_layers")
      .update({ methodology_id: methodId })
      .eq("id", layerId);
    await load();
  };

  const removeLayer = async (layerId: string) => {
    await supabase.from("instance_layers").delete().eq("id", layerId);
    await load();
  };

  if (loading) return <div className="text-sm text-gray-500">Loading layers…</div>;
  if (!layers.length) return <div className="text-sm text-gray-400">No datasets added.</div>;

  return (
    <div className="rounded-md border text-sm divide-y">
      {layers.map((l) => (
        <div key={l.id} className="flex justify-between items-center px-3 py-2 hover:bg-gray-50">
          <div className="flex-1 min-w-0">
            <div className="font-medium truncate">{l.dataset_title || "Untitled dataset"}</div>
            <div className="text-xs text-gray-500">
              {l.admin_level} • {l.origin} • Method:{" "}
              {l.methodology_name || <span className="italic text-gray-400">none</span>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={l.methodology_id || ""}
              onChange={(e) => updateMethod(l.id, e.currentTarget.value)}
              className="border rounded px-2 py-1 text-xs"
            >
              <option value="">(None)</option>
              {methods.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
            <button
              onClick={() => apply(l.id)}
              className="text-xs px-2 py-1 rounded bg-[color:var(--gsc-green)] text-white hover:opacity-90"
            >
              Apply
            </button>
            <button
              onClick={() => removeLayer(l.id)}
              className="text-xs px-2 py-1 rounded bg-red-100 text-red-700 hover:bg-red-200"
            >
              ✕
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

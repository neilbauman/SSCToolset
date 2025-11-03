"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { Trash2 } from "lucide-react";

type LayerRow = {
  id: string;
  dataset_id: string;
  dataset_title: string | null;
  admin_level: string | null;
  dataset_type_resolved: string | null;
  methodology_name: string | null;
};

interface Props {
  instanceId: string;
  category: string;
  onChanged?: () => void;
}

export default function InstanceLayersList({ instanceId, category, onChanged }: Props) {
  const [rows, setRows] = useState<LayerRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setErr(null);
    const { data, error } = await supabase
      .from("instance_layers_detailed")
      .select(
        "id, dataset_id, dataset_title, admin_level, dataset_type_resolved, methodology_name"
      )
      .eq("instance_id", instanceId)
      .eq("category", category)
      .order("created_at", { ascending: true });

    if (error) {
      setErr(error.message);
      setRows([]);
    } else {
      setRows(data as LayerRow[]);
    }
    setLoading(false);
  }

  async function removeLayer(id: string) {
    if (!confirm("Remove this dataset from the instance?")) return;
    const { error } = await supabase.from("instance_layers").delete().eq("id", id);
    if (error) {
      alert("Failed to delete: " + error.message);
    } else {
      await load();
      onChanged?.();
    }
  }

  useEffect(() => {
    load();
  }, [instanceId, category]);

  return (
    <div className="rounded-lg border bg-white">
      <div className="flex items-center justify-between px-4 py-2 border-b bg-gray-50">
        <div className="font-semibold text-sm">Datasets</div>
        <div className="text-xs text-gray-500">{rows.length} total</div>
      </div>

      {err && (
        <div className="px-4 py-3 text-sm text-red-600 border-b bg-red-50">{err}</div>
      )}

      <div className="overflow-x-auto text-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="text-left px-4 py-2 font-medium">Dataset</th>
              <th className="text-left px-4 py-2 font-medium">Level</th>
              <th className="text-left px-4 py-2 font-medium">Type</th>
              <th className="text-left px-4 py-2 font-medium">Methodology</th>
              <th className="text-center px-2 py-2 font-medium w-10">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-gray-500 text-center">
                  Loading…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-gray-500 text-center">
                  No datasets added.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-2 text-gray-800 font-medium">
                    {r.dataset_title || "—"}
                  </td>
                  <td className="px-4 py-2">{r.admin_level || "—"}</td>
                  <td className="px-4 py-2">{r.dataset_type_resolved || "—"}</td>
                  <td className="px-4 py-2">
                    {r.methodology_name || <span className="text-gray-400 italic">None</span>}
                  </td>
                  <td className="text-center px-2 py-2">
                    <button
                      onClick={() => removeLayer(r.id)}
                      className="text-gray-500 hover:text-red-600"
                      title="Remove dataset"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

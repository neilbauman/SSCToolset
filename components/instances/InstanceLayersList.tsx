"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { Trash2, ChevronDown, ChevronRight } from "lucide-react";

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

type PreviewRow = { admin_pcode: string; value: number };

export default function InstanceLayersList({ instanceId, category, onChanged }: Props) {
  const [rows, setRows] = useState<LayerRow[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [previews, setPreviews] = useState<Record<string, PreviewRow[]>>({});
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
    if (error) alert("Failed to delete: " + error.message);
    else {
      await load();
      onChanged?.();
    }
  }

  async function fetchPreview(layerId: string) {
    if (previews[layerId]) {
      setExpanded(expanded === layerId ? null : layerId);
      return;
    }

    setExpanded(layerId);
    const { data: tbl, error: terr } = await supabase.rpc("get_layer_result_table", {
      p_layer_id: layerId,
    });

    if (terr) {
      setPreviews((prev) => ({
        ...prev,
        [layerId]: [{ admin_pcode: terr.message, value: NaN }],
      }));
      return;
    }

    const tableName = tbl?.result_table_name;
    if (!tableName) return;

    const { data, error } = await supabase
      .from(`derived.${tableName}`)
      .select("admin_pcode,value")
      .limit(50);

    if (error) {
      setPreviews((prev) => ({
        ...prev,
        [layerId]: [{ admin_pcode: error.message, value: NaN }],
      }));
    } else {
      setPreviews((prev) => ({
        ...prev,
        [layerId]: data as PreviewRow[],
      }));
    }
  }

  useEffect(() => {
    load();
  }, [instanceId, category]);

  return (
    <div className="rounded-lg border bg-white">
      <div className="flex items-center justify-between px-3 py-2 border-b bg-gray-50">
        <div className="font-semibold text-sm">Datasets</div>
        <div className="text-xs text-gray-500">{rows.length} total</div>
      </div>

      {err && (
        <div className="px-3 py-2 text-xs text-red-600 border-b bg-red-50">{err}</div>
      )}

      <div className="overflow-x-auto text-xs">
        <table className="w-full">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="text-left px-3 py-1 font-medium w-6"></th>
              <th className="text-left px-3 py-1 font-medium">Dataset</th>
              <th className="text-left px-3 py-1 font-medium">Level</th>
              <th className="text-left px-3 py-1 font-medium">Type</th>
              <th className="text-left px-3 py-1 font-medium">Methodology</th>
              <th className="text-center px-2 py-1 font-medium w-10">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-gray-500 text-center">
                  Loading…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-gray-500 text-center">
                  No datasets added.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <>
                  <tr
                    key={r.id}
                    className="border-t hover:bg-gray-50 cursor-pointer"
                    onClick={() => fetchPreview(r.id)}
                  >
                    <td className="px-3 py-1 text-gray-500 text-center">
                      {expanded === r.id ? (
                        <ChevronDown size={14} />
                      ) : (
                        <ChevronRight size={14} />
                      )}
                    </td>
                    <td className="px-3 py-1 text-gray-800 font-medium text-[13px]">
                      {r.dataset_title || "—"}
                    </td>
                    <td className="px-3 py-1">{r.admin_level || "—"}</td>
                    <td className="px-3 py-1">{r.dataset_type_resolved || "—"}</td>
                    <td className="px-3 py-1">
                      {r.methodology_name || (
                        <span className="text-gray-400 italic">None</span>
                      )}
                    </td>
                    <td className="text-center px-2 py-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeLayer(r.id);
                        }}
                        className="text-gray-500 hover:text-red-600"
                        title="Remove dataset"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                  {expanded === r.id && (
                    <tr className="border-t bg-gray-50">
                      <td colSpan={6} className="px-3 py-2">
                        <DatasetPreview rows={previews[r.id]} />
                      </td>
                    </tr>
                  )}
                </>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Inline component for compact preview rendering
function DatasetPreview({ rows }: { rows?: PreviewRow[] }) {
  if (!rows) {
    return (
      <div className="text-[11px] text-gray-500 italic">
        Loading normalized results…
      </div>
    );
  }
  if (!rows.length) {
    return (
      <div className="text-[11px] text-gray-400 italic">No preview data.</div>
    );
  }
  if (rows[0]?.value === undefined || isNaN(rows[0]?.value)) {
    return (
      <div className="text-[11px] text-red-600 font-mono">
        {rows[0].admin_pcode}
      </div>
    );
  }

  return (
    <div className="overflow-auto border rounded bg-white max-h-52">
      <table className="w-full text-[11px]">
        <thead className="bg-gray-100 sticky top-0">
          <tr>
            <th className="text-left px-2 py-1 font-medium">Admin pcode</th>
            <th className="text-right px-2 py-1 font-medium">Value</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.admin_pcode} className="border-t hover:bg-gray-50">
              <td className="px-2 py-1 font-mono">{r.admin_pcode}</td>
              <td className="px-2 py-1 text-right">{r.value.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

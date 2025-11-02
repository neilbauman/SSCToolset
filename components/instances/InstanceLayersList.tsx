"use client";

import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";

type SummaryRow = {
  link_id: string;
  instance_id: string | null;
  category: string | null;
  subcategory: string | null;
  dataset_title: string | null;
  dataset_type: string | null;
  data_type: string | null;
  admin_level: string | null;
  methodology_name: string | null;
  method_type: string | null;
  function_name: string | null;
  created_at: string | null;
};

type Methodology = {
  id: string;
  name: string;
  method_type: string | null;
  function_name: string | null;
  applies_to: string[] | null;
  config: any | null;
};

type Props = {
  instanceId: string;
  /** optional; defaults to "underlying_vulnerability" */
  category?: string;
  onChanged?: () => void;
};

export default function InstanceLayersList({
  instanceId,
  category = "underlying_vulnerability",
  onChanged,
}: Props) {
  const [rows, setRows] = useState<SummaryRow[]>([]);
  const [methods, setMethods] = useState<Methodology[]>([]);
  const [saving, setSaving] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = async () => {
    setErr(null);
    // 1) layers
    const { data: layers, error } = await supabase
      .from("instance_layer_summary")
      .select("*")
      .eq("instance_id", instanceId)
      .eq("category", category)
      .order("created_at", { ascending: false });
    if (error) {
      setErr(error.message);
      return;
    }
    setRows(layers ?? []);

    // 2) methodologies (filter client-side by applies_to)
    const { data: mdata, error: merror } = await supabase
      .from("methodologies")
      .select("id,name,method_type,function_name,applies_to,config")
      .order("name");
    if (merror) {
      setErr(merror.message);
      return;
    }
    setMethods(mdata ?? []);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instanceId, category]);

  const applicable = useMemo(() => {
    const key = category;
    return (methods ?? []).filter((m) => {
      if (!m.applies_to || !Array.isArray(m.applies_to)) return true;
      return m.applies_to.includes(key);
    });
  }, [methods, category]);

  const applyMethodology = async (linkId: string, methodologyId: string) => {
    setSaving(linkId);
    setErr(null);
    try {
      const { error } = await supabase
        .from("instance_layers")
        .update({ methodology_id: methodologyId })
        .eq("id", linkId);
      if (error) throw error;

      // Apply to that layer via RPC
      const { data, error: rerr } = await supabase.rpc(
        "apply_methodology_to_layer",
        { p_layer_id: linkId }
      );
      if (rerr) throw rerr;

      // Also rebuild the category composite so the preview is fresh
      await supabase.rpc("apply_weight", {
        p_instance_id: instanceId,
        p_category: category,
      });

      await load();
      onChanged?.();
    } catch (e: any) {
      setErr(e?.message ?? "Failed to apply methodology");
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="border rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-800">
          Datasets in {category.replaceAll("_", " ")}
        </h3>
        <button
          onClick={load}
          className="text-sm px-3 py-1 rounded bg-gray-100 hover:bg-gray-200"
        >
          Refresh
        </button>
      </div>

      {err && <p className="text-sm text-red-600 mb-3">{err}</p>}

      {rows.length === 0 ? (
        <p className="text-sm text-gray-500">No datasets linked yet.</p>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <div
              key={r.link_id}
              className="border rounded-lg px-3 py-2 flex flex-col gap-2"
            >
              <div className="flex flex-wrap items-center gap-2 justify-between">
                <div className="min-w-0">
                  <div className="font-medium truncate">
                    {r.dataset_title ?? "Untitled dataset"}
                  </div>
                  <div className="text-xs text-gray-500">
                    {r.admin_level} • {r.dataset_type ?? "—"}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    className="text-sm border rounded px-2 py-1"
                    defaultValue={
                      // default the dropdown to whatever is applied (by function_name),
                      // else try to match by name, else empty
                      applicable.find(
                        (m) =>
                          m.function_name &&
                          m.function_name === (r.function_name ?? "")
                      )?.id ??
                      applicable.find(
                        (m) =>
                          m.name &&
                          m.name.toLowerCase() ===
                            (r.methodology_name ?? "").toLowerCase()
                      )?.id ??
                      ""
                    }
                    onChange={(e) =>
                      applyMethodology(r.link_id, e.currentTarget.value)
                    }
                  >
                    <option value="" disabled>
                      Choose methodology…
                    </option>
                    {applicable.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>

                  <button
                    disabled={saving === r.link_id}
                    onClick={() =>
                      applyMethodology(
                        r.link_id,
                        applicable.find(
                          (m) =>
                            m.function_name &&
                            m.function_name === (r.function_name ?? "")
                        )?.id ??
                          applicable.find(
                            (m) =>
                              m.name &&
                              m.name.toLowerCase() ===
                                (r.methodology_name ?? "").toLowerCase()
                          )?.id ??
                          ""
                      )
                    }
                    className="text-sm px-3 py-1 rounded bg-[color:var(--gsc-green)] text-white hover:opacity-90 disabled:opacity-50"
                    title="Re-apply current methodology"
                  >
                    {saving === r.link_id ? "Applying…" : "Apply"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-3 flex justify-end">
        <button
          onClick={async () => {
            setSaving("__cat__");
            setErr(null);
            try {
              await supabase.rpc("apply_weight", {
                p_instance_id: instanceId,
                p_category: category,
              });
              onChanged?.();
            } catch (e: any) {
              setErr(e?.message ?? "Failed to rebuild composite");
            } finally {
              setSaving(null);
            }
          }}
          className="text-sm px-3 py-1 rounded bg-blue-600 text-white hover:opacity-90 disabled:opacity-50"
          disabled={saving === "__cat__"}
        >
          {saving === "__cat__" ? "Rebuilding…" : "Rebuild Composite"}
        </button>
      </div>
    </div>
  );
}

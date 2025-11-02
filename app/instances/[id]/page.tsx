"use client";

import { useEffect, useState } from "react";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import CompositePreview from "@/components/instances/CompositePreview";
import { Loader2, RefreshCw } from "lucide-react";

type Layer = {
  link_id: string;
  dataset_title: string;
  category: string;
  subcategory: string | null;
  dataset_type: string | null;
  admin_level: string | null;
  methodology_name: string | null;
  methodology_id: string | null;
  created_at: string | null;
};

type Methodology = {
  id: string;
  name: string;
  method_type: string;
  function_name: string;
  target_max_scale: number;
  invert_scale: boolean;
};

export default function InstancePage({ params }: { params: { id: string } }) {
  const instanceId = params.id;
  const [layers, setLayers] = useState<Layer[]>([]);
  const [methods, setMethods] = useState<Methodology[]>([]);
  const [loading, setLoading] = useState(false);
  const [category] = useState("underlying_vulnerability");

  // Fetch layers linked to instance
  const fetchLayers = async () => {
    const { data } = await supabase
      .from("instance_layer_summary")
      .select("*")
      .eq("instance_id", instanceId);
    if (data) setLayers(data);
  };

  // Fetch all methodologies
  const fetchMethods = async () => {
    const { data } = await supabase.from("methodology_view").select("*");
    if (data) setMethods(data);
  };

  useEffect(() => {
    fetchLayers();
    fetchMethods();
  }, [instanceId]);

  const handleApply = async (layerId: string, methodId: string) => {
    setLoading(true);
    try {
      await supabase
        .from("instance_layers")
        .update({ methodology_id: methodId })
        .eq("id", layerId);
      const { error } = await supabase.rpc("apply_methodology_to_layer", {
        p_layer_id: layerId,
      });
      if (error) throw error;
      await fetchLayers();
    } catch (err) {
      console.error("Error applying methodology:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleRebuild = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.rpc("apply_weight", {
        p_instance_id: instanceId,
        p_category: category,
      });
      if (error) throw error;
    } catch (err) {
      console.error("Error rebuilding composite:", err);
    } finally {
      setLoading(false);
    }
  };

  const headerProps = {
    title: "Baseline Instance",
    group: "country-config" as const,
    description: "Configure, score, and review vulnerability baseline layers.",
    breadcrumbs: (
      <Breadcrumbs
        items={[
          { label: "Country Configuration", href: "/country" },
          { label: "Instances", href: `/instances/${instanceId}` },
        ]}
      />
    ),
  };

  return (
    <SidebarLayout headerProps={headerProps}>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-semibold">Underlying Vulnerability Layers</h2>
        <button
          onClick={handleRebuild}
          disabled={loading}
          className="px-3 py-1.5 rounded bg-[color:var(--gsc-green)] text-white text-sm flex items-center gap-2 hover:opacity-90"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          Rebuild Composite
        </button>
      </div>

      <div className="overflow-x-auto border rounded-lg shadow-sm mb-6">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 text-left">
            <tr>
              <th className="px-4 py-2">Dataset</th>
              <th className="px-4 py-2">Admin Level</th>
              <th className="px-4 py-2">Methodology</th>
              <th className="px-4 py-2 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {layers
              .filter((l) => l.category === "underlying_vulnerability")
              .map((l) => (
                <tr key={l.link_id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-2">{l.dataset_title}</td>
                  <td className="px-4 py-2">{l.admin_level || "—"}</td>
                  <td className="px-4 py-2">
                    <select
                      className="border rounded px-2 py-1 text-sm"
                      value={l.methodology_id || ""}
                      onChange={(e) =>
                        handleApply(l.link_id, e.target.value)
                      }
                    >
                      <option value="">Select method</option>
                      {methods
                        .filter((m) => m.function_name === "normalize_to_scale")
                        .map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name}
                          </option>
                        ))}
                    </select>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button
                      onClick={() => handleApply(l.link_id, l.methodology_id || "")}
                      disabled={!l.methodology_id || loading}
                      className="px-3 py-1 rounded bg-[color:var(--gsc-blue)] text-white text-sm hover:opacity-90"
                    >
                      Apply Method
                    </button>
                  </td>
                </tr>
              ))}
            {layers.filter((l) => l.category === "underlying_vulnerability").length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-4 text-center text-gray-500 italic">
                  No layers added yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <CompositePreview instanceId={instanceId} category={category} />
    </SidebarLayout>
  );
}

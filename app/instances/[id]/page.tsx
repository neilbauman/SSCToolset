"use client";

import { useEffect, useState } from "react";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import AddLayerModal from "@/components/instances/AddLayerModal";
import { Loader2, SlidersHorizontal } from "lucide-react";

export default function InstanceDetailPage({ params }: { params: { id: string } }) {
  const instanceId = params.id;
  const [layers, setLayers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAdd, setShowAdd] = useState(false);

  const fetchLayers = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("instance_layer_summary")
      .select("*")
      .eq("instance_id", instanceId)
      .order("created_at", { ascending: false });
    setLayers(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchLayers();
  }, [instanceId]);

  const handleApply = async (linkId: string, fn: string) => {
    setLoading(true);
    const { data, error } = await supabase.rpc(fn, { p_layer_id: linkId });
    if (error) alert(error.message);
    else alert(data?.apply_methodology_to_layer || data?.apply_weight || "Done");
    fetchLayers();
    setLoading(false);
  };

  const headerProps = {
    title: "Instance Configuration",
    group: "country-config" as const,
    description: "Configure and apply methodologies to datasets in this instance.",
    breadcrumbs: (
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Country Configuration", href: "/country" },
          { label: "Instance Detail" },
        ]}
      />
    ),
  };

  return (
    <SidebarLayout headerProps={headerProps}>
      <div className="flex justify-between mb-4">
        <h2 className="text-lg font-semibold">Linked Datasets</h2>
        <button
          className="px-3 py-1.5 rounded bg-[color:var(--gsc-green)] text-white text-sm hover:opacity-90"
          onClick={() => setShowAdd(true)}
        >
          + Add Dataset
        </button>
      </div>

      <div className="overflow-x-auto border rounded-lg shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 text-left">
            <tr>
              <th className="px-4 py-2 w-[30%]">Dataset</th>
              <th className="px-4 py-2 w-[15%]">Category</th>
              <th className="px-4 py-2 w-[15%]">Admin</th>
              <th className="px-4 py-2 w-[20%]">Methodology</th>
              <th className="px-4 py-2 w-[20%] text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="text-center py-6 text-gray-500">
                  <Loader2 className="w-5 h-5 mx-auto animate-spin" />
                </td>
              </tr>
            ) : layers.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-6 text-gray-500 italic">
                  No datasets added yet.
                </td>
              </tr>
            ) : (
              layers.map((l) => (
                <tr key={l.link_id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-2">{l.dataset_title}</td>
                  <td className="px-4 py-2">{l.category}</td>
                  <td className="px-4 py-2">{l.admin_level}</td>
                  <td className="px-4 py-2">
                    <select
                      defaultValue={l.methodology_name || ""}
                      className="border rounded px-2 py-1 text-sm w-full"
                    >
                      <option value="">Select Method</option>
                      <option value="Normalize to 1–5">Normalize to 1–5</option>
                      <option value="Apply Weight">Apply Weight</option>
                      <option value="SSC Decision Tree">SSC Decision Tree</option>
                    </select>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button
                      className="px-2 py-1.5 text-xs rounded bg-[color:var(--gsc-blue)] text-white hover:opacity-90 mr-1"
                      onClick={() => handleApply(l.link_id, "apply_methodology_to_layer")}
                    >
                      Normalize
                    </button>
                    <button
                      className="px-2 py-1.5 text-xs rounded bg-[color:var(--gsc-green)] text-white hover:opacity-90 mr-1"
                      onClick={() => handleApply(l.link_id, "apply_weight")}
                    >
                      Apply Weight
                    </button>
                    <button
                      className="px-2 py-1.5 text-xs rounded bg-gray-600 text-white hover:opacity-90"
                      onClick={() => handleApply(l.link_id, "aggregate_instance_baseline")}
                    >
                      Aggregate
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showAdd && (
        <AddLayerModal
          open={showAdd}
          onClose={() => setShowAdd(false)}
          instanceId={instanceId}
          onAdded={fetchLayers}
        />
      )}
    </SidebarLayout>
  );
}

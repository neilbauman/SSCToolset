"use client";

import { useEffect, useState } from "react";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import AddLayerModal from "@/components/instances/AddLayerModal";
import { RefreshCw, Plus, Trash2 } from "lucide-react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";

export default function InstanceConfigPage({ params }: { params: { id: string; instanceId: string } }) {
  const [layers, setLayers] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);

  const fetchLayers = async () => {
    const { data } = await supabase
      .from("instance_layer_summary")
      .select("*")
      .eq("instance_id", params.instanceId);
    if (data) setLayers(data);
  };

  useEffect(() => {
    fetchLayers();
  }, []);

  const headerProps = {
    title: "Instance Configuration",
    group: "country-config" as const,
    description: "Link datasets to define this instance’s analytical layers.",
    breadcrumbs: (
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Country Configuration", href: "/country" },
          { label: params.id.toUpperCase(), href: `/country/${params.id}` },
          { label: "Instances", href: `/country/${params.id}/instances` },
          { label: "Instance" },
        ]}
      />
    ),
  };

  const handleDelete = async (linkId: string) => {
    await supabase.from("instance_layers").delete().eq("id", linkId);
    await fetchLayers();
  };

  return (
    <SidebarLayout headerProps={headerProps}>
      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={() => setShowAdd(true)}
          className="bg-green-700 text-white rounded px-3 py-1.5 flex items-center gap-1 hover:bg-green-800"
        >
          <Plus className="w-4 h-4" /> Add Dataset
        </button>
        <button
          onClick={fetchLayers}
          className="ml-auto bg-gray-100 text-gray-800 rounded px-3 py-1.5 flex items-center gap-1 hover:bg-gray-200"
        >
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      <div className="overflow-x-auto border rounded-lg shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 text-left">
            <tr>
              <th className="px-4 py-2 w-[40%]">Dataset</th>
              <th className="px-4 py-2 w-[20%]">Category</th>
              <th className="px-4 py-2 w-[20%]">Subcategory</th>
              <th className="px-4 py-2 w-[10%]">Level</th>
              <th className="px-4 py-2 w-[10%] text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {layers.map((layer) => (
              <tr key={layer.link_id} className="border-t hover:bg-gray-50">
                <td className="px-4 py-2">{layer.dataset_title}</td>
                <td className="px-4 py-2 capitalize">{layer.category}</td>
                <td className="px-4 py-2">{layer.subcategory || "—"}</td>
                <td className="px-4 py-2">{layer.admin_level}</td>
                <td className="px-4 py-2 text-right">
                  <button
                    className="p-1.5 rounded hover:bg-red-50"
                    onClick={() => handleDelete(layer.link_id)}
                    title="Remove Dataset"
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </button>
                </td>
              </tr>
            ))}
            {layers.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-gray-500 italic">
                  No datasets linked yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showAdd && (
        <AddLayerModal
          open={showAdd}
          onClose={() => setShowAdd(false)}
          instanceId={params.instanceId}
          onAdded={fetchLayers}
        />
      )}
    </SidebarLayout>
  );
}

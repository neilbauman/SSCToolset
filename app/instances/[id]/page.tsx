"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { Plus } from "lucide-react";
import AddLayerModal from "@/components/instances/AddLayerModal";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";

export default function InstanceDetailPage() {
  const params = useParams();
  const instanceId = params?.id as string;

  const [instance, setInstance] = useState<any>(null);
  const [layers, setLayers] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);

  const fetchInstance = async () => {
    const { data } = await supabase
      .from("instances_list")
      .select("*")
      .eq("id", instanceId)
      .single();
    setInstance(data);
  };

  const fetchLayers = async () => {
    const { data } = await supabase
      .from("instance_layer_summary")
      .select("*")
      .eq("instance_id", instanceId)
      .order("dataset_title", { ascending: true });
    setLayers(data || []);
  };

  useEffect(() => {
    fetchInstance();
    fetchLayers();
  }, [instanceId]);

  const headerProps = {
    title: instance?.title || "Instance",
    group: "country-config" as const,
    description: "Configure datasets and layers for this analysis instance.",
    breadcrumbs: (
      <Breadcrumbs
        items={[
          { label: "Country Configuration", href: "/country" },
          {
            label: instance?.country_iso || "Country",
            href: `/country/${instance?.country_iso}`,
          },
          { label: instance?.title || "Instance" },
        ]}
      />
    ),
  };

  return (
    <SidebarLayout headerProps={headerProps}>
      {/* Top controls */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Datasets in this Instance</h2>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-1 px-3 py-1.5 rounded bg-[color:var(--gsc-green)] text-white text-sm hover:opacity-90"
        >
          <Plus className="w-4 h-4" /> Add Dataset
        </button>
      </div>

      {/* Layers table */}
      <div className="overflow-x-auto border rounded-lg shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 text-left">
            <tr>
              <th className="px-4 py-2">Category</th>
              <th className="px-4 py-2">Dataset</th>
              <th className="px-4 py-2">Admin Level</th>
              <th className="px-4 py-2">Type</th>
            </tr>
          </thead>
          <tbody>
            {layers.length > 0 ? (
              layers.map((l) => (
                <tr key={l.link_id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-2">{l.category}</td>
                  <td className="px-4 py-2">{l.dataset_title}</td>
                  <td className="px-4 py-2">{l.admin_level}</td>
                  <td className="px-4 py-2 capitalize">{l.dataset_type}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={4}
                  className="px-4 py-6 text-center text-gray-500 italic"
                >
                  No datasets added yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add modal */}
      {showAdd && (
        <AddLayerModal
          open={showAdd}
          onClose={() => setShowAdd(false)}
          instanceId={instanceId} // ✅ pass correct ID
          onAdded={fetchLayers} // ✅ refresh after add
        />
      )}
    </SidebarLayout>
  );
}

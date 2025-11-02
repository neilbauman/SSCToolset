"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import AddLayerModal from "@/components/instances/AddLayerModal";
import CompositePreview from "@/components/instances/CompositePreview";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { Plus } from "lucide-react";

interface Layer {
  link_id: string;
  dataset_title: string;
  category: string;
  methodology_name: string | null;
  created_at: string;
}

export default function InstancePage() {
  const params = useParams();
  const instanceId = params?.id as string;
  const [layers, setLayers] = useState<Layer[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLayers = async () => {
    if (!instanceId) return;
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from("instance_layer_summary")
        .select("*")
        .eq("instance_id", instanceId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setLayers(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLayers();
  }, [instanceId]);

  return (
    <SidebarLayout
      headerProps={{
        title: "SSC Instance",
        group: "country-config",
        description:
          "Manage datasets and methodologies used for this SSC instance.",
        breadcrumbs: (
          <Breadcrumbs
            items={[
              { label: "Dashboard", href: "/" },
              { label: "Instances", href: "/instances" },
              { label: "Instance Details" },
            ]}
          />
        ),
      }}
    >
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Analytical Layers</h2>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white text-sm px-3 py-2 rounded"
        >
          <Plus className="w-4 h-4" />
          Add Layer
        </button>
      </div>

      {error && (
        <div className="bg-red-100 text-red-700 p-2 mb-3 rounded text-sm">
          {error}
        </div>
      )}

      <div className="overflow-x-auto border rounded-md shadow-sm bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="text-left p-2">Dataset</th>
              <th className="text-left p-2">Category</th>
              <th className="text-left p-2">Methodology</th>
              <th className="text-left p-2">Created</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="text-center py-3 text-gray-500">
                  Loading layers...
                </td>
              </tr>
            ) : layers.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center py-3 text-gray-500 italic">
                  No analytical layers added yet.
                </td>
              </tr>
            ) : (
              layers.map((layer) => (
                <tr
                  key={layer.link_id}
                  className="border-t hover:bg-gray-50 transition"
                >
                  <td className="p-2">{layer.dataset_title}</td>
                  <td className="p-2 capitalize">{layer.category}</td>
                  <td className="p-2">
                    {layer.methodology_name || (
                      <span className="italic text-gray-500">None</span>
                    )}
                  </td>
                  <td className="p-2">
                    {new Date(layer.created_at).toISOString().split("T")[0]}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* CompositePreview – no category prop */}
      <div className="mt-6">
        <CompositePreview instanceId={instanceId} />
      </div>

      {/* Modal */}
      {showAddModal && (
        <AddLayerModal
          open={showAddModal}
          onClose={() => setShowAddModal(false)}
          instanceId={instanceId}
          onAdded={fetchLayers}
        />
      )}
    </SidebarLayout>
  );
}

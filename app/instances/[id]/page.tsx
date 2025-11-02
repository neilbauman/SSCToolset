"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import AddLayerModal from "@/components/instances/AddLayerModal";
import { Plus, Layers } from "lucide-react";

interface InstanceLayer {
  link_id: string;
  instance_id: string;
  category: string;
  subcategory: string | null;
  dataset_title: string;
  dataset_type: string;
  data_type: string;
  admin_level: string;
}

export default function InstanceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [instance, setInstance] = useState<any>(null);
  const [layers, setLayers] = useState<InstanceLayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);

  const fetchInstance = async () => {
    const { data, error } = await supabase
      .from("instances_list")
      .select("*")
      .eq("id", id)
      .single();
    if (!error) setInstance(data);
  };

  const fetchLayers = async () => {
    const { data, error } = await supabase
      .from("instance_layer_summary")
      .select("*")
      .eq("instance_id", id);
    if (!error) setLayers(data || []);
  };

  useEffect(() => {
    if (id) {
      Promise.all([fetchInstance(), fetchLayers()]).then(() => setLoading(false));
    }
  }, [id]);

  const headerProps = {
    title: instance ? instance.title : "Instance Details",
    group: "instances" as const,
    description:
      "Manage datasets and categories used in this analytical instance.",
    breadcrumbs: (
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Instances", href: "/instances" },
          { label: instance ? instance.title : "Instance Details" },
        ]}
      />
    ),
  };

  if (loading) return <div className="p-4 text-gray-600">Loading...</div>;
  if (!instance)
    return <div className="p-4 text-gray-600">Instance not found.</div>;

  return (
    <SidebarLayout headerProps={headerProps}>
      {/* Quick summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="border rounded-lg shadow-sm p-4 flex items-center gap-3">
          <Layers className="w-6 h-6 text-[color:var(--gsc-blue)]" />
          <div>
            <p className="text-sm text-gray-500">Layers</p>
            <p className="text-lg font-semibold">{layers.length}</p>
          </div>
        </div>
      </div>

      {/* Add button */}
      <div className="flex justify-end mb-4">
        <button
          onClick={() => setShowAdd(true)}
          className="px-3 py-1.5 bg-[color:var(--gsc-green)] text-white rounded hover:opacity-90 flex items-center gap-1"
        >
          <Plus className="w-4 h-4" />
          Add Layer
        </button>
      </div>

      {/* Layers table */}
      <div className="overflow-x-auto border rounded-lg shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 text-left">
            <tr>
              <th className="px-4 py-2">Dataset</th>
              <th className="px-4 py-2">Category</th>
              <th className="px-4 py-2">Subcategory</th>
              <th className="px-4 py-2">Type</th>
              <th className="px-4 py-2">Admin Level</th>
            </tr>
          </thead>
          <tbody>
            {layers.length > 0 ? (
              layers.map((l) => (
                <tr key={l.link_id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-2">{l.dataset_title}</td>
                  <td className="px-4 py-2 capitalize">{l.category}</td>
                  <td className="px-4 py-2">{l.subcategory || "—"}</td>
                  <td className="px-4 py-2">{l.dataset_type}</td>
                  <td className="px-4 py-2">{l.admin_level}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-gray-500 italic">
                  No layers added yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add Layer Modal */}
      {showAdd && (
        <AddLayerModal
          open={true}
          onClose={() => setShowAdd(false)}
          instanceId={id}
          onAdded={fetchLayers}   // ✅ fixes build + refresh
        />
      )}
    </SidebarLayout>
  );
}

"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import AddLayerModal from "@/components/instances/AddLayerModal";

export default function InstancePage() {
  const params = useParams();
  const instanceId = params?.id as string;

  const [layers, setLayers] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [loading, setLoading] = useState(false);

  // Fetch instance layers
  const fetchLayers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("instance_layer_summary")
      .select("*")
      .eq("instance_id", instanceId)
      .order("category", { ascending: true });
    if (!error && data) setLayers(data);
    setLoading(false);
  };

  useEffect(() => {
    if (instanceId) fetchLayers();
  }, [instanceId]);

  const headerProps = {
    title: "Instance Configuration",
    group: "country-config" as const, // ✅ same group used in Country Config
    description:
      "Manage datasets and categories for this SSC instance (baseline, hazards, and pillars).",
    breadcrumbs: (
      <Breadcrumbs
        items={[
          { label: "Country Configuration", href: "/country" },
          { label: "Instances", href: `/country/${params?.countryIso}/instances` },
          { label: "Current Instance" },
        ]}
      />
    ),
  };

  return (
    <SidebarLayout headerProps={headerProps}>
      {/* Quick Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="border rounded-lg shadow-sm p-4">
          <p className="text-sm text-gray-500">Linked Layers</p>
          <p className="text-lg font-semibold">{layers.length}</p>
        </div>
        <div className="border rounded-lg shadow-sm p-4">
          <p className="text-sm text-gray-500">Instance ID</p>
          <p className="text-xs break-all">{instanceId}</p>
        </div>
        <div className="border rounded-lg shadow-sm p-4 flex justify-end items-center">
          <button
            onClick={() => setShowAdd(true)}
            className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
          >
            + Add Dataset
          </button>
        </div>
      </div>

      {/* Layers Table */}
      <div className="overflow-x-auto border rounded-lg shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-2 text-left">Category</th>
              <th className="px-4 py-2 text-left">Dataset</th>
              <th className="px-4 py-2 text-left">Type</th>
              <th className="px-4 py-2 text-left">Level</th>
            </tr>
          </thead>
          <tbody>
            {layers.map((l) => (
              <tr key={l.link_id} className="border-t hover:bg-gray-50">
                <td className="px-4 py-2">{l.category}</td>
                <td className="px-4 py-2">{l.dataset_title}</td>
                <td className="px-4 py-2">{l.dataset_type || "—"}</td>
                <td className="px-4 py-2">{l.admin_level || "—"}</td>
              </tr>
            ))}
            {!loading && layers.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-gray-500 italic">
                  No datasets linked to this instance.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add Layer Modal */}
      {showAdd && (
        <AddLayerModal
          open={showAdd}
          onClose={() => setShowAdd(false)}
          instanceId={instanceId}    // ✅ critical: pass instanceId
          onAdded={fetchLayers}      // refresh after adding
        />
      )}
    </SidebarLayout>
  );
}

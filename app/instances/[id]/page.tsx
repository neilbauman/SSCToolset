"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { Plus, Trash2, RefreshCw } from "lucide-react";
import AddLayerModal from "@/components/instances/AddLayerModal";

type InstanceLayer = {
  link_id: string;
  instance_id: string;
  category: string;
  subcategory: string | null;
  dataset_title: string;
  dataset_type: string;
  data_type: string | null;
  admin_level: string | null;
};

type InstanceInfo = {
  id: string;
  title: string;
  description: string | null;
  country_iso: string;
  type: string | null;
};

export default function InstanceDetailPage() {
  const params = useParams();
  const instanceId = params?.id as string;
  const [info, setInfo] = useState<InstanceInfo | null>(null);
  const [layers, setLayers] = useState<InstanceLayer[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAdd, setShowAdd] = useState(false);

  const loadInstance = async () => {
    const { data, error } = await supabase
      .from("instances")
      .select("*")
      .eq("id", instanceId)
      .single();
    if (!error && data) setInfo(data as InstanceInfo);
  };

  const loadLayers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("instance_layer_summary")
      .select("*")
      .eq("instance_id", instanceId)
      .order("category");
    if (!error && data) setLayers(data as InstanceLayer[]);
    setLoading(false);
  };

  const deleteLayer = async (layerId: string) => {
    if (!confirm("Remove this dataset from the instance?")) return;
    await supabase.from("instance_layers").delete().eq("id", layerId);
    await loadLayers();
  };

  useEffect(() => {
    if (instanceId) {
      loadInstance();
      loadLayers();
    }
  }, [instanceId]);

  const headerProps = {
    title: info ? info.title : "Instance",
    group: "country-config" as const,
    description: info
      ? `Analysis instance for ${info.country_iso} (${info.type ?? "unspecified"})`
      : "Instance details",
    breadcrumbs: (
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Instances", href: "/instances" },
          { label: info?.title || "Instance", href: "#" },
        ]}
      />
    ),
    right: (
      <div className="flex items-center gap-2">
        <button
          onClick={loadLayers}
          className="px-3 py-1.5 rounded bg-gray-100 hover:bg-gray-200 text-sm flex items-center gap-1"
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
        <button
          onClick={() => setShowAdd(true)}
          className="px-3 py-1.5 rounded bg-[color:var(--gsc-green)] text-white text-sm flex items-center gap-1"
        >
          <Plus className="w-4 h-4" /> Add Dataset
        </button>
      </div>
    ),
  };

  return (
    <SidebarLayout headerProps={headerProps}>
      {/* Instance Summary */}
      {info && (
        <div className="mb-6 border rounded-md p-4 bg-gray-50">
          <h2 className="text-lg font-semibold mb-1">{info.title}</h2>
          {info.description && (
            <p className="text-sm text-gray-600 mb-2">{info.description}</p>
          )}
          <div className="text-xs text-gray-500 flex flex-wrap gap-3">
            <span>Country: {info.country_iso}</span>
            <span>Type: {info.type ?? "—"}</span>
            <span>ID: {info.id}</span>
          </div>
        </div>
      )}

      {/* Layer List */}
      <div className="border rounded-lg overflow-hidden shadow-sm text-sm">
        <table className="w-full">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-3 py-2 text-left">Category</th>
              <th className="px-3 py-2 text-left">Dataset</th>
              <th className="px-3 py-2 text-left">Type</th>
              <th className="px-3 py-2 text-left">Admin</th>
              <th className="px-3 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={5} className="px-3 py-3 text-center text-gray-500">
                  Loading…
                </td>
              </tr>
            )}
            {!loading && layers.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-3 py-3 text-center text-gray-500 italic"
                >
                  No datasets linked yet.
                </td>
              </tr>
            )}
            {!loading &&
              layers.map((l) => (
                <tr key={l.link_id} className="border-t hover:bg-gray-50">
                  <td className="px-3 py-2">{l.category}</td>
                  <td className="px-3 py-2 text-[color:var(--gsc-blue)] font-medium">
                    {l.dataset_title}
                  </td>
                  <td className="px-3 py-2">{l.dataset_type}</td>
                  <td className="px-3 py-2">{l.admin_level}</td>
                  <td className="px-3 py-2 text-right">
                    <button
                      onClick={() => deleteLayer(l.link_id)}
                      className="p-1.5 rounded hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4 text-[color:var(--gsc-red)]" />
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* Add Layer Modal */}
      {showAdd && (
        <AddLayerModal
          open={showAdd}
          onClose={() => {
            setShowAdd(false);
            loadLayers();
          }}
          instanceId={instanceId}
        />
      )}
    </SidebarLayout>
  );
}

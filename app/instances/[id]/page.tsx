"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { Plus, Layers, Loader2 } from "lucide-react";
import AddLayerModal from "@/components/instances/AddLayerModal";
import CompositePreview from "@/components/instances/CompositePreview";

type Instance = {
  id: string;
  title: string;
  country_iso: string;
  type: string;
  created_at?: string;
  updated_at?: string;
};

type Layer = {
  link_id: string;
  category: string;
  dataset_title: string;
  methodology_name: string | null;
  method_type: string | null;
  created_at: string;
};

export default function InstancePage() {
  const { id } = useParams<{ id: string }>();
  const instanceId = id as string;

  const [instance, setInstance] = useState<Instance | null>(null);
  const [layers, setLayers] = useState<Layer[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [loading, setLoading] = useState(false);

  // Fetch instance metadata
  const fetchInstance = async () => {
    const { data, error } = await supabase
      .from("instances_list")
      .select("id, title, country_iso, type, created_at, updated_at")
      .eq("id", instanceId)
      .single();
    if (!error && data) setInstance(data);
  };

  // Fetch all layers associated with instance
  const fetchLayers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("instance_layer_summary")
      .select(
        "link_id, category, dataset_title, methodology_name, method_type, created_at"
      )
      .eq("instance_id", instanceId)
      .order("created_at", { ascending: false });
    if (!error) setLayers(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchInstance();
    fetchLayers();
  }, [instanceId]);

  const headerProps = {
    title: instance?.title || "Instance Details",
    group: "country-config" as const, // ensures SidebarLayout type safety
    description: instance
      ? `${instance.type === "baseline" ? "Baseline Vulnerability Instance" : "Instance Analysis"} for ${instance.country_iso}`
      : "View and manage analytical layers for this instance.",
    breadcrumbs: (
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Country Configuration", href: `/country/${instance?.country_iso}` },
          { label: instance?.title || "Instance" },
        ]}
      />
    ),
  };

  return (
    <SidebarLayout headerProps={headerProps}>
      {/* Summary Section */}
      {instance ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="border rounded-lg shadow-sm p-4 flex items-center gap-3">
            <Layers className="w-6 h-6 text-[color:var(--gsc-blue)]" />
            <div>
              <p className="text-sm text-gray-500">Type</p>
              <p className="text-lg font-semibold capitalize">{instance.type}</p>
            </div>
          </div>
          <div className="border rounded-lg shadow-sm p-4 flex items-center gap-3">
            <p className="text-sm text-gray-500">Country</p>
            <p className="text-lg font-semibold">{instance.country_iso}</p>
          </div>
          <div className="border rounded-lg shadow-sm p-4 flex items-center gap-3">
            <p className="text-sm text-gray-500">Created</p>
            <p className="text-lg font-semibold">
              {instance.created_at
                ? new Date(instance.created_at).toLocaleDateString()
                : "—"}
            </p>
          </div>
        </div>
      ) : (
        <div className="flex justify-center items-center py-10">
          <Loader2 className="animate-spin w-6 h-6 text-gray-400" />
        </div>
      )}

      {/* Layers Table */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-semibold text-lg flex items-center gap-2">
            <Layers className="w-5 h-5 text-[color:var(--gsc-green)]" />
            Analytical Layers
          </h3>
          <button
            onClick={() => setShowAdd(true)}
            className="px-3 py-1.5 rounded bg-[color:var(--gsc-green)] text-white text-sm hover:opacity-90 flex items-center gap-1"
          >
            <Plus className="w-4 h-4" /> Add Layer
          </button>
        </div>

        {loading ? (
          <div className="py-4 flex justify-center text-gray-500 text-sm">
            <Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading layers...
          </div>
        ) : layers.length === 0 ? (
          <p className="text-gray-500 italic text-sm">No layers added yet.</p>
        ) : (
          <table className="w-full text-sm border">
            <thead className="bg-gray-100 text-left">
              <tr>
                <th className="px-3 py-2">Category</th>
                <th className="px-3 py-2">Dataset</th>
                <th className="px-3 py-2">Methodology</th>
                <th className="px-3 py-2 text-right">Created</th>
              </tr>
            </thead>
            <tbody>
              {layers.map((l) => (
                <tr key={l.link_id} className="border-t hover:bg-gray-50">
                  <td className="px-3 py-2">{l.category}</td>
                  <td className="px-3 py-2">{l.dataset_title}</td>
                  <td className="px-3 py-2">{l.methodology_name || "—"}</td>
                  <td className="px-3 py-2 text-right">
                    {new Date(l.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add Layer Modal */}
      {showAdd && (
        <AddLayerModal
          open={showAdd}
          onClose={() => setShowAdd(false)}
          instanceId={instanceId}
          onAdded={async () => {
            await fetchLayers();
            setShowAdd(false);
          }}
        />
      )}

      {/* Composite Preview Section */}
      <CompositePreview instanceId={instanceId} />
    </SidebarLayout>
  );
}

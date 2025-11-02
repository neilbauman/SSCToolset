"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import AddLayerModal from "@/components/instances/AddLayerModal";
import CompositePreview from "@/components/instances/CompositePreview";
import { Plus, Calculator } from "lucide-react";

export default function CountryInstancePage() {
  const params = useParams();
  const instanceId = params.instance_id as string;
  const countryId = params.id as string;

  const [instance, setInstance] = useState<any>(null);
  const [layers, setLayers] = useState<any[]>([]);
  const [showAddModal, setShowAddModal] = useState<string | null>(null);
  const [loadingCategory, setLoadingCategory] = useState<string | null>(null);

  const categories = [
    { key: "underlying_vulnerability", label: "Underlying Vulnerabilities" },
    { key: "hazard", label: "Hazards" },
    { key: "ssc_pillar", label: "SSC Pillars" },
  ];

  const fetchInstance = async () => {
    const { data, error } = await supabase
      .from("instances_list")
      .select("*")
      .eq("id", instanceId)
      .single();
    if (!error && data) setInstance(data);
  };

  const fetchLayers = async () => {
    const { data, error } = await supabase
      .from("instance_layer_summary")
      .select("*")
      .eq("instance_id", instanceId)
      .order("created_at", { ascending: false });
    if (!error && data) setLayers(data);
  };

  useEffect(() => {
    if (instanceId) {
      fetchInstance();
      fetchLayers();
    }
  }, [instanceId]);

  const handleComputeComposite = async (category: string) => {
    try {
      setLoadingCategory(category);
      const { error } = await supabase.rpc("apply_weight", {
        p_instance_id: instanceId,
        p_category: category,
      });
      if (error) throw error;
      await fetchLayers();
    } catch (err: any) {
      alert("Error computing composite: " + err.message);
    } finally {
      setLoadingCategory(null);
    }
  };

  const headerProps = {
    title: instance?.title || "Instance",
    group: "country-config" as const,
    description: `Manage datasets and computations for this instance within ${countryId}.`,
    breadcrumbs: (
      <Breadcrumbs
        items={[
          { label: "Country Configuration", href: `/country/${countryId}` },
          { label: "Instances", href: `/country/${countryId}/instances` },
          { label: instance?.title || "Instance" },
        ]}
      />
    ),
  };

  const renderCategory = (categoryKey: string, label: string) => {
    const catLayers = layers.filter((l) => l.category === categoryKey);

    return (
      <div className="border rounded-lg p-4 bg-white shadow-sm mb-6">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-lg font-semibold">{label}</h3>
          <div className="flex gap-2">
            <button
              className="flex items-center gap-1 text-sm bg-[color:var(--gsc-green)] text-white px-2.5 py-1.5 rounded hover:opacity-90"
              onClick={() => setShowAddModal(categoryKey)}
            >
              <Plus className="w-4 h-4" /> Add Dataset
            </button>
            {catLayers.length > 0 && (
              <button
                className="flex items-center gap-1 text-sm bg-[color:var(--gsc-blue)] text-white px-2.5 py-1.5 rounded hover:opacity-90"
                onClick={() => handleComputeComposite(categoryKey)}
                disabled={loadingCategory === categoryKey}
              >
                <Calculator className="w-4 h-4" />
                {loadingCategory === categoryKey
                  ? "Computing..."
                  : "Compute Composite"}
              </button>
            )}
          </div>
        </div>

        {catLayers.length === 0 ? (
          <p className="text-gray-500 italic mb-4">No datasets linked yet.</p>
        ) : (
          <div className="overflow-x-auto border rounded">
            <table className="w-full text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-3 py-2 text-left">Dataset</th>
                  <th className="px-3 py-2 text-left">Methodology</th>
                  <th className="px-3 py-2 text-left">Created</th>
                </tr>
              </thead>
              <tbody>
                {catLayers.map((l) => (
                  <tr key={l.link_id} className="border-t hover:bg-gray-50">
                    <td className="px-3 py-2">{l.dataset_title}</td>
                    <td className="px-3 py-2">{l.methodology_name || "—"}</td>
                    <td className="px-3 py-2">
                      {l.created_at
                        ? new Date(l.created_at).toLocaleDateString()
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-4">
          <CompositePreview instanceId={instanceId} category={categoryKey} />
        </div>
      </div>
    );
  };

  return (
    <SidebarLayout headerProps={headerProps}>
      {categories.map((cat) => renderCategory(cat.key, cat.label))}

      {showAddModal && (
        <AddLayerModal
          open={!!showAddModal}
          category={showAddModal}
          instanceId={instanceId}
          onClose={() => setShowAddModal(null)}
          onAdded={fetchLayers}
        />
      )}
    </SidebarLayout>
  );
}

"use client";

import { useEffect, useState } from "react";
import SidebarLayout from "@/components/layout/SidebarLayout";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import CategorySummary from "@/components/instances/CategorySummary";
import AddLayerModal from "@/components/instances/AddLayerModal";
import CompositePreview from "@/components/instances/CompositePreview";

type Instance = {
  id: string;
  country_iso: string;
  type: string;
  created_at: string;
  target_admin_level?: string | null;
  disaggregation_method?: string | null;
};

export default function InstancePage({ params }: { params: { id: string } }) {
  const instanceId = params.id;
  const [instance, setInstance] = useState<Instance | null>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const CATEGORY_LABELS: Record<string, string> = {
    ssc_p1: "SSC Pillar 1",
    ssc_p2: "SSC Pillar 2",
    ssc_p3: "SSC Pillar 3",
    hazards: "Hazards",
    underlying_vulnerability: "Underlying Vulnerabilities",
  };

  const fetchInstance = async () => {
    const { data, error } = await supabase
      .from("ssc_instances")
      .select("*")
      .eq("id", instanceId)
      .single();
    if (!error) setInstance(data);
  };

  const fetchLayers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("instance_layers")
      .select("*")
      .eq("instance_id", instanceId);
    if (error) setErr(error.message);
    else setCategories(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    fetchInstance();
    fetchLayers();
  }, [instanceId]);

  const updateInstance = async (updates: Partial<Instance>) => {
    if (!instance) return;
    const { error } = await supabase
      .from("ssc_instances")
      .update(updates)
      .eq("id", instance.id);
    if (!error) setInstance({ ...instance, ...updates });
  };

  return (
    <SidebarLayout
      headerProps={{
        title: "SSC Instance Configuration",
        group: "country-config",
        description:
          "Manage datasets, methodologies, and analytical categories for this SSC instance.",
      }}
    >
      <div className="max-w-6xl mx-auto p-4 space-y-6">
        {err && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-2 rounded">
            {err}
          </div>
        )}

        {/* Instance overview */}
        {instance && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-white p-4 rounded-lg border">
            <div>
              <div className="text-sm text-gray-500">Type</div>
              <div className="font-semibold">{instance.type}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Country</div>
              <div className="font-semibold">{instance.country_iso}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Created</div>
              <div className="font-semibold">
                {new Date(instance.created_at).toISOString().split("T")[0]}
              </div>
            </div>
          </div>
        )}

        {/* Output Settings */}
        {instance && (
          <div className="bg-white p-4 rounded-lg border space-y-3">
            <h2 className="font-semibold text-gray-800">Output Settings</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  Target Admin Level
                </label>
                <select
                  value={instance.target_admin_level ?? ""}
                  onChange={(e) =>
                    updateInstance({ target_admin_level: e.target.value })
                  }
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="">Select target level…</option>
                  <option value="ADM2">ADM2</option>
                  <option value="ADM3">ADM3</option>
                  <option value="ADM4">ADM4</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  Disaggregation Method
                </label>
                <select
                  value={instance.disaggregation_method ?? ""}
                  onChange={(e) =>
                    updateInstance({ disaggregation_method: e.target.value })
                  }
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="">Select method…</option>
                  <option value="inherit">Inherit (simple copy)</option>
                  <option value="weighted">Weighted distribution</option>
                  <option value="equal_split">Equal split</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Analytical Categories */}
        <div>
          <h2 className="font-semibold text-gray-800 mb-2">
            Analytical Categories
          </h2>
          <CategorySummary
            instanceId={instanceId}
            categories={categories}
            labels={CATEGORY_LABELS}
            loading={loading}
            onAdd={(cat) => setShowAddModal(cat)}
            onPreview={(cat) => setActiveCategory(cat)}
            onRefresh={fetchLayers}
          />
        </div>

        {/* Category Preview */}
        {activeCategory && (
          <div>
            <h3 className="text-lg font-semibold mt-6 mb-2">
              Composite Preview – {CATEGORY_LABELS[activeCategory]}
            </h3>
            <CompositePreview instanceId={instanceId} category={activeCategory} />
          </div>
        )}

        {/* Add Layer Modal */}
        {showAddModal && (
          <AddLayerModal
            open={true}
            onClose={() => setShowAddModal(null)}
            instanceId={instanceId}
            category={showAddModal}
            onAdded={fetchLayers}
          />
        )}
      </div>
    </SidebarLayout>
  );
}

"use client";

import { useEffect, useState } from "react";
import SidebarLayout from "@/components/layouts/SidebarLayout";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import CategorySummary from "@/components/instances/CategorySummary";
import CompositePreview from "@/components/instances/CompositePreview";
import AddLayerModal from "@/components/instances/AddLayerModal";

export default function InstancePage({ params }: { params: { id: string } }) {
  const instanceId = params.id;
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState<string | null>(null);

  const CATEGORY_LABELS: Record<string, string> = {
    ssc_p1: "SSC Pillar 1",
    ssc_p2: "SSC Pillar 2",
    ssc_p3: "SSC Pillar 3",
    hazards: "Hazards",
    underlying_vulnerability: "Underlying Vulnerabilities",
  };

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("instance_layers")
        .select("*")
        .eq("instance_id", instanceId);

      if (error) throw error;
      setCategories(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, [instanceId]);

  return (
    <SidebarLayout
      headerProps={{
        title: "SSC Instance Configuration",
        group: "country-config",
        description:
          "Manage datasets and methodologies for this SSC instance configuration.",
      }}
    >
      <div className="max-w-6xl mx-auto p-4 space-y-6">
        {error && <div className="text-red-600 text-sm">Error: {error}</div>}

        {/* Category summary grid */}
        <CategorySummary
          instanceId={instanceId}
          categories={categories}
          labels={CATEGORY_LABELS}
          loading={loading}
          onRefresh={fetchCategories}
          onAdd={(cat) => setShowAddModal(cat)}
          onPreview={(cat) => setActiveCategory(cat)} // ✅ fixed
        />

        {/* Composite preview for selected category */}
        {activeCategory && (
          <div className="mt-4">
            <CompositePreview
              instanceId={instanceId}
              category={activeCategory}
            />
          </div>
        )}

        {/* Add dataset modal */}
        {showAddModal && (
          <AddLayerModal
            open={true}
            onClose={() => setShowAddModal(null)}
            instanceId={instanceId}
            category={showAddModal}
            onAdded={fetchCategories}
          />
        )}
      </div>
    </SidebarLayout>
  );
}

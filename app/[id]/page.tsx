"use client";

import { useState } from "react";
import SidebarLayout from "@/components/layout/SidebarLayout";
import CategorySummary from "@/components/instances/CategorySummary";
import CompositePreview from "@/components/instances/CompositePreview";
import AddLayerModal from "@/components/instances/AddLayerModal";

export default function InstancePage({ params }: { params: { id: string } }) {
  const instanceId = params.id;
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState<string | null>(null);

  const CATEGORY_LABELS: Record<string, string> = {
    ssc_p1: "SSC Pillar 1",
    ssc_p2: "SSC Pillar 2",
    ssc_p3: "SSC Pillar 3",
    hazards: "Hazards",
    underlying_vulnerability: "Underlying Vulnerabilities",
  };

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
        {/* Category summary grid */}
        <CategorySummary
          instanceId={instanceId}
          labels={CATEGORY_LABELS}
          onAdd={(cat) => setShowAddModal(cat)}
          onPreview={(cat) => setActiveCategory(cat)} // ✅ replaces onOpenCategory
          loading={false}
          categories={[]} // placeholder, Supabase fetching handled in CategorySummary
          onRefresh={() => {}}
        />

        {/* Composite preview for selected category */}
        {activeCategory && (
          <div className="mt-4">
            <CompositePreview instanceId={instanceId} category={activeCategory} />
          </div>
        )}

        {/* Add dataset modal */}
        {showAddModal && (
          <AddLayerModal
            open={true}
            onClose={() => setShowAddModal(null)}
            instanceId={instanceId}
            category={showAddModal}
            onAdded={() => {}}
          />
        )}
      </div>
    </SidebarLayout>
  );
}

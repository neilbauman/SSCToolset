"use client";

import { useEffect, useState } from "react";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";

import AddLayerModal from "@/components/instances/AddLayerModal";
import InstanceLayersList from "@/components/instances/InstanceLayersList";
import CompositePreview from "@/components/instances/CompositePreview";

type Props = {
  params: { id: string };
};

const CATEGORY_LABELS: Record<string, string> = {
  ssc_p1: "SSC P1 – Shelter Enclosure",
  ssc_p2: "SSC P2 – Interior Livability",
  ssc_p3: "SSC P3 – Settlement & Access",
  hazard: "Hazards",
  underlying_vulnerability: "Underlying Vulnerabilities",
};

const CATEGORY_KEYS = Object.keys(CATEGORY_LABELS);

export default function InstancePage({ params }: Props) {
  const instanceId = params.id;

  const [instanceTitle, setInstanceTitle] = useState("Instance");
  const [targetLevel, setTargetLevel] = useState<string>("…");
  const [showAddModal, setShowAddModal] = useState<string | null>(null);
  const [refresh, setRefresh] = useState(0);

  const headerProps = {
    title: instanceTitle,
    group: "country-config" as const,
    description: "Compose SSC composites by linking datasets and methodologies.",
    breadcrumbs: (
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Instances", href: "/instances" },
          { label: instanceTitle },
        ]}
      />
    ),
  };

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("instances_list")
        .select("title")
        .eq("id", instanceId)
        .maybeSingle();
      if (data?.title) setInstanceTitle(data.title);

      const { data: level } = await supabase.rpc("get_instance_target_level", {
        p_instance_id: instanceId,
      });
      if (level) setTargetLevel(level);
    })();
  }, [instanceId]);

  const handleChanged = () => setRefresh((r) => r + 1);

  return (
    <SidebarLayout headerProps={headerProps}>
      <div className="space-y-6 text-sm text-gray-800">
        <div className="bg-gray-50 border rounded-lg px-3 py-2 text-xs text-gray-600">
          <span className="font-medium text-gray-700">Target admin level:</span>{" "}
          {targetLevel}
        </div>

        {CATEGORY_KEYS.map((cat) => (
          <section key={cat} className="border rounded-lg p-3 bg-white shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-semibold text-gray-800 text-base">
                {CATEGORY_LABELS[cat]}
              </h2>
              <button
                onClick={() => setShowAddModal(cat)}
                className="px-2 py-1 text-xs rounded bg-[color:var(--gsc-green)] text-white hover:opacity-90"
              >
                + Add dataset
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <InstanceLayersList
                instanceId={instanceId}
                category={cat}
                onChanged={handleChanged}
                key={`layers-${cat}-${refresh}`}
              />
              <CompositePreview
                instanceId={instanceId}
                category={cat}
                key={`preview-${cat}-${refresh}`}
              />
            </div>
          </section>
        ))}
      </div>

      {showAddModal && (
        <AddLayerModal
          open={!!showAddModal}
          onClose={() => setShowAddModal(null)}
          instanceId={instanceId}
          category={showAddModal}
          onAdded={handleChanged}
        />
      )}
    </SidebarLayout>
  );
}

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
  const [showAddModal, setShowAddModal] = useState<string | null>(null);
  const [instanceTitle, setInstanceTitle] = useState<string>("Instance");
  const [err, setErr] = useState<string | null>(null);

  const headerProps = {
    title: instanceTitle,
    group: "country-config" as const,
    description: "Configure datasets, apply methodologies, and view composite results.",
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
      const { data, error } = await supabase
        .from("instances_list")
        .select("title")
        .eq("id", instanceId)
        .maybeSingle();

      if (error) setErr(error.message);
      else if (data?.title) setInstanceTitle(data.title);
    })();
  }, [instanceId]);

  const onChanged = () => {
    // Layers refresh themselves
  };

  return (
    <SidebarLayout headerProps={headerProps}>
      <div className="space-y-5">
        {err && (
          <div className="bg-red-50 text-red-700 px-3 py-2 rounded text-sm">
            Error loading instance: {err}
          </div>
        )}

        {/* Category sections */}
        {CATEGORY_KEYS.map((key) => (
          <section
            key={key}
            className="border rounded-lg bg-white shadow-sm p-3 space-y-3"
          >
            <div className="flex items-center justify-between border-b pb-2">
              <h2 className="text-sm font-semibold text-gray-800">
                {CATEGORY_LABELS[key]}
              </h2>
              <button
                onClick={() => setShowAddModal(key)}
                className="text-xs px-2 py-1 rounded bg-[color:var(--gsc-green)] text-white hover:opacity-90"
              >
                + Add dataset
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <InstanceLayersList
                instanceId={instanceId}
                category={key}
                onChanged={onChanged}
              />
              <CompositePreview instanceId={instanceId} category={key} />
            </div>
          </section>
        ))}
      </div>

      {showAddModal && (
        <AddLayerModal
  open={!!showAddModal}
  onClose={() => setShowAddModal(null)}
  instanceId={instanceId}
  onAdded={onChanged}
/>
      )}
    </SidebarLayout>
  );
}

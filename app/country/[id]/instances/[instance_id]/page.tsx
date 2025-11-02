"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";

import AddLayerModal from "@/components/instances/AddLayerModal";
import InstanceLayersList from "@/components/instances/InstanceLayersList";
import CompositePreview from "@/components/instances/CompositePreview";

type Props = {
  params: { id: string; instance_id: string };
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
  const countryId = params.id;
  const instanceId = params.instance_id;

  const [showAddModal, setShowAddModal] = useState<string | null>(null); // holds category key when open
  const [instanceTitle, setInstanceTitle] = useState<string>("Instance");

  const headerProps = {
    title: instanceTitle,
    group: "country-config" as const,
    description:
      "Build and preview a baseline SSC composite from datasets and methodologies.",
    breadcrumbs: (
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Country Configuration", href: "/country" },
          { label: countryId, href: `/country/${countryId}` },
          { label: "Instances", href: `/country/${countryId}/instances` },
          { label: "Instance" },
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
    })();
  }, [instanceId]);

  const onAnythingChanged = () => {
    // This is passed to child components; they refresh themselves.
  };

  return (
    <SidebarLayout headerProps={headerProps}>
      <div className="space-y-6">
        {/* Five blocks — three SSC pillars, Hazards, Underlying */}
        {CATEGORY_KEYS.map((categoryKey) => (
          <section key={categoryKey} className="border rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-lg">
                {CATEGORY_LABELS[categoryKey]}
              </h2>
              <button
                onClick={() => setShowAddModal(categoryKey)}
                className="px-3 py-1.5 rounded bg-[color:var(--gsc-green)] text-white text-sm hover:opacity-90"
              >
                + Add dataset
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <InstanceLayersList
                instanceId={instanceId}
                category={categoryKey}
                onChanged={onAnythingChanged}
              />
              <CompositePreview
                instanceId={instanceId}
                category={categoryKey}
              />
            </div>
          </section>
        ))}
      </div>

      {/* Add Layer Modal */}
      {showAddModal && (
        <AddLayerModal
          open={!!showAddModal}
          onClose={() => setShowAddModal(null)}
          instanceId={instanceId}
          category={showAddModal}
          onAdded={async () => {}}
        />
      )}
    </SidebarLayout>
  );
}

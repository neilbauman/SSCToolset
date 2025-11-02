"use client";

import { useEffect, useMemo, useState } from "react";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import SidebarLayout from "@/components/layout/SidebarLayout";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";

import AddLayerModal from "@/components/instances/AddLayerModal";
import InstanceLayersList from "@/components/instances/InstanceLayersList";
import CompositePreview from "@/components/instances/CompositePreview";

const CATEGORY_LABELS: Record<string, string> = {
  ssc_p1: "SSC P1 – Shelter Enclosure",
  ssc_p2: "SSC P2 – Interior Livability",
  ssc_p3: "SSC P3 – Settlement & Access",
  hazard: "Hazards",
  underlying_vulnerability: "Underlying Vulnerabilities",
};

type Props = {
  params: { id: string };
};

export default function InstancePage({ params }: Props) {
  const instanceId = params.id;

  const [instanceTitle, setInstanceTitle] = useState("Instance");
  const [targetAdm, setTargetAdm] = useState("ADM4");
  const [disagg, setDisagg] = useState("inherit");
  const [savingSettings, setSavingSettings] = useState(false);

  const [activeCategory, setActiveCategory] =
    useState<keyof typeof CATEGORY_LABELS>("underlying_vulnerability");
  const [showAddModal, setShowAddModal] = useState<string | null>(null);

  const headerProps = useMemo(
    () => ({
      title: instanceTitle,
      group: "country-config" as const,
      description:
        "Define analytical layers, apply methodologies, and view composite previews.",
      breadcrumbs: (
        <Breadcrumbs
          items={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Instances", href: "/instances" },
            { label: instanceTitle },
          ]}
        />
      ),
    }),
    [instanceTitle]
  );

  // Load instance metadata
  useEffect(() => {
    (async () => {
      const { data: row } = await supabase
        .from("ssc_instances")
        .select("title, target_admin_level, disaggregation_method")
        .eq("id", instanceId)
        .maybeSingle();

      if (row?.title) setInstanceTitle(row.title);
      if (row?.target_admin_level) setTargetAdm(row.target_admin_level);
      if (row?.disaggregation_method) setDisagg(row.disaggregation_method);
    })();
  }, [instanceId]);

  const saveSettings = async () => {
    setSavingSettings(true);
    await supabase
      .from("ssc_instances")
      .update({
        target_admin_level: targetAdm,
        disaggregation_method: disagg,
      })
      .eq("id", instanceId);
    setSavingSettings(false);
  };

  const computeCategory = async (cat: string) => {
    await supabase.rpc("apply_methodology_to_category", {
      p_instance_id: instanceId,
      p_category: cat,
    });
    setActiveCategory(cat as keyof typeof CATEGORY_LABELS);
  };

  return (
    <SidebarLayout headerProps={headerProps}>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Output Settings */}
        <section className="border rounded-lg p-4 bg-white">
          <h2 className="font-semibold mb-3">Output Settings</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Target Admin Level
              </label>
              <select
                value={targetAdm}
                onChange={(e) => setTargetAdm(e.currentTarget.value)}
                className="w-full border rounded px-3 py-2"
              >
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
                value={disagg}
                onChange={(e) => setDisagg(e.currentTarget.value)}
                className="w-full border rounded px-3 py-2"
              >
                <option value="inherit">Inherit (simple copy)</option>
                <option value="population_share">Population share</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end mt-3">
            <button
              onClick={saveSettings}
              disabled={savingSettings}
              className="px-3 py-1.5 rounded bg-[color:var(--gsc-green)] text-white text-sm hover:opacity-90 disabled:opacity-50"
            >
              {savingSettings ? "Saving…" : "Save settings"}
            </button>
          </div>
        </section>

        {/* Category grid */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(CATEGORY_LABELS).map(([key, label]) => {
            const selected = activeCategory === key;
            return (
              <div
                key={key}
                className={`border rounded-lg p-4 ${
                  selected ? "bg-green-50 border-green-400" : "bg-gray-50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">{label}</h3>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowAddModal(key)}
                      className="text-blue-600 text-sm hover:underline"
                    >
                      Add
                    </button>
                    <button
                      onClick={() =>
                        setActiveCategory(key as keyof typeof CATEGORY_LABELS)
                      }
                      className="text-gray-600 text-sm hover:underline"
                    >
                      View
                    </button>
                  </div>
                </div>
                <div className="flex justify-end mt-3">
                  <button
                    onClick={() => computeCategory(key)}
                    className="px-3 py-1.5 rounded border text-sm hover:bg-gray-50"
                  >
                    Compute / Refresh
                  </button>
                </div>
              </div>
            );
          })}
        </section>

        {/* Active Category Details */}
        <section className="border rounded-lg p-4 bg-white">
          <h2 className="font-semibold mb-3">
            {CATEGORY_LABELS[activeCategory]}
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <InstanceLayersList
              instanceId={instanceId}
              category={activeCategory}
              onChanged={() => computeCategory(activeCategory)}
            />
            <CompositePreview
              instanceId={instanceId}
              category={activeCategory}
            />
          </div>
        </section>
      </div>

      {/* Add dataset modal */}
      {showAddModal && (
        <AddLayerModal
          open={!!showAddModal}
          onClose={() => setShowAddModal(null)}
          instanceId={instanceId}
          category={showAddModal}
          onAdded={() => computeCategory(showAddModal)}
        />
      )}
    </SidebarLayout>
  );
}

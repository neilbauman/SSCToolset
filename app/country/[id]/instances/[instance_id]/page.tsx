"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import SidebarLayout from "@/components/layout/SidebarLayout";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";

import AddLayerModal from "@/components/instances/AddLayerModal";
import InstanceLayersList from "@/components/instances/InstanceLayersList";
import CompositePreview from "@/components/instances/CompositePreview";

type Props = { params: { id: string; instance_id: string } };

const CATEGORY_LABELS: Record<string, string> = {
  ssc_p1: "SSC P1 – Shelter Enclosure",
  ssc_p2: "SSC P2 – Interior Livability",
  ssc_p3: "SSC P3 – Settlement & Access",
  hazard: "Hazards",
  underlying_vulnerability: "Underlying Vulnerabilities",
};

const CATEGORY_KEYS = Object.keys(CATEGORY_LABELS) as (keyof typeof CATEGORY_LABELS)[];

type InstanceMeta = {
  id: string;
  title: string | null;
  country_iso?: string | null;
  target_admin_level?: string | null;
  disaggregation_method?: string | null;
  created_at?: string | null;
};

export default function InstancePage({ params }: Props) {
  const countryId = params.id;
  const instanceId = params.instance_id;

  // header
  const [instanceTitle, setInstanceTitle] = useState("Instance");
  const headerProps = useMemo(
    () => ({
      title: instanceTitle || "Instance",
      group: "country-config" as const,
      description:
        "Configure the SSC instance, attach datasets to categories, and compute composites for preview.",
      breadcrumbs: (
        <Breadcrumbs
          items={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Country Configuration", href: "/country" },
            { label: countryId, href: `/country/${countryId}` },
            { label: "Instances", href: `/country/${countryId}/instances` },
            { label: instanceTitle || "Instance" },
          ]}
        />
      ),
    }),
    [countryId, instanceTitle]
  );

  // meta/settings
  const [meta, setMeta] = useState<InstanceMeta | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const [activeCategory, setActiveCategory] =
    useState<keyof typeof CATEGORY_LABELS>("underlying_vulnerability");

  // Add modal
  const [showAddModal, setShowAddModal] = useState<keyof typeof CATEGORY_LABELS | null>(
    null
  );

  // Load header title (instances_list) and details (ssc_instances)
  useEffect(() => {
    (async () => {
      const t = supabase.from("instances_list").select("title").eq("id", instanceId).maybeSingle();
      const d = supabase.from("ssc_instances")
        .select("id, country_iso, target_admin_level, disaggregation_method, created_at, title")
        .eq("id", instanceId)
        .maybeSingle();

      const [{ data: titleRow }, { data: instRow }] = await Promise.all([t, d]);

      if (titleRow?.title) setInstanceTitle(titleRow.title);
      if (instRow) {
        setMeta({
          id: instRow.id,
          title: instRow.title ?? titleRow?.title ?? null,
          country_iso: instRow.country_iso ?? null,
          target_admin_level: instRow.target_admin_level ?? null,
          disaggregation_method: instRow.disaggregation_method ?? null,
          created_at: instRow.created_at ?? null,
        });
      }
    })();
  }, [instanceId]);

  // settings local state
  const [targetAdm, setTargetAdm] = useState<string>("ADM4");
  const [disagg, setDisagg] = useState<string>("inherit");

  useEffect(() => {
    if (!meta) return;
    setTargetAdm(meta.target_admin_level || "ADM4");
    setDisagg(meta.disaggregation_method || "inherit");
  }, [meta]);

  const saveSettings = async () => {
    if (!meta) return;
    setSavingSettings(true);
    try {
      const { error } = await supabase
        .from("ssc_instances")
        .update({
          target_admin_level: targetAdm,
          disaggregation_method: disagg,
        })
        .eq("id", meta.id);
      if (error) throw error;
    } finally {
      setSavingSettings(false);
    }
  };

  const computeCategory = useCallback(
    async (cat: keyof typeof CATEGORY_LABELS) => {
      // calls server to (re)build normalized/aggregated table for this category
      await supabase.rpc("apply_methodology_to_category", {
        p_instance_id: instanceId,
        p_category: cat,
      });
      // CompositePreview fetches on props change; force a tiny key tick by toggling active twice if same
      setActiveCategory((prev) => (prev === cat ? cat : cat));
    },
    [instanceId]
  );

  const onAddedDataset = async () => {
    if (showAddModal) {
      await computeCategory(showAddModal);
      setShowAddModal(null);
    }
  };

  return (
    <SidebarLayout headerProps={headerProps}>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Output settings */}
        <section className="border rounded-lg p-4 bg-white">
          <h2 className="font-semibold mb-3">Output Settings</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Target Admin Level</label>
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
              <label className="block text-sm text-gray-600 mb-1">Disaggregation Method</label>
              <select
                value={disagg}
                onChange={(e) => setDisagg(e.currentTarget.value)}
                className="w-full border rounded px-3 py-2"
              >
                <option value="inherit">Inherit (simple copy)</option>
                <option value="population_share">Population share (future)</option>
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

        {/* Category chooser / grid */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {CATEGORY_KEYS.map((cat) => {
            const selected = activeCategory === cat;
            return (
              <div
                key={cat}
                className={`border rounded-lg p-4 ${selected ? "bg-green-50 border-green-400" : "bg-gray-50"}`}
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">{CATEGORY_LABELS[cat]}</h3>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowAddModal(cat)}
                      className="text-blue-600 text-sm hover:underline"
                    >
                      Add
                    </button>
                    <button
                      onClick={() => {
                        setActiveCategory(cat);
                        // do not compute automatically; allow user to press compute
                      }}
                      className="text-gray-600 text-sm hover:underline"
                    >
                      View
                    </button>
                  </div>
                </div>
                <div className="flex justify-end mt-3">
                  <button
                    onClick={() => computeCategory(cat)}
                    className="px-3 py-1.5 rounded border text-sm hover:bg-gray-50"
                  >
                    Compute / Refresh
                  </button>
                </div>
              </div>
            );
          })}
        </section>

        {/* Active category details */}
        <section className="border rounded-lg p-4 bg-white">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">
              {CATEGORY_LABELS[activeCategory]}
            </h2>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <InstanceLayersList
              instanceId={instanceId}
              category={activeCategory}
              onChanged={() => computeCategory(activeCategory)}
            />
            <CompositePreview instanceId={instanceId} category={activeCategory} />
          </div>
        </section>
      </div>

      {/* Add dataset modal */}
      {showAddModal && (
        <AddLayerModal
  open={!!showAddModal}
  onClose={() => setShowAddModal(null)}
  instanceId={instanceId}
  onAdded={onAddedDataset}
/>
      )}
    </SidebarLayout>
  );
}

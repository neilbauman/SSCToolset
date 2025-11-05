"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import SidebarLayout from "@/components/layout/SidebarLayout";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";

import AddLayerModal from "@/components/instances/AddLayerModal";
import InstanceLayersList from "@/components/instances/InstanceLayersList";
import CompositePreview from "@/components/instances/CompositePreview";
import DataPreviewModal from "@/components/SSC/DataPreviewModal";

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
  const instance_id = params.instance_id;

  // header title
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

  // instance meta/settings
  const [meta, setMeta] = useState<InstanceMeta | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const [activeCategory, setActiveCategory] =
    useState<keyof typeof CATEGORY_LABELS>("underlying_vulnerability");

  // Add modal
  const [showAddModal, setShowAddModal] = useState<keyof typeof CATEGORY_LABELS | null>(null);

  // Data preview modal metric key
  const [showPreview, setShowPreview] = useState<string | null>(null);

  // Load instance label + details
  useEffect(() => {
    (async () => {
      const t = supabase.from("instances_list").select("title").eq("id", instance_id).maybeSingle();
      const d = supabase
        .from("ssc_instances")
        .select("id, country_iso, target_admin_level, disaggregation_method, created_at, title")
        .eq("id", instance_id)
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
  }, [instance_id]);

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

  // Compute category (server RPC)
  const computeCategory = useCallback(
    async (cat: keyof typeof CATEGORY_LABELS) => {
      await supabase.rpc("apply_methodology_to_category", {
        p_instance_id: instance_id,
        p_category: cat,
      });
      setActiveCategory((_) => cat);
    },
    [instance_id]
  );

  const onAddedDataset = async () => {
    if (showAddModal) {
      await computeCategory(showAddModal);
      setShowAddModal(null);
    }
  };

  return (
    <SidebarLayout headerProps={headerProps}>
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Output settings */}
        <section className="rounded-lg border bg-white p-4">
          <h2 className="mb-3 font-semibold">Output Settings</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm text-gray-600">Target Admin Level</label>
              <select
                value={targetAdm}
                onChange={(e) => setTargetAdm(e.currentTarget.value)}
                className="w-full rounded border px-3 py-2"
              >
                <option value="ADM2">ADM2</option>
                <option value="ADM3">ADM3</option>
                <option value="ADM4">ADM4</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm text-gray-600">Disaggregation Method</label>
              <select
                value={disagg}
                onChange={(e) => setDisagg(e.currentTarget.value)}
                className="w-full rounded border px-3 py-2"
              >
                <option value="inherit">Inherit (simple copy)</option>
                <option value="population_share">Population share (future)</option>
              </select>
            </div>
          </div>
          <div className="mt-3 flex justify-end">
            <button
              onClick={saveSettings}
              disabled={savingSettings}
              className="rounded bg-[color:var(--gsc-green)] px-3 py-1.5 text-sm text-white hover:opacity-90 disabled:opacity-50"
            >
              {savingSettings ? "Saving…" : "Save settings"}
            </button>
          </div>
        </section>

        {/* Category chooser */}
        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {CATEGORY_KEYS.map((cat) => {
            const selected = activeCategory === cat;
            return (
              <div
                key={cat}
                className={`rounded-lg border p-4 ${selected ? "border-green-400 bg-green-50" : "bg-gray-50"}`}
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">{CATEGORY_LABELS[cat]}</h3>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowAddModal(cat)}
                      className="text-sm text-blue-600 hover:underline"
                    >
                      Add
                    </button>
                    <button
                      onClick={() => setActiveCategory(cat)}
                      className="text-sm text-gray-600 hover:underline"
                    >
                      View
                    </button>
                  </div>
                </div>
                <div className="mt-3 flex justify-end">
                  <button
                    onClick={() => computeCategory(cat)}
                    className="rounded border px-3 py-1.5 text-sm hover:bg-gray-50"
                  >
                    Compute / Refresh
                  </button>
                </div>
              </div>
            );
          })}
        </section>

        {/* Active category details */}
        <section className="rounded-lg border bg-white p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">{CATEGORY_LABELS[activeCategory]}</h2>
            {/* Quick preview buttons for common metrics (optional shortcuts) */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowPreview("poverty_rate")}
                className="rounded border px-2 py-1 text-xs hover:bg-gray-50"
              >
                Preview poverty_rate
              </button>
              <button
                onClick={() => setShowPreview("population_density")}
                className="rounded border px-2 py-1 text-xs hover:bg-gray-50"
              >
                Preview population_density
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <InstanceLayersList
              instanceId={instance_id}
              category={activeCategory}
              onChanged={() => computeCategory(activeCategory)}
            />
            <CompositePreview instanceId={instance_id} category={activeCategory} />
          </div>
        </section>
      </div>

      {/* Add dataset modal */}
      {showAddModal && (
        <AddLayerModal
          open={!!showAddModal}
          onClose={() => setShowAddModal(null)}
          instanceId={instance_id}
          onAdded={onAddedDataset}
        />
      )}

      {/* Data preview modal */}
      {showPreview && (
        <DataPreviewModal
          open={!!showPreview}
          metric={showPreview}
          instanceId={instance_id}
          onClose={() => setShowPreview(null)}
        />
      )}
    </SidebarLayout>
  );
}

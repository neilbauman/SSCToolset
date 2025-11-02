"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import AddLayerModal from "@/components/instances/AddLayerModal";
import CompositePreview from "@/components/instances/CompositePreview";
import CategorySummary from "@/components/instances/CategorySummary";
import { Loader2 } from "lucide-react";

type Instance = {
  id: string;
  country_iso: string;
  type: string;
  created_at: string;
  target_admin_level: string | null;
  disaggregation_method: string | null;
};

type CategorySummaryData = {
  category: string;
  dataset_count: number;
  methodology_count: number;
  composite_exists: boolean;
  latest_table: string | null;
};

const CATEGORY_LABELS: Record<string, string> = {
  ssc_p1: "SSC P1 – Shelter Enclosure",
  ssc_p2: "SSC P2 – Interior Livability",
  ssc_p3: "SSC P3 – Settlement & Access",
  hazard: "Hazards",
  underlying_vulnerability: "Underlying Vulnerabilities",
};

export default function InstancePage() {
  const params = useParams<{ id: string }>();
  const instanceId = params?.id as string;

  const [inst, setInst] = useState<Instance | null>(null);
  const [categories, setCategories] = useState<CategorySummaryData[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>("underlying_vulnerability");
  const [showAddModal, setShowAddModal] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // ---- Load instance ----
  const fetchInstance = async () => {
    const { data, error } = await supabase
      .from("instances_list")
      .select("id, country_iso, type, created_at, target_admin_level, disaggregation_method")
      .eq("id", instanceId)
      .maybeSingle();

    if (error) setErr(error.message);
    else setInst((data as Instance) ?? null);
  };

  // ---- Load categories ----
  const fetchCategories = async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("get_instance_category_summary", {
      p_instance_id: instanceId,
    });
    if (error) setErr(error.message);
    else setCategories(data as CategorySummaryData[]);
    setLoading(false);
  };

  useEffect(() => {
    if (instanceId) {
      fetchInstance();
      fetchCategories();
    }
  }, [instanceId]);

  const updateSetting = async (patch: Partial<Instance>) => {
    if (!inst) return;
    const { error } = await supabase.from("instances_list").update(patch).eq("id", inst.id);
    if (!error) fetchInstance();
  };

  const headerProps = useMemo(
    () => ({
      title: inst?.type ?? "Instance",
      group: "country-config" as const,
      description: "Define analytical layers and compute SSC categories.",
      breadcrumbs: (
        <Breadcrumbs
          items={[
            { label: "Dashboard", href: "/" },
            { label: "Country Configuration", href: "/country" },
            { label: inst?.country_iso ?? "Country" },
            { label: "Instances" },
            { label: inst?.type ?? "Instance" },
          ]}
        />
      ),
    }),
    [inst]
  );

  return (
    <SidebarLayout headerProps={headerProps}>
      <div className="max-w-6xl mx-auto p-4 space-y-6">
        {err && <div className="text-red-600 text-sm">Error: {err}</div>}

        {/* ---- Instance header ---- */}
        {inst ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-lg border p-4 bg-white">
              <div className="text-xs text-gray-500">Type</div>
              <div className="text-lg font-semibold">{inst.type}</div>
            </div>
            <div className="rounded-lg border p-4 bg-white">
              <div className="text-xs text-gray-500">Country</div>
              <div className="text-lg font-semibold">{inst.country_iso}</div>
            </div>
            <div className="rounded-lg border p-4 bg-white">
              <div className="text-xs text-gray-500">Created</div>
              <div className="text-lg font-semibold">
                {new Date(inst.created_at).toISOString().slice(0, 10)}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-gray-500" />
          </div>
        )}

        {/* ---- Output settings ---- */}
        {inst && (
          <div className="rounded-lg border p-4 bg-white">
            <div className="text-sm font-medium mb-3">Output Settings</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <label className="text-sm">
                <div className="text-gray-600 mb-1">Target Admin Level</div>
                <select
                  className="w-full rounded-md border px-3 py-2"
                  value={inst.target_admin_level ?? "ADM3"}
                  onChange={(e) => updateSetting({ target_admin_level: e.target.value })}
                >
                  <option value="ADM4">ADM4</option>
                  <option value="ADM3">ADM3</option>
                  <option value="ADM2">ADM2</option>
                  <option value="ADM1">ADM1</option>
                </select>
              </label>

              <label className="text-sm">
                <div className="text-gray-600 mb-1">Disaggregation Method</div>
                <select
                  className="w-full rounded-md border px-3 py-2"
                  value={inst.disaggregation_method ?? "inherit"}
                  onChange={(e) => updateSetting({ disaggregation_method: e.target.value })}
                >
                  <option value="inherit">Inherit (simple copy)</option>
                  <option value="weighted" disabled>
                    Weighted (future)
                  </option>
                  <option value="uniform" disabled>
                    Uniform (future)
                  </option>
                </select>
              </label>
            </div>
          </div>
        )}

        {/* ---- Category summary grid ---- */}
        <CategorySummary
          instanceId={instanceId}
          categories={categories}
          labels={CATEGORY_LABELS}
          loading={loading}
          onRefresh={fetchCategories}
          onAdd={(cat) => setShowAddModal(cat)}
          onPreview={(cat) => setActiveCategory(cat)} // ✅ correct prop
        />

        {/* ---- Composite preview ---- */}
        <div className="rounded-lg border p-4 bg-white mt-6">
          <div className="flex items-center justify-between mb-3">
            <div className="font-medium">
              Preview: {CATEGORY_LABELS[activeCategory] ?? activeCategory}
            </div>
            <div className="flex items-center gap-2">
              {Object.keys(CATEGORY_LABELS).map((k) => (
                <button
                  key={k}
                  onClick={() => setActiveCategory(k)}
                  className={`text-xs rounded-md border px-2 py-1 ${
                    k === activeCategory ? "bg-gray-800 text-white" : "hover:bg-gray-50"
                  }`}
                >
                  {CATEGORY_LABELS[k].split("–")[0].trim()}
                </button>
              ))}
            </div>
          </div>

          <CompositePreview instanceId={instanceId} category={activeCategory} />
        </div>
      </div>

      {/* ---- Add layer modal ---- */}
      {showAddModal && (
        <AddLayerModal
          open
          onClose={() => setShowAddModal(null)}
          instanceId={instanceId}
          category={showAddModal}
          onAdded={fetchCategories}
        />
      )}
    </SidebarLayout>
  );
}

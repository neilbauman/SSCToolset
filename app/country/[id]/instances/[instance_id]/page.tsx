"use client";

import { useState, useEffect } from "react";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { RefreshCw, Settings2, Eye } from "lucide-react";
import InterpretationModal from "@/components/SSC/InterpretationModal";
import DataPreviewModal from "@/components/SSC/DataPreviewModal";

export default function SSCDashboard({
  params,
}: {
  params: { id: string; instance_id: string };
}) {
  const { id: countryId, instance_id } = params;
  const [datasets, setDatasets] = useState<any[]>([]);
  const [showModal, setShowModal] = useState<any | null>(null);
  const [showPreview, setShowPreview] = useState<any | null>(null);

  const headerProps = {
    title: "SSC Analytical Framework",
    group: "country-config" as const,
    description:
      "Define, interpret, view data, and aggregate datasets for this SSC instance.",
    breadcrumbs: (
      <Breadcrumbs
        items={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Country", href: `/country/${countryId}` },
          { label: "Instances", href: `/country/${countryId}/instances` },
          { label: "Framework" },
        ]}
      />
    ),
  };

  const loadData = async () => {
    // Join the unified results to get admin level info if present
    const { data, error } = await supabase
      .from("ssc_dataset_catalog")
      .select(
        `
        *,
        unified_category_results!left(metric, admin_level)
      `
      )
      .order("pillar");

    if (error) console.error(error);
    else setDatasets(data || []);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleApply = async (metric: string, source: string) => {
    await supabase.rpc("apply_normalization_for_dataset_instance", {
      p_instance_id: instance_id,
      p_metric: metric,
      p_source_note: source,
    });
    loadData();
  };

  const grouped = {
    framework: {
      label: "SSC Framework",
      subsections: [
        { key: "ssc_p1", label: "P1 – The Shelter" },
        { key: "ssc_p2", label: "P2 – Living Conditions" },
        { key: "ssc_p3", label: "P3 – The Settlement" },
      ],
    },
    hazard: { key: "ssc_hazard", label: "Hazards / Risks" },
    vuln: { key: "ssc_vuln", label: "Underlying Vulnerabilities" },
  };

  return (
    <SidebarLayout headerProps={headerProps}>
      <div className="mx-auto max-w-7xl space-y-6 text-sm">
        {/* SSC Framework */}
        <section className="rounded-lg border bg-white shadow-sm">
          <header className="flex items-center justify-between rounded-t-lg bg-[color:var(--gsc-green)] px-4 py-2 text-white">
            <h2 className="font-semibold">{grouped.framework.label}</h2>
            <RefreshCw
              onClick={loadData}
              className="h-4 w-4 cursor-pointer transition-transform hover:rotate-90"
            />
          </header>
          {grouped.framework.subsections.map((sub) => (
            <div key={sub.key} className="border-t">
              <h3 className="bg-gray-50 px-4 py-2 font-semibold text-gray-700">
                {sub.label}
              </h3>
              <DatasetTable
                datasets={datasets.filter((d) => d.pillar === sub.key)}
                onInterpret={setShowModal}
                onView={setShowPreview}
                onApply={handleApply}
              />
            </div>
          ))}
        </section>

        {/* Hazards */}
        <section className="rounded-lg border bg-white shadow-sm">
          <header className="flex items-center justify-between rounded-t-lg bg-[color:var(--gsc-green)] px-4 py-2 text-white">
            <h2 className="font-semibold">{grouped.hazard.label}</h2>
          </header>
          <DatasetTable
            datasets={datasets.filter((d) => d.pillar === grouped.hazard.key)}
            onInterpret={setShowModal}
            onView={setShowPreview}
            onApply={handleApply}
          />
        </section>

        {/* Vulnerabilities */}
        <section className="rounded-lg border bg-white shadow-sm">
          <header className="flex items-center justify-between rounded-t-lg bg-[color:var(--gsc-green)] px-4 py-2 text-white">
            <h2 className="font-semibold">{grouped.vuln.label}</h2>
          </header>
          <DatasetTable
            datasets={datasets.filter((d) => d.pillar === grouped.vuln.key)}
            onInterpret={setShowModal}
            onView={setShowPreview}
            onApply={handleApply}
          />
        </section>
      </div>

      {showModal && (
        <InterpretationModal
          open={!!showModal}
          dataset={showModal}
          instanceId={instance_id}
          onClose={() => setShowModal(null)}
          onUpdated={loadData}
        />
      )}

      {showPreview && (
        <DataPreviewModal
          open={!!showPreview}
          metric={showPreview.metric}
          instanceId={instance_id}
          onClose={() => setShowPreview(null)}
        />
      )}
    </SidebarLayout>
  );
}

function DatasetTable({
  datasets,
  onInterpret,
  onView,
  onApply,
}: {
  datasets: any[];
  onInterpret: (ds: any) => void;
  onView: (ds: any) => void;
  onApply: (metric: string, source: string) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-[13px]">
        <thead className="bg-gray-50">
          <tr>
            <th className="p-2 text-left">Metric</th>
            <th className="p-2 text-left">Level</th>
            <th className="p-2 text-left">Method</th>
            <th className="p-2 text-left">Direction</th>
            <th className="p-2 text-left">Norm Params</th>
            <th className="w-40 p-2 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {datasets.length ? (
            datasets.map((d) => (
              <tr
                key={d.metric + d.source_note}
                className="border-t hover:bg-gray-50"
              >
                <td className="p-2 font-medium text-gray-700">{d.metric}</td>
                <td className="p-2 text-gray-600">
                  <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-700">
                    {d.unified_category_results?.[0]?.admin_level ?? "—"}
                  </span>
                </td>
                <td className="p-2 text-gray-500">{d.norm_method}</td>
                <td className="p-2 text-gray-500">
                  {d.higher_is_better ? "↑ higher = worse" : "↓ lower = worse"}
                </td>
                <td className="max-w-[180px] truncate p-2 text-gray-500">
                  {JSON.stringify(d.norm_params || {})}
                </td>
                <td className="p-2 text-right">
                  <button
                    onClick={() => onView(d)}
                    className="mr-2 text-xs font-medium text-gray-600 hover:underline"
                  >
                    <Eye className="mr-1 inline h-3 w-3" />
                    View
                  </button>
                  <button
                    onClick={() => onInterpret(d)}
                    className="mr-2 text-xs font-medium text-[color:var(--gsc-green)] hover:underline"
                  >
                    <Settings2 className="mr-1 inline h-3 w-3" />
                    Interpret
                  </button>
                  <button
                    onClick={() => onApply(d.metric, d.source_note)}
                    className="text-xs font-medium text-blue-600 hover:underline"
                  >
                    Apply
                  </button>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={6} className="py-3 text-center text-gray-400">
                No datasets
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

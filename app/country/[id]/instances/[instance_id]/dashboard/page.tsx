"use client";

import { useEffect, useMemo, useState } from "react";
import SidebarLayout from "@/components/layout/SidebarLayout";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { Eye, Settings2, RefreshCw, Trash2, Play } from "lucide-react";

import InterpretationModal from "@/components/SSC/InterpretationModal";
import DataPreviewModal from "@/components/SSC/DataPreviewModal";

type DatasetRow = {
  metric: string;
  source_note: string;
  pillar: "ssc_p1" | "ssc_p2" | "ssc_p3" | "ssc_hazard" | "ssc_vuln";
  data_type: "gradient" | "categorical";
  norm_method: string | null;
  norm_params: any | null;
  higher_is_better: boolean | null;
  admin_level?: string | null;
};

export default function SSCDashboard({
  params,
}: {
  params: { id: string; instance_id: string };
}) {
  const { id: countryId, instance_id } = params;

  const headerProps = useMemo(
    () => ({
      title: "SSC Analytical Framework",
      group: "country-config" as const,
      description:
        "Define datasets, interpret (normalize) them, preview results, and apply to this SSC instance.",
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
    }),
    [countryId]
  );

  const [datasets, setDatasets] = useState<DatasetRow[]>([]);
  const [loading, setLoading] = useState(false);

  const [showInterpret, setShowInterpret] = useState<DatasetRow | null>(null);
  const [showPreview, setShowPreview] = useState<DatasetRow | null>(null);

  const loadDatasets = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("ssc_dataset_catalog")
        .select(
          "metric, source_note, pillar, data_type, norm_method, norm_params, higher_is_better, admin_level"
        )
        .order("pillar", { ascending: true })
        .order("metric", { ascending: true })
        .order("source_note", { ascending: true });

      if (error) throw error;
      setDatasets((data || []) as DatasetRow[]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDatasets();
  }, []);

  // Unified fetcher for all previews/maps
  const fetchLayerGeoJSON = async (dataset: DatasetRow) => {
    const table = (dataset.source_note ?? "").replace(/^public\./, "");
    const { data, error } = await supabase.rpc("get_geojson_for_result_table", {
      p_admin_level: dataset.admin_level ?? null,
      p_iso: countryId.toUpperCase(),
      p_schema: "public",
      p_result_table: table,
      p_limit: 100000,
    });
    if (error) throw error;
    return data;
  };

  const applyToInstance = async (dataset: DatasetRow) => {
    const method = (dataset.norm_method || "").toLowerCase();

    if (method.includes("threshold_bands")) {
      const { error } = await supabase.rpc(
        "apply_threshold_bands_for_dataset_instance",
        {
          p_instance_id: instance_id,
          p_metric: dataset.metric,
          p_source_note: dataset.source_note,
        }
      );
      if (error) throw error;
    } else if (
      method === "winsor_5_95" ||
      method === "linear_1to4_to_1to5" ||
      method === "linear_1to4_to_1to5_invert" ||
      method === "winsor_5_95_invert"
    ) {
      const { error } = await supabase.rpc(
        "apply_normalization_for_dataset_instance",
        {
          p_instance_id: instance_id,
          p_metric: dataset.metric,
          p_source_note: dataset.source_note,
        }
      );
      if (error) throw error;
    } else {
      const { error } = await supabase.rpc(
        "apply_threshold_classification_for_dataset_instance",
        {
          p_instance_id: instance_id,
          p_metric: dataset.metric,
          p_source_note: dataset.source_note,
        }
      );
      if (error) throw error;
    }

    await loadDatasets();
    alert("Applied to instance.");
  };

  const removeDataset = async (dataset: DatasetRow) => {
    if (
      !confirm(`Remove "${dataset.metric}" / "${dataset.source_note}" from catalog?`)
    )
      return;
    const { error } = await supabase
      .from("ssc_dataset_catalog")
      .delete()
      .eq("metric", dataset.metric)
      .eq("source_note", dataset.source_note);

    if (error) {
      alert(error.message);
      return;
    }
    await loadDatasets();
  };

  const grouped = {
    framework: {
      label: "SSC Framework",
      subsections: [
        { key: "ssc_p1", label: "P1 – The Shelter" },
        { key: "ssc_p2", label: "P2 – Living Conditions" },
        { key: "ssc_p3", label: "P3 – The Settlement" },
      ] as const,
    },
    hazard: { key: "ssc_hazard" as const, label: "Hazards / Risks" },
    vuln: { key: "ssc_vuln" as const, label: "Underlying Vulnerabilities" },
  };

  return (
    <SidebarLayout headerProps={headerProps}>
      <div className="max-w-7xl mx-auto text-sm space-y-6">
        {/* SSC Framework */}
        <section className="border rounded-lg bg-white shadow-sm">
          <header className="px-4 py-2 bg-[color:var(--gsc-green)] text-white flex justify-between items-center rounded-t-lg">
            <h2 className="font-semibold">{grouped.framework.label}</h2>
            <button
              onClick={loadDatasets}
              className="text-white hover:opacity-90 flex items-center gap-2"
              title="Reload datasets"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          </header>

          {grouped.framework.subsections.map((sub) => (
            <div key={sub.key} className="border-t">
              <h3 className="px-4 py-2 font-semibold text-gray-700 bg-gray-50">
                {sub.label}
              </h3>
              <DatasetTable
                loading={loading}
                datasets={datasets.filter((d) => d.pillar === sub.key)}
                onView={setShowPreview}
                onInterpret={setShowInterpret}
                onApply={applyToInstance}
                onRemove={removeDataset}
              />
            </div>
          ))}
        </section>

        {/* Hazards */}
        <section className="border rounded-lg bg-white shadow-sm">
          <header className="px-4 py-2 bg-[color:var(--gsc-green)] text-white flex justify-between items-center rounded-t-lg">
            <h2 className="font-semibold">{grouped.hazard.label}</h2>
          </header>
          <DatasetTable
            loading={loading}
            datasets={datasets.filter((d) => d.pillar === grouped.hazard.key)}
            onView={setShowPreview}
            onInterpret={setShowInterpret}
            onApply={applyToInstance}
            onRemove={removeDataset}
          />
        </section>

        {/* Vulnerabilities */}
        <section className="border rounded-lg bg-white shadow-sm">
          <header className="px-4 py-2 bg-[color:var(--gsc-green)] text-white flex justify-between items-center rounded-t-lg">
            <h2 className="font-semibold">{grouped.vuln.label}</h2>
          </header>
          <DatasetTable
            loading={loading}
            datasets={datasets.filter((d) => d.pillar === grouped.vuln.key)}
            onView={setShowPreview}
            onInterpret={setShowInterpret}
            onApply={applyToInstance}
            onRemove={removeDataset}
          />
        </section>
      </div>

      {/* Modals */}
      {showInterpret && (
        <InterpretationModal
          open={!!showInterpret}
          dataset={showInterpret}
          instanceId={instance_id}
          onClose={() => setShowInterpret(null)}
          onUpdated={loadDatasets}
        />
      )}

      {showPreview && (
        <DataPreviewModal
          open={!!showPreview}
          dataset={showPreview}
          instanceId={instance_id}
          onClose={() => setShowPreview(null)}
        />
      )}
    </SidebarLayout>
  );
}

function DatasetTable({
  loading,
  datasets,
  onInterpret,
  onView,
  onApply,
  onRemove,
}: {
  loading: boolean;
  datasets: DatasetRow[];
  onInterpret: (d: DatasetRow) => void;
  onView: (d: DatasetRow) => void;
  onApply: (d: DatasetRow) => void;
  onRemove: (d: DatasetRow) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-[13px]">
        <thead className="bg-gray-50">
          <tr>
            <th className="p-2 text-left">Metric</th>
            <th className="p-2 text-left">Source</th>
            <th className="p-2 text-left">Admin Level</th>
            <th className="p-2 text-left">Method</th>
            <th className="p-2 text-left">Params</th>
            <th className="p-2 text-right w-64">Actions</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={6} className="text-center text-gray-400 py-3">
                Loading…
              </td>
            </tr>
          ) : datasets.length ? (
            datasets.map((d) => (
              <tr
                key={`${d.metric}::${d.source_note}`}
                className="border-t hover:bg-gray-50"
              >
                <td className="p-2 font-medium text-gray-700">{d.metric}</td>
                <td className="p-2 text-gray-600">{d.source_note}</td>
                <td className="p-2 text-gray-600">{d.admin_level || "—"}</td>
                <td className="p-2 text-gray-600">{d.norm_method || "—"}</td>
                <td className="p-2 text-gray-500 truncate max-w-[220px]">
                  {d.norm_params ? JSON.stringify(d.norm_params) : "—"}
                </td>
                <td className="p-2 text-right">
                  <button
                    onClick={() => onView(d)}
                    className="text-xs text-gray-700 font-medium hover:underline mr-3"
                  >
                    <Eye className="inline h-3 w-3 mr-1" />
                    View
                  </button>
                  <button
                    onClick={() => onInterpret(d)}
                    className="text-xs text-[color:var(--gsc-green)] font-medium hover:underline mr-3"
                  >
                    <Settings2 className="inline h-3 w-3 mr-1" />
                    Interpret
                  </button>
                  <button
                    onClick={() => onApply(d)}
                    className="text-xs text-blue-600 font-medium hover:underline mr-3"
                  >
                    <Play className="inline h-3 w-3 mr-1" />
                    Apply
                  </button>
                  <button
                    onClick={() => onRemove(d)}
                    className="text-xs text-red-600 font-medium hover:underline"
                  >
                    <Trash2 className="inline h-3 w-3 mr-1" />
                    Remove
                  </button>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={6} className="text-center text-gray-400 py-3">
                No datasets
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

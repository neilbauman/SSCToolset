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
    try {
      const { data, error } = await supabase
        .from("ssc_dataset_catalog")
        .select(
          "id, metric, pillar, data_type, norm_method, higher_is_better, norm_params, source_note"
        )
        .order("pillar", { ascending: true });

      if (error) {
        console.error("Error loading datasets:", error);
        setDatasets([]);
        return;
      }

      const unique = Array.from(
        new Map(
          (data || []).map((d) => [`${d.metric}_${d.pillar}`, d])
        ).values()
      );
      setDatasets(unique);
    } catch (err) {
      console.error("Unexpected error loading datasets:", err);
      setDatasets([]);
    }
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
      <div className="max-w-7xl mx-auto text-sm space-y-6">
        {/* SSC Framework */}
        <section className="border rounded-lg bg-white shadow-sm">
          <header className="px-4 py-2 bg-[color:var(--gsc-green)] text-white flex justify-between items-center rounded-t-lg">
            <h2 className="font-semibold">{grouped.framework.label}</h2>
            <RefreshCw
              onClick={loadData}
              className="h-4 w-4 cursor-pointer hover:rotate-90 transition-transform"
            />
          </header>
          {grouped.framework.subsections.map((sub) => (
            <div key={sub.key} className="border-t">
              <h3 className="px-4 py-2 font-semibold text-gray-700 bg-gray-50">
                {sub.label}
              </h3>
              <DatasetTable
                datasets={datasets.filter(
                  (d) => d.pillar?.toLowerCase() === sub.key
                )}
                onInterpret={setShowModal}
                onView={setShowPreview}
                onApply={handleApply}
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
            datasets={datasets.filter(
              (d) => d.pillar?.toLowerCase() === grouped.hazard.key
            )}
            onInterpret={setShowModal}
            onView={setShowPreview}
            onApply={handleApply}
          />
        </section>

        {/* Vulnerabilities */}
        <section className="border rounded-lg bg-white shadow-sm">
          <header className="px-4 py-2 bg-[color:var(--gsc-green)] text-white flex justify-between items-center rounded-t-lg">
            <h2 className="font-semibold">{grouped.vuln.label}</h2>
          </header>
          <DatasetTable
            datasets={datasets.filter(
              (d) => d.pillar?.toLowerCase() === grouped.vuln.key
            )}
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
          dataset={showPreview}
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
  const [sortKey, setSortKey] = useState<string>("metric");
  const [sortAsc, setSortAsc] = useState<boolean>(true);
  const [removing, setRemoving] = useState<string | null>(null);

  const sorted = [...datasets].sort((a, b) => {
    const valA = (a[sortKey] || "").toString();
    const valB = (b[sortKey] || "").toString();
    return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
  });

  const handleSort = (key: string) => {
    if (key === sortKey) setSortAsc(!sortAsc);
    else {
      setSortKey(key);
      setSortAsc(true);
    }
  };

  const handleDelete = async (metric: string, source: string) => {
    const confirm = window.confirm(
      `Remove dataset "${metric}" (${source}) from the SSC catalog?`
    );
    if (!confirm) return;

    try {
      setRemoving(metric);
      const { error } = await supabase
        .from("ssc_dataset_catalog")
        .delete()
        .eq("metric", metric)
        .eq("source_note", source);

      if (error) throw error;
      window.location.reload();
    } catch (err) {
      console.error("Failed to delete dataset:", err);
      alert("Error deleting dataset. Check console for details.");
    } finally {
      setRemoving(null);
    }
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-[13px]">
        <thead className="bg-gray-50">
          <tr>
            {[
              ["metric", "Metric"],
              ["data_type", "Type"],
              ["norm_method", "Method"],
              ["higher_is_better", "Direction"],
              ["norm_params", "Norm Params"],
            ].map(([key, label]) => (
              <th
                key={key}
                className="p-2 text-left cursor-pointer select-none"
                onClick={() => handleSort(key)}
              >
                {label} {sortKey === key ? (sortAsc ? "▲" : "▼") : ""}
              </th>
            ))}
            <th className="p-2 text-right w-52">Actions</th>
          </tr>
        </thead>
        <tbody>
          {sorted.length ? (
            sorted.map((d) => (
              <tr
                key={d.metric + d.source_note}
                className="border-t hover:bg-gray-50"
              >
                <td className="p-2 font-medium text-gray-700">{d.metric}</td>
                <td className="p-2 text-gray-500">{d.data_type}</td>
                <td className="p-2 text-gray-500">{d.norm_method}</td>
                <td className="p-2 text-gray-500">
                  {d.higher_is_better ? "↑ higher = worse" : "↓ lower = worse"}
                </td>
                <td className="p-2 text-gray-500 truncate max-w-[180px]">
                  {JSON.stringify(d.norm_params || {})}
                </td>
                <td className="p-2 text-right space-x-2">
                  <button
                    onClick={() => onView(d)}
                    className="text-xs text-gray-600 font-medium hover:underline"
                  >
                    <Eye className="inline h-3 w-3 mr-1" />
                    View
                  </button>
                  <button
                    onClick={() => onInterpret(d)}
                    className="text-xs text-[color:var(--gsc-green)] font-medium hover:underline"
                  >
                    <Settings2 className="inline h-3 w-3 mr-1" />
                    Interpret
                  </button>
                  <button
                    onClick={() => onApply(d.metric, d.source_note)}
                    className="text-xs text-blue-600 font-medium hover:underline"
                  >
                    Apply
                  </button>
                  <button
                    onClick={() => handleDelete(d.metric, d.source_note)}
                    className={`text-xs text-red-600 font-medium hover:underline ${
                      removing === d.metric
                        ? "opacity-50 pointer-events-none"
                        : ""
                    }`}
                  >
                    {removing === d.metric ? "Removing..." : "Remove"}
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

"use client";

import { useEffect, useState } from "react";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import SidebarLayout from "@/components/layout/SidebarLayout";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { Loader2, Check, X } from "lucide-react";

type Props = { params: { id: string; instance_id: string } };

type DatasetRow = {
  metric: string;
  source_note: string;
  pillar?: string;
  data_type?: string;
  higher_is_better?: boolean;
  norm_method?: string;
  weight?: number | null;
};

const PILLARS = [
  { key: "ssc_p1", label: "P1 – Shelter Enclosure" },
  { key: "ssc_p2", label: "P2 – Interior Livability" },
  { key: "ssc_p3", label: "P3 – Settlement & Access" },
  { key: "ssc_vuln", label: "Underlying Vulnerability" },
  { key: "ssc_hazard", label: "Hazards" },
];

const DATA_TYPES = ["gradient", "categorical"];
const METHODS = ["winsor_5_95", "linear_1to4_to_1to5", "lookup"];

export default function InstancePage({ params }: Props) {
  const { id: countryId, instance_id } = params;
  const [datasets, setDatasets] = useState<DatasetRow[]>([]);
  const [saving, setSaving] = useState<string | null>(null);

  // header props
  const headerProps = {
    title: "SSC Framework Configuration",
    group: "country-config" as const,
    description:
      "Assign each dataset to its SSC pillar and choose how it should be interpreted (gradient vs categorical).",
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

  // fetch datasets + existing config
  const loadData = async () => {
    const { data: all } = await supabase
      .from("ssc_detect_datasets")
      .select("metric, source_note");
    const { data: cfg } = await supabase
      .from("ssc_dataset_catalog")
      .select("*");

    const merged = all?.map((d) => {
      const c = cfg?.find(
        (x) =>
          x.metric === d.metric &&
          x.source_note.trim() === d.source_note.trim()
      );
      return {
        ...d,
        pillar: c?.pillar,
        data_type: c?.data_type,
        higher_is_better: c?.higher_is_better,
        norm_method: c?.norm_method,
        weight: c?.weight,
      };
    });
    setDatasets(merged || []);
  };

  useEffect(() => {
    loadData();
  }, []);

  const saveRow = async (r: DatasetRow) => {
    setSaving(`${r.metric}-${r.source_note}`);
    try {
      const { error } = await supabase.from("ssc_dataset_catalog").upsert({
        metric: r.metric,
        source_note: r.source_note,
        pillar: r.pillar,
        data_type: r.data_type,
        higher_is_better: r.higher_is_better ?? null,
        norm_method: r.norm_method,
        weight: r.weight ?? 1,
      });
      if (error) throw error;
      await supabase.rpc("apply_normalization_for_dataset", {
        p_metric: r.metric,
        p_source_note: r.source_note,
      });
    } finally {
      setSaving(null);
      loadData();
    }
  };

  return (
    <SidebarLayout headerProps={headerProps}>
      <div className="max-w-7xl mx-auto text-sm">
        <section className="border rounded-lg p-3 bg-white">
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-[13px]">
              <thead className="bg-gray-50 text-gray-700">
                <tr>
                  <th className="p-2 text-left">Metric</th>
                  <th className="p-2 text-left">Source Note</th>
                  <th className="p-2 text-left">Pillar</th>
                  <th className="p-2 text-left">Type</th>
                  <th className="p-2 text-left">↑ Better?</th>
                  <th className="p-2 text-left">Method</th>
                  <th className="p-2 text-left">Weight</th>
                  <th className="p-2 text-right w-24">Action</th>
                </tr>
              </thead>
              <tbody>
                {datasets.map((r) => (
                  <tr
                    key={`${r.metric}-${r.source_note}`}
                    className="border-t hover:bg-gray-50"
                  >
                    <td className="p-2 font-medium text-gray-800">
                      {r.metric}
                    </td>
                    <td className="p-2 text-gray-500 max-w-[260px] truncate">
                      {r.source_note}
                    </td>
                    <td className="p-1">
                      <select
                        value={r.pillar || ""}
                        onChange={(e) =>
                          setDatasets((prev) =>
                            prev.map((x) =>
                              x.metric === r.metric &&
                              x.source_note === r.source_note
                                ? { ...x, pillar: e.target.value }
                                : x
                            )
                          )
                        }
                        className="border rounded px-1 py-0.5 text-xs"
                      >
                        <option value="">—</option>
                        {PILLARS.map((p) => (
                          <option key={p.key} value={p.key}>
                            {p.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="p-1">
                      <select
                        value={r.data_type || ""}
                        onChange={(e) =>
                          setDatasets((prev) =>
                            prev.map((x) =>
                              x.metric === r.metric &&
                              x.source_note === r.source_note
                                ? { ...x, data_type: e.target.value }
                                : x
                            )
                          )
                        }
                        className="border rounded px-1 py-0.5 text-xs"
                      >
                        <option value="">—</option>
                        {DATA_TYPES.map((t) => (
                          <option key={t}>{t}</option>
                        ))}
                      </select>
                    </td>
                    <td className="p-1 text-center">
                      <input
                        type="checkbox"
                        checked={!!r.higher_is_better}
                        onChange={(e) =>
                          setDatasets((prev) =>
                            prev.map((x) =>
                              x.metric === r.metric &&
                              x.source_note === r.source_note
                                ? { ...x, higher_is_better: e.target.checked }
                                : x
                            )
                          )
                        }
                      />
                    </td>
                    <td className="p-1">
                      <select
                        value={r.norm_method || ""}
                        onChange={(e) =>
                          setDatasets((prev) =>
                            prev.map((x) =>
                              x.metric === r.metric &&
                              x.source_note === r.source_note
                                ? { ...x, norm_method: e.target.value }
                                : x
                            )
                          )
                        }
                        className="border rounded px-1 py-0.5 text-xs"
                      >
                        <option value="">—</option>
                        {METHODS.map((m) => (
                          <option key={m}>{m}</option>
                        ))}
                      </select>
                    </td>
                    <td className="p-1 w-16">
                      <input
                        type="number"
                        step="0.1"
                        value={r.weight ?? 1}
                        onChange={(e) =>
                          setDatasets((prev) =>
                            prev.map((x) =>
                              x.metric === r.metric &&
                              x.source_note === r.source_note
                                ? {
                                    ...x,
                                    weight: parseFloat(e.target.value),
                                  }
                                : x
                            )
                          )
                        }
                        className="border rounded px-1 py-0.5 w-16 text-xs"
                      />
                    </td>
                    <td className="p-1 text-right">
                      <button
                        onClick={() => saveRow(r)}
                        className="inline-flex items-center px-2 py-1 text-xs rounded bg-green-600 text-white hover:opacity-90"
                        disabled={saving === `${r.metric}-${r.source_note}`}
                      >
                        {saving === `${r.metric}-${r.source_note}` ? (
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        ) : (
                          <Check className="h-3 w-3 mr-1" />
                        )}
                        Apply
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </SidebarLayout>
  );
}

// components/instances/CategorySummary.tsx
"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";

type SummaryRow = {
  category: string;
  dataset_count: number;
  methodology_count: number;
  composite_exists: boolean;
  latest_table: string | null;
};

const LABELS: Record<string, { title: string; hint: string }> = {
  ssc_p1: { title: "SSC P1 – Shelter Enclosure", hint: "Datasets feeding pillar P1" },
  ssc_p2: { title: "SSC P2 – Interior Livability", hint: "Datasets feeding pillar P2" },
  ssc_p3: { title: "SSC P3 – Settlement & Access", hint: "Datasets feeding pillar P3" },
  hazard: { title: "Hazards", hint: "Event/forecast hazard layers" },
  underlying_vulnerability: { title: "Underlying Vulnerabilities", hint: "Baseline vulnerability drivers" },
};

export default function CategorySummary({
  instanceId,
  onAdd,
  onOpenCategory,
}: {
  instanceId: string;
  onAdd: (category: string) => void;
  onOpenCategory: (category: string) => void;
}) {
  const [rows, setRows] = useState<SummaryRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const fetchSummary = async () => {
    setLoading(true);
    setErr(null);
    const { data, error } = await supabase.rpc("get_instance_category_summary", {
      p_instance_id: instanceId,
    });
    if (error) setErr(error.message);
    setRows((data as SummaryRow[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    fetchSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instanceId]);

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold">Analytical Categories</h2>
        <button
          onClick={fetchSummary}
          className="rounded-md border px-3 py-1 text-sm hover:bg-gray-50"
        >
          Refresh
        </button>
      </div>

      {err && <div className="text-red-600 text-sm mb-3">Error: {err}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {Object.keys(LABELS).map((key) => {
          const row = rows.find((r) => r.category === key);
          const datasets = row?.dataset_count ?? 0;
          const methods = row?.methodology_count ?? 0;
          const ready = row?.composite_exists ?? false;

          return (
            <div key={key} className="rounded-lg border p-4 shadow-sm bg-white">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-medium">{LABELS[key].title}</div>
                  <div className="text-xs text-gray-500">{LABELS[key].hint}</div>
                </div>
                <span
                  className={`text-xs px-2 py-0.5 rounded ${
                    ready ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {ready ? "Composite ready" : "Not computed"}
                </span>
              </div>

              <div className="mt-3 grid grid-cols-3 text-sm">
                <div>
                  <div className="text-gray-500">Datasets</div>
                  <div className="font-semibold">{datasets}</div>
                </div>
                <div>
                  <div className="text-gray-500">Methods</div>
                  <div className="font-semibold">{methods}</div>
                </div>
                <div>
                  <div className="text-gray-500">Table</div>
                  <div className="truncate text-xs">{row?.latest_table ?? "—"}</div>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-2">
                <button
                  onClick={() => onAdd(key)}
                  className="rounded-md bg-emerald-600 text-white text-sm px-3 py-1 hover:bg-emerald-700"
                >
                  + Add Dataset
                </button>
                <button
                  onClick={() => onOpenCategory(key)}
                  className="rounded-md border px-3 py-1 text-sm hover:bg-gray-50"
                >
                  Manage / Preview
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

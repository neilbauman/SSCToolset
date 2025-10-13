"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";

type HealthRow = {
  dataset_id: string;
  completeness_pct: number;
};

export default function DatasetHealthBadge({ datasetId }: { datasetId: string }) {
  const [pct, setPct] = useState<number | null>(null);

  useEffect(() => {
    if (!datasetId) return;
    const load = async () => {
      const { data, error } = await supabase
        .from("view_dataset_health")
        .select("completeness_pct")
        .eq("dataset_id", datasetId)
        .maybeSingle();
      if (error) console.error("Health fetch error:", error.message);
      setPct(data?.completeness_pct ?? null);
    };
    load();
  }, [datasetId]);

  if (pct === null) return <span className="text-xs text-gray-400">—</span>;

  let color = "bg-red-100 text-red-700 border-red-200";
  if (pct >= 80) color = "bg-green-100 text-green-700 border-green-200";
  else if (pct >= 50) color = "bg-orange-100 text-orange-700 border-orange-200";

  return (
    <div className="text-center text-xs">
      <span
        className={`inline-block px-2 py-0.5 rounded-full border font-medium ${color}`}
        title={`Dataset completeness: ${pct.toFixed(1)}%`}
      >
        {pct.toFixed(0)}%
      </span>
      <div className="text-[10px] text-gray-500 mt-0.5">complete</div>
    </div>
  );
}

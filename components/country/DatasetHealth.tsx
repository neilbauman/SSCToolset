"use client";
import { useEffect, useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { computeHealthLevel, HealthLevel } from "@/lib/dataHealth";

export default function DatasetHealth({ datasetId }: { datasetId: string }) {
  const [level, setLevel] = useState<HealthLevel | null>(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("view_dataset_health")
        .select("completeness_pct, missing_admins_pct")
        .eq("dataset_id", datasetId)
        .maybeSingle();

      if (error || !data) return;
      const status = computeHealthLevel(data.completeness_pct, data.missing_admins_pct);
      setLevel(status);
    })();
  }, [datasetId]);

  if (!level)
    return <span className="text-gray-400 text-xs italic">No data</span>;

  const colors =
    level === "good"
      ? "bg-green-100 text-green-700"
      : level === "moderate"
      ? "bg-yellow-100 text-yellow-700"
      : "bg-red-100 text-red-700";

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors}`}>
      {level.toUpperCase()}
    </span>
  );
}

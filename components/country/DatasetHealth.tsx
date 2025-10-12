"use client";
import { useEffect, useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";

type Health = "good" | "moderate" | "poor";

export default function DatasetHealth({ datasetId }: { datasetId: string }) {
  const [status, setStatus] = useState<Health | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("view_dataset_health")
        .select("completeness_pct, missing_admins_pct")
        .eq("dataset_id", datasetId)
        .maybeSingle();

      if (!data) return;
      const c = data.completeness_pct ?? 0;
      const m = data.missing_admins_pct ?? 0;
      let level: Health = "good";
      if (m > 10 || c < 80) level = "poor";
      else if (m > 5 || c < 90) level = "moderate";
      setStatus(level);
    })();
  }, [datasetId]);

  if (!status) return <span className="text-gray-400 text-xs italic">—</span>;

  const style =
    status === "good"
      ? "bg-green-100 text-green-700"
      : status === "moderate"
      ? "bg-yellow-100 text-yellow-700"
      : "bg-red-100 text-red-700";

  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${style}`}>
      {status.toUpperCase()}
    </span>
  );
}

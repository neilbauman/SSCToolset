"use client";
import { useEffect, useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { Info } from "lucide-react";

export default function DatasetHealthBadge({ datasetId }: { datasetId: string }) {
  const [h, setH] = useState<any>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("data_health_summary").select("*").eq("dataset_id", datasetId).maybeSingle();
      setH(data);
    })();
  }, [datasetId]);

  if (!h) return <span className="text-xs text-gray-400">—</span>;

  const color =
    h.completeness_pct === 100 && h.duplicate_pcodes === 0 && h.invalid_values === 0
      ? "bg-green-100 text-green-800"
      : h.completeness_pct > 80
      ? "bg-yellow-100 text-yellow-800"
      : "bg-red-100 text-red-800";

  return (
    <div className="relative group inline-block">
      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${color}`}>
        {h.completeness_pct}% complete
      </span>
      <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1 hidden group-hover:block z-50">
        <div className="bg-white border rounded-md shadow p-2 text-xs text-gray-700 w-44">
          <div>Duplicates: {h.duplicate_pcodes}</div>
          <div>Invalid: {h.invalid_values}</div>
          <div>Missing Admins: {h.missing_admins}</div>
        </div>
      </div>
    </div>
  );
}

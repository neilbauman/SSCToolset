"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";

type HealthRow = {
  dataset_id: string;
  total_rows: number;
  filled_rows: number;
  completeness_pct: number;
  missing_admins: number;
  missing_admins_pct: number;
};

export default function DatasetHealth({ datasetId }: { datasetId: string }) {
  const [health, setHealth] = useState<HealthRow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!datasetId) return;
    const load = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("view_dataset_health")
        .select("*")
        .eq("dataset_id", datasetId)
        .maybeSingle();
      if (error) console.error("Health fetch error:", error.message);
      setHealth(data || null);
      setLoading(false);
    };
    load();
  }, [datasetId]);

  if (!datasetId)
    return (
      <div className="text-xs text-gray-500 italic">No dataset selected</div>
    );

  if (loading)
    return (
      <div className="flex items-center text-xs text-gray-500 gap-1">
        <Loader2 className="w-3 h-3 animate-spin" />
        Checking…
      </div>
    );

  if (!health)
    return (
      <div className="text-xs text-gray-500 italic">No health data available</div>
    );

  // Color logic
  const pct = health.completeness_pct || 0;
  let color = "bg-red-500";
  if (pct > 80) color = "bg-green-500";
  else if (pct > 50) color = "bg-orange-400";

  return (
    <div
      className="w-48 border rounded-lg p-2 text-xs bg-white shadow-sm"
      title={`Filled: ${health.filled_rows}/${health.total_rows} • Missing: ${health.missing_admins}`}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="font-semibold text-[color:var(--gsc-gray)]">
          Data Health
        </span>
        {pct >= 95 ? (
          <CheckCircle2 className="w-4 h-4 text-green-600" />
        ) : pct >= 60 ? (
          <AlertTriangle className="w-4 h-4 text-orange-500" />
        ) : (
          <AlertTriangle className="w-4 h-4 text-red-600" />
        )}
      </div>
      <div className="w-full h-2 bg-gray-200 rounded">
        <div
          className={`${color} h-2 rounded`}
          style={{ width: `${pct.toFixed(1)}%` }}
        />
      </div>
      <div className="mt-1 text-[11px] text-gray-600">
        {pct.toFixed(1)}% complete ({health.filled_rows}/{health.total_rows})
      </div>
    </div>
  );
}

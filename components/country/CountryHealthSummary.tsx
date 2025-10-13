"use client";
import { useEffect, useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";

type HealthByLevel = { admin_level: string; avg_health: number; dataset_count: number };

export default function CountryHealthSummary({ countryIso }: { countryIso: string }) {
  const [health, setHealth] = useState<{ avg: number; perLevel: HealthByLevel[] } | null>(null);

  useEffect(() => {
    (async () => {
      // Aggregate average score overall and by admin_level
      const { data } = await supabase
        .from("data_health_summary")
        .select("admin_level,health_score")
        .eq("country_iso", countryIso);

      if (data?.length) {
        const grouped: Record<string, number[]> = {};
        data.forEach(d => {
          if (!grouped[d.admin_level]) grouped[d.admin_level] = [];
          grouped[d.admin_level].push(d.health_score);
        });
        const perLevel = Object.entries(grouped).map(([lvl, arr]) => ({
          admin_level: lvl,
          avg_health: Math.round(arr.reduce((a, b) => a + b, 0) / arr.length),
          dataset_count: arr.length
        }));
        const avg = Math.round(perLevel.reduce((a, b) => a + b.avg_health, 0) / perLevel.length);
        setHealth({ avg, perLevel });
      }
    })();
  }, [countryIso]);

  if (!health) return null;
  const color =
    health.avg >= 95
      ? "bg-green-100 text-green-800"
      : health.avg >= 80
      ? "bg-yellow-100 text-yellow-800"
      : "bg-red-100 text-red-800";

  return (
    <div className="border rounded-lg bg-white shadow-sm p-4 mb-6">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-sm font-semibold text-[color:var(--gsc-gray)]">Overall Data Health</h3>
        <span className={`text-sm font-medium px-2 py-0.5 rounded-full ${color}`}>
          {health.avg}% average
        </span>
      </div>
      <div className="space-y-1 text-xs text-gray-600">
        {health.perLevel.map(l => (
          <div key={l.admin_level} className="flex justify-between items-center">
            <span>{l.admin_level}</span>
            <div className="flex items-center gap-2">
              <div className="w-24 bg-gray-100 rounded h-2 overflow-hidden">
                <div
                  className={`h-2 ${l.avg_health >= 95
                    ? "bg-green-500"
                    : l.avg_health >= 80
                    ? "bg-yellow-400"
                    : "bg-red-400"
                    }`}
                  style={{ width: `${l.avg_health}%` }}
                />
              </div>
              <span>{l.avg_health}%</span>
              <span className="text-gray-400">({l.dataset_count})</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

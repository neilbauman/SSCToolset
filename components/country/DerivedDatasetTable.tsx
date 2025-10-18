"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { BadgeCheck, Layers } from "lucide-react";

/**
 * DerivedDatasetTable
 * Displays semantic summaries of derived datasets from the view_derived_dataset_summary.
 * Each derived dataset corresponds to one analytical join.
 */
export default function DerivedDatasetTable({ countryIso }: { countryIso: string }) {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("view_derived_dataset_summary")
        .select(
          "derived_dataset_id, derived_title, year, admin_level, record_count, data_health, linked_count, domains, join_active"
        )
        .eq("country_iso", countryIso)
        .order("created_at", { ascending: false });

      if (!error && data) setRows(data);
      setLoading(false);
    };
    load();
  }, [countryIso]);

  if (loading) {
    return <div className="text-gray-500 italic py-2">Loading derived datasets...</div>;
  }

  if (!rows || rows.length === 0) {
    return <div className="text-gray-500 italic py-2">No derived datasets yet.</div>;
  }

  const renderDomains = (domains: string | null) => {
    if (!domains) return <span className="text-gray-400 italic">Unspecified</span>;
    return domains.split(" + ").map((d) => (
      <span
        key={d.trim()}
        className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium mr-1 bg-blue-100 text-blue-700"
      >
        {d.trim()}
      </span>
    ));
  };

  return (
    <div className="mt-4 border rounded-lg overflow-hidden shadow-sm">
      <table className="min-w-full text-sm text-left">
        <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
          <tr>
            <th className="px-4 py-3 font-semibold">Title</th>
            <th className="px-4 py-3 font-semibold">Domains</th>
            <th className="px-4 py-3 font-semibold text-center">Linked Datasets</th>
            <th className="px-4 py-3 font-semibold text-center">Admin Level</th>
            <th className="px-4 py-3 font-semibold text-right">Records</th>
            <th className="px-4 py-3 font-semibold text-right">Health</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((r) => (
            <tr
              key={r.derived_dataset_id}
              className={`hover:bg-gray-50 ${
                r.join_active ? "border-l-4 border-green-400" : ""
              }`}
            >
              <td className="px-4 py-3 font-medium text-gray-800">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-[#123865]" />
                  {r.derived_title}
                </div>
                <div className="text-xs text-gray-500">{r.year || "—"}</div>
              </td>

              <td className="px-4 py-3">{renderDomains(r.domains)}</td>

              <td className="px-4 py-3 text-center text-gray-700">
                {r.linked_count ?? 0}
              </td>

              <td className="px-4 py-3 text-center">{r.admin_level ?? "—"}</td>

              <td className="px-4 py-3 text-right">
                {r.record_count ? r.record_count.toLocaleString() : "—"}
              </td>

              <td className="px-4 py-3 text-right">
                <span
                  className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs ${
                    r.data_health === "good"
                      ? "bg-green-100 text-green-700"
                      : r.data_health === "fair"
                      ? "bg-yellow-100 text-yellow-700"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  <BadgeCheck className="w-3 h-3" />
                  {r.data_health || "unknown"}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

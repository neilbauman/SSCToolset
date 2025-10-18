"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { BadgeCheck } from "lucide-react";

/**
 * DerivedDatasetTable
 * Displays derived or joined datasets for a given country,
 * enriched with taxonomy information.
 */
export default function DerivedDatasetTable({ countryIso }: { countryIso: string }) {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("derived_datasets")
        .select(
          `
          id,
          title,
          year,
          admin_level,
          record_count,
          data_health,
          join_id,
          indicator_id,
          indicator:indicator_id (
            name,
            description,
            unit,
            taxonomy_links:indicator_taxonomy_links (
              taxonomy_term:taxonomy_terms (
                name,
                category,
                parent_id
              )
            )
          )
        `
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

  // Helper to render taxonomy label lines
  const renderTaxonomy = (item: any) => {
    const term = item?.indicator?.taxonomy_links?.[0]?.taxonomy_term;
    if (!term) return null;
    return (
      <div className="text-xs text-gray-500 leading-tight">
        {term.name}
        {term.category ? <div>{term.category}</div> : null}
      </div>
    );
  };

  return (
    <div className="mt-4 border rounded-lg overflow-hidden shadow-sm">
      <table className="min-w-full text-sm text-left">
        <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
          <tr>
            <th className="px-4 py-3 font-semibold">Title</th>
            <th className="px-4 py-3 font-semibold">Indicator</th>
            <th className="px-4 py-3 font-semibold">Taxonomy</th>
            <th className="px-4 py-3 font-semibold">Admin Level</th>
            <th className="px-4 py-3 font-semibold text-right">Records</th>
            <th className="px-4 py-3 font-semibold text-right">Health</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((r) => (
            <tr key={r.id} className="hover:bg-gray-50">
              <td className="px-4 py-3 font-medium text-gray-800">
                {r.title}
                <div className="text-xs text-gray-500">{r.year || "—"}</div>
              </td>
              <td className="px-4 py-3">
                <div className="font-medium text-gray-800">
                  {r.indicator?.name ?? "—"}
                </div>
                {r.indicator?.unit && (
                  <div className="text-xs text-gray-500">
                    Unit: {r.indicator.unit}
                  </div>
                )}
              </td>
              <td className="px-4 py-3">{renderTaxonomy(r)}</td>
              <td className="px-4 py-3">{r.admin_level ?? "—"}</td>
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

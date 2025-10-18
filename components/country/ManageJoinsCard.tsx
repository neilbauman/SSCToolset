"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { CheckCircle2, Circle, Database, Link2 } from "lucide-react";
import Link from "next/link";

/**
 * ManageJoinsCard
 * Lists and manages dataset joins for a given country.
 * Displays linked datasets, their taxonomy domains, and allows activating a join.
 */
export default function ManageJoinsCard({ countryIso }: { countryIso: string }) {
  const [joins, setJoins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("dataset_joins")
        .select("*")
        .eq("country_iso", countryIso)
        .order("created_at", { ascending: false });
      if (!error && data) setJoins(data);
      setLoading(false);
    };
    load();
  }, [countryIso]);

  const activateJoin = async (id: string) => {
    // Set all inactive, then set this one active
    await supabase
      .from("dataset_joins")
      .update({ is_active: false })
      .eq("country_iso", countryIso);
    await supabase.from("dataset_joins").update({ is_active: true }).eq("id", id);
    const { data } = await supabase
      .from("dataset_joins")
      .select("*")
      .eq("country_iso", countryIso)
      .order("created_at", { ascending: false });
    setJoins(data || []);
  };

  if (loading)
    return <div className="text-gray-500 italic py-2">Loading joins...</div>;

  if (!joins || joins.length === 0)
    return (
      <div className="text-gray-500 italic py-2">
        No dataset joins defined yet.
      </div>
    );

  const renderTaxonomyChip = (name: string, category?: string) => {
    const colors = {
      Shelter: "bg-blue-100 text-blue-700",
      Exposure: "bg-yellow-100 text-yellow-700",
      Vulnerability: "bg-red-100 text-red-700",
      Infrastructure: "bg-green-100 text-green-700",
      default: "bg-gray-100 text-gray-700",
    };
    const cls =
      colors[category as keyof typeof colors] ?? colors.default;
    return (
      <span
        key={name}
        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium mr-1 ${cls}`}
      >
        {name}
      </span>
    );
  };

  const parseDatasets = (join: any) => {
    if (!join.datasets) return [];
    try {
      const obj = typeof join.datasets === "string"
        ? JSON.parse(join.datasets)
        : join.datasets;
      const arr = [];
      if (obj.admin) arr.push({ type: "Admin", name: obj.admin.title });
      if (obj.population) arr.push({ type: "Population", name: obj.population.title });
      if (obj.gis) arr.push({ type: "GIS", name: obj.gis.title });
      if (obj.other && Array.isArray(obj.other))
        obj.other.forEach((o: any) => arr.push({ type: "Other", name: o.title }));
      return arr;
    } catch {
      return [];
    }
  };

  return (
    <div className="border rounded-lg p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-2xl font-semibold text-[#123865] flex items-center gap-2">
          <Link2 className="w-5 h-5 text-[#123865]" /> Manage Joins
        </h3>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm text-left">
          <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
            <tr>
              <th className="px-4 py-3 font-semibold">Join ID</th>
              <th className="px-4 py-3 font-semibold">Linked Datasets</th>
              <th className="px-4 py-3 font-semibold">Domains</th>
              <th className="px-4 py-3 font-semibold text-center">Status</th>
              <th className="px-4 py-3 font-semibold text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {joins.map((join) => {
              const linked = parseDatasets(join);
              const isActive = join.is_active;
              const domains: { name: string; category?: string }[] = [];

              // Look for taxonomy data embedded in datasets
              linked.forEach((ds: any) => {
                if (ds.taxonomy?.length) {
                  ds.taxonomy.forEach((t: any) =>
                    domains.push({
                      name: t.name,
                      category: t.category,
                    })
                  );
                }
              });

              return (
                <tr key={join.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-700">{join.id.slice(0, 8)}</td>
                  <td className="px-4 py-3">
                    {linked.length > 0 ? (
                      linked.map((l, i) => (
                        <div key={i} className="text-gray-800 flex items-center gap-1">
                          <Database className="w-3 h-3 text-gray-400" />
                          <span className="font-medium">{l.type}</span>: {l.name}
                        </div>
                      ))
                    ) : (
                      <span className="text-gray-500 italic">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {domains.length > 0
                      ? domains.map((d, i) =>
                          renderTaxonomyChip(d.name, d.category)
                        )
                      : renderTaxonomyChip("Unspecified")}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {isActive ? (
                      <span className="inline-flex items-center gap-1 text-green-600 font-medium">
                        <CheckCircle2 className="w-4 h-4" /> Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-gray-400">
                        <Circle className="w-4 h-4" /> Inactive
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {!isActive && (
                      <button
                        onClick={() => activateJoin(join.id)}
                        className="text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
                      >
                        Activate
                      </button>
                    )}
                    {isActive && (
                      <Link
                        href={`/country/${countryIso}/datasets`}
                        className="text-sm text-blue-600 hover:underline"
                      >
                        View
                      </Link>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

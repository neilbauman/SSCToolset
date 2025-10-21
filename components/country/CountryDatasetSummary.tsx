"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { Loader2 } from "lucide-react";

type DatasetSummary = {
  title: string;
  dataset_type: string | null;
  admin_level: string | null;
  year: number | null;
  record_count: number | null;
};

type DerivedSummary = {
  derived_dataset_id: string;
  derived_title: string;
  admin_level: string | null;
  year: number | null;
  record_count: number | null;
  data_health: string | null;
};

export default function CountryDatasetSummary({
  countryIso,
  showDerived = true,
}: {
  countryIso: string;
  showDerived?: boolean;
}) {
  const [coreDatasets, setCoreDatasets] = useState<DatasetSummary[]>([]);
  const [derivedDatasets, setDerivedDatasets] = useState<DerivedSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!countryIso) return;
      setLoading(true);
      setError(null);

      try {
        const [{ data: core, error: err1 }, { data: derived, error: err2 }] =
          await Promise.all([
            supabase
              .from("dataset_metadata")
              .select(
                "title, dataset_type, admin_level, year, record_count"
              )
              .eq("country_iso", countryIso)
              .order("title", { ascending: true }),
            supabase
              .from("view_derived_dataset_summary")
              .select(
                "derived_dataset_id, derived_title, admin_level, year, record_count, data_health"
              )
              .eq("country_iso", countryIso)
              .order("year", { ascending: false }),
          ]);

        if (err1 || err2) {
          setError(err1?.message || err2?.message || "Error loading datasets");
        } else {
          setCoreDatasets(core || []);
          setDerivedDatasets(derived || []);
        }
      } catch (e: any) {
        setError(e.message);
      }

      setLoading(false);
    }

    load();
  }, [countryIso]);

  if (loading) {
    return (
      <div className="text-gray-500 text-sm flex items-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading datasets…
      </div>
    );
  }

  if (error) {
    return <div className="text-sm text-red-600">{error}</div>;
  }

  return (
    <div className="space-y-6">
      {/* Core Datasets */}
      <div className="border rounded-lg p-4 shadow-sm">
        <h2 className="text-lg font-semibold mb-2 text-[color:var(--gsc-red)]">
          Other Datasets
        </h2>
        {coreDatasets.length === 0 ? (
          <p className="text-sm text-gray-500">
            No datasets have been uploaded for this country yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm border-collapse">
              <thead className="bg-[var(--gsc-beige)] text-[var(--gsc-gray)] text-xs uppercase">
                <tr>
                  <th className="px-2 py-1 text-left">Title</th>
                  <th className="px-2 py-1 text-left">Type</th>
                  <th className="px-2 py-1 text-left">Admin Level</th>
                  <th className="px-2 py-1 text-left">Year</th>
                  <th className="px-2 py-1 text-right">Records</th>
                </tr>
              </thead>
              <tbody>
                {coreDatasets.map((d) => (
                  <tr
                    key={d.title}
                    className="border-t border-[var(--gsc-light-gray)]"
                  >
                    <td className="px-2 py-1">{d.title}</td>
                    <td className="px-2 py-1">{d.dataset_type ?? "—"}</td>
                    <td className="px-2 py-1">{d.admin_level ?? "—"}</td>
                    <td className="px-2 py-1">{d.year ?? "—"}</td>
                    <td className="px-2 py-1 text-right">
                      {d.record_count ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Derived Datasets (conditionally shown) */}
      {showDerived && (
        <div className="border rounded-lg p-4 shadow-sm">
          <h2 className="text-lg font-semibold mb-2 text-[color:var(--gsc-red)]">
            Derived Datasets
          </h2>
          {derivedDatasets.length === 0 ? (
            <p className="text-sm text-gray-500">
              No derived datasets have been created yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm border-collapse">
                <thead className="bg-[var(--gsc-beige)] text-[var(--gsc-gray)] text-xs uppercase">
                  <tr>
                    <th className="px-2 py-1 text-left">Title</th>
                    <th className="px-2 py-1 text-left">Admin Level</th>
                    <th className="px-2 py-1 text-left">Year</th>
                    <th className="px-2 py-1 text-right">Records</th>
                  </tr>
                </thead>
                <tbody>
                  {derivedDatasets.map((d) => (
                    <tr
                      key={d.derived_dataset_id}
                      className="border-t border-[var(--gsc-light-gray)]"
                    >
                      <td className="px-2 py-1">{d.derived_title}</td>
                      <td className="px-2 py-1">{d.admin_level ?? "—"}</td>
                      <td className="px-2 py-1">{d.year ?? "—"}</td>
                      <td className="px-2 py-1 text-right">
                        {d.record_count ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

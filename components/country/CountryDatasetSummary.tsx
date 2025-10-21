"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { Loader2 } from "lucide-react";

type SimpleDataset = {
  id: string;
  title: string;
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
  const [adminDatasets, setAdminDatasets] = useState<SimpleDataset[]>([]);
  const [populationDatasets, setPopulationDatasets] = useState<SimpleDataset[]>([]);
  const [gisDatasets, setGisDatasets] = useState<SimpleDataset[]>([]);
  const [otherDatasets, setOtherDatasets] = useState<SimpleDataset[]>([]);
  const [derivedDatasets, setDerivedDatasets] = useState<DerivedSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!countryIso) return;
      setLoading(true);
      setError(null);

      try {
        const [
          { data: admin, error: errAdmin },
          { data: pop, error: errPop },
          { data: gis, error: errGis },
          { data: other, error: errOther },
          { data: derived, error: errDerived },
        ] = await Promise.all([
          supabase
            .from("admin_datasets")
            .select("id, title, admin_level, year, record_count")
            .eq("country_iso", countryIso)
            .order("created_at", { ascending: false }),
          supabase
            .from("population_datasets")
            .select("id, title, admin_level, year, record_count")
            .eq("country_iso", countryIso)
            .order("created_at", { ascending: false }),
          supabase
            .from("gis_datasets")
            .select("id, title, admin_level, year, record_count")
            .eq("country_iso", countryIso)
            .order("created_at", { ascending: false }),
          supabase
            .from("dataset_metadata")
            .select("id, title, admin_level, year, record_count")
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

        if (errAdmin || errPop || errGis || errOther || errDerived) {
          throw new Error(
            errAdmin?.message ||
              errPop?.message ||
              errGis?.message ||
              errOther?.message ||
              errDerived?.message
          );
        }

        setAdminDatasets(admin || []);
        setPopulationDatasets(pop || []);
        setGisDatasets(gis || []);
        setOtherDatasets(other || []);
        setDerivedDatasets(derived || []);
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
      {/* Admin Datasets */}
      <DatasetPanel
        title="Administrative Boundaries"
        datasets={adminDatasets}
        emptyMsg="No administrative datasets uploaded yet."
      />

      {/* Population Datasets */}
      <DatasetPanel
        title="Population Datasets"
        datasets={populationDatasets}
        emptyMsg="No population datasets uploaded yet."
      />

      {/* GIS Datasets */}
      <DatasetPanel
        title="GIS Datasets"
        datasets={gisDatasets}
        emptyMsg="No GIS datasets uploaded yet."
      />

      {/* Other Datasets */}
      <DatasetPanel
        title="Other Datasets"
        datasets={otherDatasets}
        emptyMsg="No other datasets uploaded yet."
      />

      {/* Derived Datasets (optional) */}
      {showDerived && (
        <DatasetPanel
          title="Derived Datasets"
          datasets={derivedDatasets.map((d) => ({
            id: d.derived_dataset_id,
            title: d.derived_title,
            admin_level: d.admin_level,
            year: d.year,
            record_count: d.record_count,
          }))}
          emptyMsg="No derived datasets created yet."
        />
      )}
    </div>
  );
}

function DatasetPanel({
  title,
  datasets,
  emptyMsg,
}: {
  title: string;
  datasets: SimpleDataset[];
  emptyMsg: string;
}) {
  return (
    <div className="border rounded-lg p-4 shadow-sm">
      <h2 className="text-lg font-semibold mb-2 text-[color:var(--gsc-red)]">
        {title}
      </h2>
      {datasets.length === 0 ? (
        <p className="text-sm text-gray-500">{emptyMsg}</p>
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
              {datasets.map((d) => (
                <tr
                  key={d.id}
                  className="border-t border-[var(--gsc-light-gray)]"
                >
                  <td className="px-2 py-1">{d.title}</td>
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
  );
}

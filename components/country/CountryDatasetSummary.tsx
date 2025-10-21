"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { Loader2 } from "lucide-react";

type CoreDataset = {
  id: string;
  title: string;
  year: number | null;
  dataset_date: string | null;
  source: string | null;
  is_active: boolean | null;
  lowest_level: string | null;
  completeness: number | null;
  created_at: string | null;
};

type OtherDataset = {
  id: string;
  title: string;
  year: number | null;
  record_count: number | null;
  created_at: string | null;
};

type DerivedDataset = {
  derived_dataset_id: string;
  derived_title: string;
  admin_level: string | null;
  year: number | null;
  record_count: number | null;
  data_health: string | null;
  created_at: string | null;
};

export default function CountryDatasetSummary({
  countryIso,
  showDerived = true,
}: {
  countryIso: string;
  showDerived?: boolean;
}) {
  const [adminDatasets, setAdminDatasets] = useState<CoreDataset[]>([]);
  const [populationDatasets, setPopulationDatasets] = useState<CoreDataset[]>([]);
  const [gisDatasets, setGisDatasets] = useState<CoreDataset[]>([]);
  const [otherDatasets, setOtherDatasets] = useState<OtherDataset[]>([]);
  const [derivedDatasets, setDerivedDatasets] = useState<DerivedDataset[]>([]);
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
            .select(
              "id, title, year, dataset_date, source, is_active, lowest_level, completeness, created_at"
            )
            .eq("country_iso", countryIso)
            .order("created_at", { ascending: false }),
          supabase
            .from("population_datasets")
            .select(
              "id, title, year, dataset_date, source, is_active, lowest_level, completeness, created_at"
            )
            .eq("country_iso", countryIso)
            .order("created_at", { ascending: false }),
          supabase
            .from("gis_datasets")
            .select(
              "id, title, year, dataset_date, source, is_active, lowest_level, completeness, created_at"
            )
            .eq("country_iso", countryIso)
            .order("created_at", { ascending: false }),
          supabase
            .from("dataset_metadata")
            .select("id, title, year, record_count, created_at")
            .eq("country_iso", countryIso)
            .order("title", { ascending: true }),
          supabase
            .from("view_derived_dataset_summary")
            .select(
              "derived_dataset_id, derived_title, admin_level, year, record_count, data_health, created_at"
            )
            .eq("country_iso", countryIso)
            .order("created_at", { ascending: false }),
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
      {/* Administrative Boundaries */}
      <CoreDatasetPanel
        title="Administrative Boundaries"
        datasets={adminDatasets}
        emptyMsg="No administrative boundary datasets found."
      />

      {/* Population Datasets */}
      <CoreDatasetPanel
        title="Population Datasets"
        datasets={populationDatasets}
        emptyMsg="No population datasets found."
      />

      {/* GIS Datasets */}
      <CoreDatasetPanel
        title="GIS Datasets"
        datasets={gisDatasets}
        emptyMsg="No GIS datasets found."
      />

      {/* Other Datasets */}
      <OtherDatasetPanel
        title="Other Datasets"
        datasets={otherDatasets}
        emptyMsg="No other datasets uploaded yet."
      />

      {/* Derived Datasets */}
      {showDerived && (
        <DerivedDatasetPanel
          title="Derived Datasets"
          datasets={derivedDatasets}
          emptyMsg="No derived datasets created yet."
        />
      )}
    </div>
  );
}

function CoreDatasetPanel({
  title,
  datasets,
  emptyMsg,
}: {
  title: string;
  datasets: CoreDataset[];
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
                <th className="px-2 py-1 text-left">Year</th>
                <th className="px-2 py-1 text-left">Lowest Level</th>
                <th className="px-2 py-1 text-left">Completeness</th>
                <th className="px-2 py-1 text-left">Source</th>
                <th className="px-2 py-1 text-left">Active</th>
              </tr>
            </thead>
            <tbody>
              {datasets.map((d) => (
                <tr
                  key={d.id}
                  className="border-t border-[var(--gsc-light-gray)]"
                >
                  <td className="px-2 py-1">{d.title}</td>
                  <td className="px-2 py-1">{d.year ?? "—"}</td>
                  <td className="px-2 py-1">{d.lowest_level ?? "—"}</td>
                  <td className="px-2 py-1">
                    {d.completeness != null
                      ? `${d.completeness.toFixed(1)}%`
                      : "—"}
                  </td>
                  <td className="px-2 py-1">{d.source ?? "—"}</td>
                  <td className="px-2 py-1">
                    {d.is_active ? "Yes" : "No"}
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

function OtherDatasetPanel({
  title,
  datasets,
  emptyMsg,
}: {
  title: string;
  datasets: OtherDataset[];
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

function DerivedDatasetPanel({
  title,
  datasets,
  emptyMsg,
}: {
  title: string;
  datasets: DerivedDataset[];
  emptyMsg: string;
}) {
  return (
    <div className="border rounded-lg p-4 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-semibold text-[color:var(--gsc-red)]">
          {title}
        </h2>
        <a
          href={`/country/${datasets[0]?.country_iso ?? ""}/derived`}
          className="text-sm font-medium text-[color:var(--gsc-red)] hover:underline"
        >
          View all →
        </a>
      </div>
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
                <th className="px-2 py-1 text-left">Health</th>
              </tr>
            </thead>
            <tbody>
              {datasets.map((d) => (
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
                  <td className="px-2 py-1">{d.data_health ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

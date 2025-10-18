"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import CountrySummaryCard from "@/components/country/CountrySummaryCard";

type DatasetSummary = {
  id: string;
  country_iso: string;
  title: string | null;
  year: number | null;
  admin_level: string | null;
  dataset_type: string | null;
  record_count: number | null;
  layer_count: number | null;
  is_active: boolean | null;
  source: string | null;
};

export default function CountryDatasetSummary({
  countryIso,
}: {
  countryIso: string;
}) {
  const [datasets, setDatasets] = useState<DatasetSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSummaries = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("view_dataset_summary")
        .select(
          "id, country_iso, title, year, admin_level, dataset_type, record_count, layer_count, is_active, source"
        )
        .eq("country_iso", countryIso)
        .eq("is_active", true);

      if (error) {
        console.error("Error fetching dataset summaries:", error);
        setLoading(false);
        return;
      }

      setDatasets(data || []);
      setLoading(false);
    };

    fetchSummaries();
  }, [countryIso]);

  if (loading) {
    return (
      <div className="text-sm text-gray-500 italic">Loading dataset summary…</div>
    );
  }

  const admin = datasets.find((d) => d.dataset_type === "admin");
  const population = datasets.find((d) => d.dataset_type === "population");
  const gis = datasets.find((d) => d.dataset_type === "gis");
  const others = datasets.filter(
    (d) =>
      d.dataset_type !== "admin" &&
      d.dataset_type !== "population" &&
      d.dataset_type !== "gis"
  );

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4 text-gsc-red">
        Country Dataset Summary
      </h2>

      {/* --- Core Datasets --- */}
      <h3 className="text-md font-semibold mb-3 text-gray-700">
        Core Datasets
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Admin Areas */}
        <CountrySummaryCard
          title="Admin Areas"
          subtitle={
            admin
              ? `${admin.title ?? "—"} (${admin.year ?? "—"})`
              : "No active dataset"
          }
          metric={
            admin ? (
              <div className="text-sm text-gray-600">
                <div>Lowest level: {admin.admin_level ?? "—"}</div>
                <div>
                  Records: {admin.record_count?.toLocaleString() ?? "—"}
                </div>
                {admin.source && (
                  <div className="text-xs text-gray-500 mt-1">
                    Source: {admin.source}
                  </div>
                )}
              </div>
            ) : (
              "No admin dataset found"
            )
          }
          health={admin ? "good" : "missing"}
          link={`/country/${countryIso}/admins`}
        />

        {/* Population */}
        <CountrySummaryCard
          title="Population Data"
          subtitle={
            population
              ? `${population.title ?? "—"} (${population.year ?? "—"})`
              : "No active dataset"
          }
          metric={
            population ? (
              <div className="text-sm text-gray-600">
                <div>Lowest level: {population.admin_level ?? "—"}</div>
                <div>
                  Records: {population.record_count?.toLocaleString() ?? "—"}
                </div>
                {population.source && (
                  <div className="text-xs text-gray-500 mt-1">
                    Source: {population.source}
                  </div>
                )}
              </div>
            ) : (
              "No population dataset found"
            )
          }
          health={population ? "good" : "missing"}
          link={`/country/${countryIso}/population`}
        />

        {/* GIS Layers */}
        <CountrySummaryCard
          title="GIS Layers"
          subtitle={
            gis
              ? `${gis.title ?? "—"} (${gis.year ?? "—"})`
              : "No active GIS dataset"
          }
          metric={
            gis ? (
              <div className="text-sm text-gray-600">
                <div>
                  Layers: {gis.layer_count?.toLocaleString() ?? "—"}
                </div>
                <div>
                  Records: {gis.record_count?.toLocaleString() ?? "—"}
                </div>
                {gis.source && (
                  <div className="text-xs text-gray-500 mt-1">
                    Source: {gis.source}
                  </div>
                )}
              </div>
            ) : (
              "No GIS layers found"
            )
          }
          health={gis ? "good" : "missing"}
          link={`/country/${countryIso}/gis`}
        />
      </div>

      {/* --- Other Datasets --- */}
      <h3 className="text-md font-semibold mb-2 text-gray-700">
        Other Datasets
      </h3>
      {others.length > 0 ? (
        <div className="overflow-x-auto border rounded-lg">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-700">
              <tr>
                <th className="px-4 py-2 text-left">Dataset</th>
                <th className="px-4 py-2 text-left">Type</th>
                <th className="px-4 py-2 text-left">Admin Level</th>
                <th className="px-4 py-2 text-left">Records</th>
                <th className="px-4 py-2 text-left">Year</th>
                <th className="px-4 py-2 text-left">Source</th>
              </tr>
            </thead>
            <tbody>
              {others.map((d) => (
                <tr
                  key={d.id}
                  className="border-t hover:bg-gray-50 transition-colors"
                >
                  <td className="px-4 py-2">{d.title ?? "—"}</td>
                  <td className="px-4 py-2 capitalize">
                    {d.dataset_type ?? "—"}
                  </td>
                  <td className="px-4 py-2">{d.admin_level ?? "—"}</td>
                  <td className="px-4 py-2">
                    {d.record_count?.toLocaleString() ?? "—"}
                  </td>
                  <td className="px-4 py-2">{d.year ?? "—"}</td>
                  <td className="px-4 py-2 text-gray-600">{d.source ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-sm text-gray-500 italic mb-6">
          No other datasets uploaded yet.
        </div>
      )}

      {/* --- Derived Datasets --- */}
      <div className="mt-6">
        <h3 className="text-md font-semibold mb-2 text-gray-700">
          Derived Datasets
        </h3>
        <div className="text-sm text-gray-500 italic">
          Derived datasets will appear here once analytical joins are created.
        </div>
      </div>
    </div>
  );
}

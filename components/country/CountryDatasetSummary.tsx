"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import CountrySummaryCard from "@/components/country/CountrySummaryCard";

export default function CountryDatasetSummary({
  countryIso,
}: {
  countryIso: string;
}) {
  const [core, setCore] = useState<any>(null);
  const [other, setOther] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      // --- Admins ---
      const { count: adminCount } = await supabase
        .from("admin_units")
        .select("id", { count: "exact", head: true })
        .eq("country_iso", countryIso);

      // --- Population ---
      const { count: popCount } = await supabase
        .from("population_data")
        .select("id", { count: "exact", head: true })
        .eq("country_iso", countryIso);

      // --- GIS ---
      const { count: gisCount } = await supabase
        .from("gis_layers")
        .select("id", { count: "exact", head: true })
        .eq("country_iso", countryIso);

      // --- Other datasets ---
      const { data: otherData } = await supabase
        .from("dataset_metadata")
        .select("id, title, admin_level, record_count, indicator_id, year")
        .eq("country_iso", countryIso);

      const indicators =
        otherData && otherData.length
          ? await supabase
              .from("indicators")
              .select("id, name")
              .in(
                "id",
                otherData.map((d) => d.indicator_id).filter(Boolean)
              )
          : { data: [] };

      const indicatorMap =
        indicators?.data?.reduce(
          (acc: any, cur: any) => ({ ...acc, [cur.id]: cur.name }),
          {}
        ) ?? {};

      setCore({
        admins: { count: adminCount ?? 0 },
        population: { count: popCount ?? 0 },
        gis: { count: gisCount ?? 0 },
      });
      setOther(
        otherData?.map((d) => ({
          ...d,
          indicator: indicatorMap[d.indicator_id] ?? "—",
        })) ?? []
      );
    };
    fetchData();
  }, [countryIso]);

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Country Dataset Summary</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <CountrySummaryCard
          title="Admin Boundaries"
          metric={`${core?.admins?.count ?? 0} records`}
          health={core?.admins?.count ? "good" : "missing"}
          link={`/country/${countryIso}/admins`}
        />
        <CountrySummaryCard
          title="Population Data"
          metric={`${core?.population?.count ?? 0} records`}
          health={core?.population?.count ? "good" : "missing"}
          link={`/country/${countryIso}/population`}
        />
        <CountrySummaryCard
          title="GIS Layers"
          metric={`${core?.gis?.count ?? 0} layers`}
          health={
            (core?.gis?.count ?? 0) > 3
              ? "good"
              : (core?.gis?.count ?? 0) > 0
              ? "fair"
              : "missing"
          }
          link={`/country/${countryIso}/gis`}
        />
      </div>

      <h3 className="text-md font-semibold mb-2">Other Datasets</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {other.length > 0 ? (
          other.map((d) => (
            <CountrySummaryCard
              key={d.id}
              title={d.title}
              subtitle={d.indicator}
              metric={`${d.record_count ?? 0} recs @ ${d.admin_level ?? "?"}`}
              health={
                d.record_count > 0
                  ? "good"
                  : d.record_count === 0
                  ? "empty"
                  : "missing"
              }
              link={`/country/${countryIso}/datasets`}
            />
          ))
        ) : (
          <div className="text-sm text-gray-500 italic">
            No other datasets uploaded yet.
          </div>
        )}
      </div>

      <div className="mt-6">
        <h3 className="text-md font-semibold mb-2">Derived Datasets</h3>
        <div className="text-sm text-gray-500 italic">
          Derived datasets will appear here once analytical joins are created.
        </div>
      </div>
    </div>
  );
}

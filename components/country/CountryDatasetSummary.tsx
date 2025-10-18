"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import CountrySummaryCard from "@/components/country/CountrySummaryCard";

type AdminStats = {
  level: string;
  uniquePcodes: number;
  totalRecords: number;
};

type GISStats = {
  level: string;
  features: number;
  coveragePct: number;
};

export default function CountryDatasetSummary({
  countryIso,
}: {
  countryIso: string;
}) {
  const [adminStats, setAdminStats] = useState<AdminStats[]>([]);
  const [populationSummary, setPopulationSummary] = useState<{
    total: number;
    recordCount: number;
    lowestLevel: string;
  } | null>(null);
  const [gisStats, setGisStats] = useState<GISStats[]>([]);
  const [other, setOther] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      /* ----------------------------- ADMINS ----------------------------- */
      const { data: adminAgg, error: adminErr } = await supabase.rpc(
        "admin_level_summary",
        { country_code: countryIso }
      );

      // Fallback if view or function not found: do it client-side
      let adminResults: AdminStats[] = [];
      if (adminAgg && Array.isArray(adminAgg)) {
        adminResults = adminAgg.map((r: any) => ({
          level: r.level_label,
          uniquePcodes: r.unique_pcodes,
          totalRecords: r.total_records,
        }));
      } else {
        const { data: adminRaw } = await supabase
          .from("admin_units")
          .select("pcode, level")
          .eq("country_iso", countryIso);

        if (adminRaw) {
          const grouped: Record<string, { pcodes: Set<string>; total: number }> =
            {};
          adminRaw.forEach((r) => {
            const lvl = r.level || "ADM?";
            if (!grouped[lvl]) grouped[lvl] = { pcodes: new Set(), total: 0 };
            grouped[lvl].pcodes.add(r.pcode);
            grouped[lvl].total += 1;
          });
          adminResults = Object.entries(grouped)
            .map(([level, v]) => ({
              level,
              uniquePcodes: v.pcodes.size,
              totalRecords: v.total,
            }))
            .sort(
              (a, b) =>
                parseInt(a.level.replace("ADM", "")) -
                parseInt(b.level.replace("ADM", ""))
            );
        }
      }
      setAdminStats(adminResults);

      /* --------------------------- POPULATION --------------------------- */
      const { data: popAgg, error: popErr } = await supabase.rpc(
        "population_summary_by_country",
        { country_code: countryIso }
      );

      if (popAgg && popAgg[0]) {
        setPopulationSummary({
          total: popAgg[0].total_population ?? 0,
          recordCount: popAgg[0].record_count ?? 0,
          lowestLevel: popAgg[0].lowest_level ?? "—",
        });
      } else {
        const { data: popRaw } = await supabase
          .from("population_data")
          .select("pcode, population")
          .eq("country_iso", countryIso);

        if (popRaw) {
          const uniquePcodes = new Set(popRaw.map((r) => r.pcode)).size;
          const totalPopulation = popRaw.reduce(
            (sum, r) => sum + (Number(r.population) || 0),
            0
          );
          setPopulationSummary({
            total: totalPopulation,
            recordCount: uniquePcodes,
            lowestLevel:
              adminResults.length > 0
                ? adminResults[adminResults.length - 1].level
                : "—",
          });
        }
      }

      /* ----------------------------- GIS ----------------------------- */
      const { data: gisRaw } = await supabase
        .from("gis_layers")
        .select("admin_level, feature_count")
        .eq("country_iso", countryIso);

      let gisResults: GISStats[] = [];
      if (gisRaw) {
        gisResults = gisRaw
          .map((g) => {
            const level = g.admin_level || "ADM?";
            const adminAtLevel = adminResults.find(
              (a) => a.level === level
            )?.uniquePcodes;
            const coveragePct =
              adminAtLevel && adminAtLevel > 0
                ? Math.round(
                    ((g.feature_count ?? 0) / adminAtLevel) * 100 * 10
                  ) / 10
                : 0;
            return {
              level,
              features: g.feature_count ?? 0,
              coveragePct,
            };
          })
          .sort(
            (a, b) =>
              parseInt(a.level.replace("ADM", "")) -
              parseInt(b.level.replace("ADM", ""))
          );
      }
      setGisStats(gisResults);

      /* --------------------------- OTHER DATASETS -------------------------- */
      const { data: otherData } = await supabase
        .from("dataset_metadata")
        .select("id, title, admin_level, record_count, indicator_id, year")
        .eq("country_iso", countryIso);

      const { data: indData } = await supabase
        .from("indicators")
        .select("id, name");

      const indMap =
        indData?.reduce(
          (acc: any, cur: any) => ({ ...acc, [cur.id]: cur.name }),
          {}
        ) ?? {};

      setOther(
        otherData?.map((d) => ({
          ...d,
          indicator: indMap[d.indicator_id] ?? "—",
        })) || []
      );
    };

    fetchData();
  }, [countryIso]);

  /* ----------------------------- RENDER ----------------------------- */
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
          subtitle="Administrative hierarchy coverage"
          metric={
            adminStats.length ? (
              <ul className="text-sm text-gray-600 list-none m-0 p-0">
                {adminStats.map((a) => (
                  <li key={a.level}>
                    {a.level} – {a.uniquePcodes.toLocaleString()} pcodes (
                    {a.totalRecords.toLocaleString()} records)
                  </li>
                ))}
              </ul>
            ) : (
              "No admin data found"
            )
          }
          health={adminStats.length > 0 ? "good" : "missing"}
          link={`/country/${countryIso}/admins`}
        />

        {/* Population */}
        <CountrySummaryCard
          title="Population Data"
          subtitle={`Lowest level: ${
            populationSummary?.lowestLevel ?? "—"
          }`}
          metric={
            populationSummary ? (
              <div className="text-sm text-gray-600">
                <div>
                  Total population:{" "}
                  {populationSummary.total.toLocaleString()}
                </div>
                <div>
                  Coverage:{" "}
                  {populationSummary.recordCount.toLocaleString()} admin areas
                </div>
              </div>
            ) : (
              "No population data found"
            )
          }
          health={
            populationSummary && populationSummary.recordCount > 0
              ? "good"
              : "missing"
          }
          link={`/country/${countryIso}/population`}
        />

        {/* GIS Layers */}
        <CountrySummaryCard
          title="GIS Layers"
          subtitle="Features and admin coverage"
          metric={
            gisStats.length ? (
              <ul className="text-sm text-gray-600 list-none m-0 p-0">
                {gisStats.map((g) => (
                  <li key={g.level}>
                    {g.level} – {g.features.toLocaleString()} features (
                    {g.coveragePct.toFixed(1)}%)
                  </li>
                ))}
              </ul>
            ) : (
              "No GIS data found"
            )
          }
          health={gisStats.length > 0 ? "good" : "missing"}
          link={`/country/${countryIso}/gis`}
        />
      </div>

      {/* --- Other Datasets (Table Layout) --- */}
      <h3 className="text-md font-semibold mb-2 text-gray-700">
        Other Datasets
      </h3>
      {other.length > 0 ? (
        <div className="overflow-x-auto border rounded-lg">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-700">
              <tr>
                <th className="px-4 py-2 text-left">Dataset</th>
                <th className="px-4 py-2 text-left">Indicator</th>
                <th className="px-4 py-2 text-left">Admin Level</th>
                <th className="px-4 py-2 text-left">Records</th>
                <th className="px-4 py-2 text-left">Health</th>
              </tr>
            </thead>
            <tbody>
              {other.map((d) => (
                <tr
                  key={d.id}
                  className="border-t hover:bg-gray-50 transition-colors"
                >
                  <td className="px-4 py-2">{d.title}</td>
                  <td className="px-4 py-2 text-gray-600">
                    {d.indicator ?? "—"}
                  </td>
                  <td className="px-4 py-2">{d.admin_level ?? "—"}</td>
                  <td className="px-4 py-2">
                    {d.record_count?.toLocaleString() ?? 0}
                  </td>
                  <td className="px-4 py-2">
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        d.record_count > 0
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {d.record_count > 0 ? "good" : "missing"}
                    </span>
                  </td>
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

      {/* --- Derived --- */}
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

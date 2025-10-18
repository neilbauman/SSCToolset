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
  const [gisLayers, setGisLayers] = useState<any[]>([]);
  const [other, setOther] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      // --- Core datasets ---
      const { data: admins } = await supabase
        .from("admin_units")
        .select("level")
        .eq("country_iso", countryIso);

      const { data: pop } = await supabase
        .from("population_data")
        .select("pcode, population")
        .eq("country_iso", countryIso);

      const { data: gis } = await supabase
        .from("gis_layers")
        .select("layer_name, feature_count, admin_level")
        .eq("country_iso", countryIso);

      // --- Other datasets ---
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

      const lowestAdmin = admins?.length
        ? `ADM${Math.max(...admins.map((a: any) => parseInt(a.level || "0", 10) || 0))}`
        : "—";

      setCore({
        admins: { count: admins?.length || 0, lowest: lowestAdmin },
        population: { count: pop?.length || 0, lowest: lowestAdmin },
      });
      setGisLayers(gis || []);
      setOther(
        otherData?.map((d) => ({
          ...d,
          indicator: indMap[d.indicator_id] ?? "—",
        })) || []
      );
    };
    fetchData();
  }, [countryIso]);

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4 text-gsc-red">Country Dataset Summary</h2>

      {/* --- Core Datasets --- */}
      <h3 className="text-md font-semibold mb-3 text-gray-700">Core Datasets</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <CountrySummaryCard
          title="Admin Boundaries"
          subtitle={`Lowest level: ${core?.admins?.lowest ?? "—"}`}
          metric={`${core?.admins?.count ?? 0} records`}
          health={core?.admins?.count ? "good" : "missing"}
          link={`/country/${countryIso}/admins`}
        />
        <CountrySummaryCard
          title="Population Data"
          subtitle={`Lowest level: ${core?.population?.lowest ?? "—"}`}
          metric={`${core?.population?.count ?? 0} records`}
          health={core?.population?.count ? "good" : "missing"}
          link={`/country/${countryIso}/population`}
        />
        <CountrySummaryCard
          title="GIS Layers"
          subtitle={`${
            gisLayers.length ? gisLayers.length + " layers" : "No layers uploaded"
          }`}
          metric={gisLayers
            .map(
              (g) =>
                `${g.layer_name ?? "Untitled"} (${g.admin_level ?? "?"}) – ${
                  g.feature_count ?? 0
                } features`
            )
            .join("; ")}
          health={
            gisLayers.length > 3
              ? "good"
              : gisLayers.length > 0
              ? "fair"
              : "missing"
          }
          link={`/country/${countryIso}/gis`}
        />
      </div>

      {/* --- Other Datasets (Table Layout) --- */}
      <h3 className="text-md font-semibold mb-2 text-gray-700">Other Datasets</h3>
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
                  <td className="px-4 py-2">{d.record_count ?? 0}</td>
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
        <h3 className="text-md font-semibold mb-2 text-gray-700">Derived Datasets</h3>
        <div className="text-sm text-gray-500 italic">
          Derived datasets will appear here once analytical joins are created.
        </div>
      </div>
    </div>
  );
}

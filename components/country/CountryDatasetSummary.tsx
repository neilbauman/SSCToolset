"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import CountrySummaryCard from "@/components/country/CountrySummaryCard";

type AdminLevelStat = { level: string; pcodes: number; records: number };
type GisLevelStat = { level: string; features: number; coveragePct: number };

const ADM_LEVELS = ["ADM0", "ADM1", "ADM2", "ADM3", "ADM4", "ADM5"];

function admNum(level?: string | null) {
  if (!level) return 0;
  const n = parseInt(level.replace("ADM", ""), 10);
  return Number.isFinite(n) ? n : 0;
}

export default function CountryDatasetSummary({ countryIso }: { countryIso: string }) {
  const [adminVersion, setAdminVersion] = useState<any>(null);
  const [populationVersion, setPopulationVersion] = useState<any>(null);
  const [gisVersion, setGisVersion] = useState<any>(null);

  const [adminStats, setAdminStats] = useState<AdminLevelStat[]>([]);
  const [popTotal, setPopTotal] = useState<number | null>(null);
  const [popCoverage, setPopCoverage] = useState<number | null>(null);
  const [gisStats, setGisStats] = useState<GisLevelStat[]>([]);
  const [otherDatasets, setOtherDatasets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  /* ---------------------- Fetch Active Versions ---------------------- */
  useEffect(() => {
    const fetchVersions = async () => {
      setLoading(true);

      const [adminRes, popRes, gisRes] = await Promise.all([
        supabase
          .from("admin_dataset_versions")
          .select("*")
          .eq("country_iso", countryIso)
          .eq("is_active", true)
          .maybeSingle(),
        supabase
          .from("population_dataset_versions")
          .select("*")
          .eq("country_iso", countryIso)
          .eq("is_active", true)
          .maybeSingle(),
        supabase
          .from("gis_dataset_versions")
          .select("*")
          .eq("country_iso", countryIso)
          .eq("is_active", true)
          .maybeSingle(),
      ]);

      setAdminVersion(adminRes.data);
      setPopulationVersion(popRes.data);
      setGisVersion(gisRes.data);
      setLoading(false);
    };

    fetchVersions();
  }, [countryIso]);

  /* ---------------------- Admin Stats ---------------------- */
  useEffect(() => {
    const run = async () => {
      if (!adminVersion?.id) {
        setAdminStats([]);
        return;
      }

      const perLevel: AdminLevelStat[] = [];

      for (const lvl of ADM_LEVELS) {
        const { count } = await supabase
          .from("admin_units")
          .select("id", { count: "exact", head: true })
          .eq("dataset_version_id", adminVersion.id)
          .eq("level", lvl);

        if ((count ?? 0) > 0)
          perLevel.push({ level: lvl, pcodes: count!, records: count! });
      }

      perLevel.sort((a, b) => admNum(a.level) - admNum(b.level));
      setAdminStats(perLevel);
    };

    run();
  }, [adminVersion?.id]);

  /* ---------------------- Population Summary ---------------------- */
  useEffect(() => {
    const run = async () => {
      if (!populationVersion?.id) {
        setPopTotal(null);
        setPopCoverage(null);
        return;
      }

      const { count: coverage } = await supabase
        .from("population_data")
        .select("id", { count: "exact", head: true })
        .eq("dataset_version_id", populationVersion.id);

      setPopCoverage(coverage ?? null);

      // compute total population (chunked to avoid default limit)
      const { count: totalRows } = await supabase
        .from("population_data")
        .select("id", { count: "exact", head: true })
        .eq("dataset_version_id", populationVersion.id);

      const total = totalRows ?? 0;
      const CHUNK = 5000;
      let sum = 0;

      for (let from = 0; from < total; from += CHUNK) {
        const { data } = await supabase
          .from("population_data")
          .select("population")
          .eq("dataset_version_id", populationVersion.id)
          .range(from, Math.min(from + CHUNK - 1, total - 1));

        if (data?.length) {
          for (const row of data) sum += Number(row.population) || 0;
        }
      }

      setPopTotal(sum);
    };

    run();
  }, [populationVersion?.id]);

  /* ---------------------- GIS Stats ---------------------- */
  useEffect(() => {
    const run = async () => {
      if (!gisVersion?.id) {
        setGisStats([]);
        return;
      }

      const { data: gisLayers } = await supabase
        .from("gis_layers")
        .select("admin_level, feature_count")
        .eq("dataset_version_id", gisVersion.id);

      const byLevel: Record<string, number> = {};
      for (const a of adminStats) byLevel[a.level] = a.pcodes;

      const gis: GisLevelStat[] =
        gisLayers?.map((g) => {
          const lvl = g.admin_level || "ADM?";
          const features = Number(g.feature_count) || 0;
          const denom = byLevel[lvl] || 0;
          const pct = denom > 0 ? Math.round((features / denom) * 1000) / 10 : 0;
          return { level: lvl, features, coveragePct: pct };
        }) ?? [];

      gis.sort((a, b) => admNum(a.level) - admNum(b.level));
      setGisStats(gis);
    };

    run();
  }, [gisVersion?.id, adminStats]);

  /* ---------------------- Other Datasets ---------------------- */
  useEffect(() => {
    const run = async () => {
      const { data } = await supabase
        .from("view_dataset_summary")
        .select("id, title, year, admin_level, dataset_type, record_count, source")
        .eq("country_iso", countryIso);

      const others =
        data?.filter(
          (d) =>
            !["admin", "population", "gis"].includes(d.dataset_type || "")
        ) ?? [];

      setOtherDatasets(others);
    };

    run();
  }, [countryIso]);

  /* ---------------------- Render ---------------------- */
  if (loading) {
    return (
      <div className="text-sm text-gray-500 italic">Loading dataset summary…</div>
    );
  }

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4 text-gsc-red">
        Country Dataset Summary
      </h2>

      {/* Core Datasets */}
      <h3 className="text-md font-semibold mb-3 text-gray-700">Core Datasets</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Admin Areas */}
        <CountrySummaryCard
          title="Admin Areas"
          subtitle={
            adminVersion
              ? `${adminVersion.title ?? "—"} (${adminVersion.year ?? "—"})`
              : "No active dataset"
          }
          metric={
            adminVersion ? (
              <ul className="text-sm text-gray-600 list-none m-0 p-0">
                {adminStats.length === 0 ? (
                  <li>No admin data found</li>
                ) : (
                  adminStats.map((a) => (
                    <li key={a.level}>
                      {a.level} – {a.pcodes.toLocaleString()} pcodes (
                      {a.records.toLocaleString()} records)
                    </li>
                  ))
                )}
              </ul>
            ) : (
              "No admin dataset found"
            )
          }
          health={adminVersion ? "good" : "missing"}
          link={`/country/${countryIso}/admins`}
        />

        {/* Population */}
        <CountrySummaryCard
          title="Population Data"
          subtitle={
            populationVersion
              ? `${populationVersion.title ?? "—"} (${populationVersion.year ?? "—"})`
              : "No active dataset"
          }
          metric={
            populationVersion ? (
              <div className="text-sm text-gray-600">
                <div>Lowest level: {populationVersion.lowest_level ?? "—"}</div>
                <div>
                  Total population: {popTotal?.toLocaleString() ?? "—"}
                </div>
                <div>
                  Coverage: {popCoverage?.toLocaleString() ?? "—"} admin areas
                </div>
              </div>
            ) : (
              "No population dataset found"
            )
          }
          health={populationVersion ? "good" : "missing"}
          link={`/country/${countryIso}/population`}
        />

        {/* GIS */}
        <CountrySummaryCard
          title="GIS Layers"
          subtitle={
            gisVersion
              ? `${gisVersion.title ?? "—"} (${gisVersion.year ?? "—"})`
              : "No active GIS dataset"
          }
          metric={
            gisVersion ? (
              <ul className="text-sm text-gray-600 list-none m-0 p-0">
                {gisStats.length === 0 ? (
                  <li>No GIS layers found</li>
                ) : (
                  gisStats.map((g) => (
                    <li key={g.level}>
                      {g.level} – {g.features.toLocaleString()} features (
                      {g.coveragePct.toFixed(1)}%)
                    </li>
                  ))
                )}
              </ul>
            ) : (
              "No GIS layers found"
            )
          }
          health={gisVersion ? "good" : "missing"}
          link={`/country/${countryIso}/gis`}
        />
      </div>

      {/* Other Datasets */}
      <h3 className="text-md font-semibold mb-2 text-gray-700">Other Datasets</h3>
      {otherDatasets.length > 0 ? (
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
              {otherDatasets.map((d) => (
                <tr
                  key={d.id}
                  className="border-t hover:bg-gray-50 transition-colors"
                >
                  <td className="px-4 py-2">{d.title ?? "—"}</td>
                  <td className="px-4 py-2 capitalize">{d.dataset_type ?? "—"}</td>
                  <td className="px-4 py-2">{d.admin_level ?? "—"}</td>
                  <td className="px-4 py-2">{d.record_count?.toLocaleString() ?? "—"}</td>
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

      {/* Derived Datasets */}
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

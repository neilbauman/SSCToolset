"use client";

import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import CountrySummaryCard from "@/components/country/CountrySummaryCard";

type SummaryRow = {
  id: string;
  version_id: string | null;
  country_iso: string;
  title: string | null;
  year: number | null;
  admin_level: string | null;
  dataset_type: string | null;
  record_count: number | null;
  is_active: boolean | null;
  source: string | null;
};

type AdminLevelStat = { level: string; pcodes: number; records: number };
type GisLevelStat = { level: string; features: number; coveragePct: number };

const ADM_LEVELS = ["ADM0","ADM1","ADM2","ADM3","ADM4","ADM5"] as const;

/** Small helper to safely parse ADMn -> n (for sorting) */
function admNum(level?: string | null) {
  if (!level) return 0;
  const n = parseInt(level.replace("ADM", ""), 10);
  return Number.isFinite(n) ? n : 0;
}

export default function CountryDatasetSummary({ countryIso }: { countryIso: string }) {
  const [rows, setRows] = useState<SummaryRow[]>([]);
  const [adminStats, setAdminStats] = useState<AdminLevelStat[]>([]);
  const [popTotal, setPopTotal] = useState<number | null>(null);
  const [popCoverage, setPopCoverage] = useState<number | null>(null);
  const [gisStats, setGisStats] = useState<GisLevelStat[]>([]);
  const [loading, setLoading] = useState(true);

  // --- fetch active dataset versions from the view (no non-existent columns) ---
  useEffect(() => {
    const run = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("view_dataset_summary")
        .select("id,version_id,country_iso,title,year,admin_level,dataset_type,record_count,is_active,source")
        .eq("country_iso", countryIso)
        .eq("is_active", true);

      if (error) {
        console.error("Error fetching dataset summaries:", error);
        setRows([]);
        setLoading(false);
        return;
      }
      setRows((data as SummaryRow[]) || []);
      setLoading(false);
    };
    run();
  }, [countryIso]);

  const adminRow = useMemo(
    () => rows.find((r) => r.dataset_type === "admin") || null,
    [rows]
  );
  const popRow = useMemo(
    () => rows.find((r) => r.dataset_type === "population") || null,
    [rows]
  );
  const gisRow = useMemo(
    () => rows.find((r) => r.dataset_type === "gis") || null,
    [rows]
  );
  const otherRows = useMemo(
    () => rows.filter((r) => !["admin","population","gis"].includes(r.dataset_type || "")),
    [rows]
  );

  // --- Admin breakdown by level (counts come from active admin version) ---
  useEffect(() => {
    const run = async () => {
      if (!adminRow?.version_id) {
        setAdminStats([]);
        return;
      }

      // total records once (exact count)
      const { count: totalCount } = await supabase
        .from("admin_units")
        .select("id", { count: "exact", head: true })
        .eq("dataset_version_id", adminRow.version_id);

      // per-level counts (records == unique pcodes in this table)
      const perLevel: AdminLevelStat[] = [];
      for (const L of ADM_LEVELS) {
        const { count } = await supabase
          .from("admin_units")
          .select("id", { count: "exact", head: true })
          .eq("dataset_version_id", adminRow.version_id)
          .eq("level", L);

        if ((count ?? 0) > 0) {
          perLevel.push({ level: L, pcodes: count!, records: count! });
        }
      }

      // sort ascending (ADM0 -> lowest present)
      perLevel.sort((a,b) => admNum(a.level) - admNum(b.level));

      // replace total on the deepest level with the true total if available
      if (perLevel.length && totalCount != null) {
        perLevel[perLevel.length - 1].records = totalCount!;
      }

      setAdminStats(perLevel);
    };
    run();
  }, [adminRow?.version_id]);

  // --- Population totals & coverage from active population version ---
  useEffect(() => {
    const run = async () => {
      if (!popRow?.version_id) {
        setPopTotal(null);
        setPopCoverage(null);
        return;
      }

      // coverage = distinct admin areas with a population value (use count exact)
      const { count: coverage } = await supabase
        .from("population_data")
        .select("id", { count: "exact", head: true })
        .eq("dataset_version_id", popRow.version_id);

      setPopCoverage(coverage ?? null);

      // true sum of population (chunked to avoid 1000-row default cap)
      // 1) find total row count
      const { count: totalRows } = await supabase
        .from("population_data")
        .select("id", { count: "exact", head: true })
        .eq("dataset_version_id", popRow.version_id);

      let sum = 0;
      const CHUNK = 5000;
      const total = totalRows ?? 0;

      for (let from = 0; from < total; from += CHUNK) {
        const to = Math.min(from + CHUNK - 1, total - 1);
        const { data } = await supabase
          .from("population_data")
          .select("population")
          .eq("dataset_version_id", popRow.version_id)
          .range(from, to);

        if (data?.length) {
          for (const row of data) sum += Number(row.population) || 0;
        }
      }
      setPopTotal(sum);
    };
    run();
  }, [popRow?.version_id]);

  // --- GIS per-level features & coverage from active GIS version ---
  useEffect(() => {
    const run = async () => {
      if (!gisRow?.version_id) {
        setGisStats([]);
        return;
      }

      // features by admin_level
      const { data: layers } = await supabase
        .from("gis_layers")
        .select("admin_level, feature_count")
        .eq("dataset_version_id", gisRow.version_id);

      // admin counts at each level from the adminStats (already computed)
      const byLevel: Record<string, number> = {};
      for (const a of adminStats) byLevel[a.level] = a.pcodes;

      const stats: GisLevelStat[] =
        (layers || [])
          .map((g) => {
            const lvl = g.admin_level || "ADM?";
            const features = Number(g.feature_count) || 0;
            const denom = byLevel[lvl] || 0;
            const pct = denom > 0 ? Math.round((features / denom) * 1000) / 10 : 0;
            return { level: lvl, features, coveragePct: pct };
          })
          .sort((a,b) => admNum(a.level) - admNum(b.level));

      setGisStats(stats);
    };
    run();
  }, [gisRow?.version_id, adminStats]);

  if (loading) {
    return <div className="text-sm text-gray-500 italic">Loading dataset summary…</div>;
  }

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4 text-gsc-red">Country Dataset Summary</h2>

      {/* Core */}
      <h3 className="text-md font-semibold mb-3 text-gray-700">Core Datasets</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Admin Areas */}
        <CountrySummaryCard
          title="Admin Areas"
          subtitle={
            adminRow ? `${adminRow.title ?? "—"} (${adminRow.year ?? "—"})` : "No active dataset"
          }
          metric={
            adminRow ? (
              <ul className="text-sm text-gray-600 list-none m-0 p-0">
                {adminStats.length === 0 ? (
                  <li>No admin data found</li>
                ) : (
                  adminStats.map((a) => (
                    <li key={a.level}>
                      {a.level} – {a.pcodes.toLocaleString()} pcodes ({a.records.toLocaleString()} records)
                    </li>
                  ))
                )}
              </ul>
            ) : (
              "No admin dataset found"
            )
          }
          health={adminRow ? "good" : "missing"}
          link={`/country/${countryIso}/admins`}
        />

        {/* Population */}
        <CountrySummaryCard
          title="Population Data"
          subtitle={
            popRow ? `${popRow.title ?? "—"} (${popRow.year ?? "—"})` : "No active dataset"
          }
          metric={
            popRow ? (
              <div className="text-sm text-gray-600">
                <div>Lowest level: {popRow.admin_level ?? "—"}</div>
                <div>Total population: {popTotal?.toLocaleString() ?? "—"}</div>
                <div>Coverage: {popCoverage?.toLocaleString() ?? "—"} admin areas</div>
              </div>
            ) : (
              "No population dataset found"
            )
          }
          health={popRow ? "good" : "missing"}
          link={`/country/${countryIso}/population`}
        />

        {/* GIS Layers */}
        <CountrySummaryCard
          title="GIS Layers"
          subtitle={gisRow ? `${gisRow.title ?? "—"} (${gisRow.year ?? "—"})` : "No active GIS dataset"}
          metric={
            gisRow ? (
              <ul className="text-sm text-gray-600 list-none m-0 p-0">
                {gisStats.length === 0 ? (
                  <li>No GIS layers found</li>
                ) : (
                  gisStats.map((g) => (
                    <li key={g.level}>
                      {g.level} – {g.features.toLocaleString()} features ({g.coveragePct.toFixed(1)}%)
                    </li>
                  ))
                )}
              </ul>
            ) : (
              "No GIS layers found"
            )
          }
          health={gisRow ? "good" : "missing"}
          link={`/country/${countryIso}/gis`}
        />
      </div>

      {/* Other */}
      <h3 className="text-md font-semibold mb-2 text-gray-700">Other Datasets</h3>
      {otherRows.length > 0 ? (
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
              {otherRows.map((d) => (
                <tr key={d.id} className="border-t hover:bg-gray-50 transition-colors">
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
        <div className="text-sm text-gray-500 italic mb-6">No other datasets uploaded yet.</div>
      )}

      {/* Derived */}
      <div className="mt-6">
        <h3 className="text-md font-semibold mb-2 text-gray-700">Derived Datasets</h3>
        <div className="text-sm text-gray-500 italic">
          Derived datasets will appear here once analytical joins are created.
        </div>
      </div>
    </div>
  );
}

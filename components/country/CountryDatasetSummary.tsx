"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { ArrowRight } from "lucide-react";

type Health = "good" | "fair" | "poor" | "missing";

function Badge({ status }: { status: Health }) {
  const styles: Record<Health, string> = {
    good: "bg-green-100 text-green-700",
    fair: "bg-yellow-100 text-yellow-700",
    poor: "bg-red-100 text-red-700",
    missing: "bg-red-100 text-red-700",
  };
  return (
    <span className={`px-2 py-0.5 text-xs font-medium rounded ${styles[status]}`}>
      {status}
    </span>
  );
}

function StatLine({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={`text-sm text-gray-700 leading-relaxed ${className}`}>{children}</div>;
}

export default function CountryDatasetSummary({ countryIso }: { countryIso: string }) {
  const [adminVersion, setAdminVersion] = useState<any | null>(null);
  const [adminByLevel, setAdminByLevel] = useState<Record<string, number>>({});
  const [pop, setPop] = useState<any | null>(null);
  const [gisRows, setGisRows] = useState<
    { admin_level: string; represented_distinct_pcodes: number; total_admins: number; coverage_pct: number | null; adm0_total_km2: number | null }[]
  >([]);
  const [otherDatasets, setOtherDatasets] = useState<
    {
      id: string;
      title: string;
      indicator_name: string | null;
      taxonomy_category: string | null;
      taxonomy_term: string | null;
      admin_level: string;
      record_count: number;
      data_health: string | null;
    }[]
  >([]);

  // --- Admin dataset ---
  useEffect(() => {
    (async () => {
      const { data: v } = await supabase
        .from("admin_dataset_versions")
        .select("id, title, year")
        .eq("country_iso", countryIso)
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();

      if (v?.id) {
        setAdminVersion(v);
        const { data: rows } = await supabase
          .from("admin_units")
          .select("level, pcode")
          .eq("dataset_version_id", v.id);
        if (rows) {
          const grouped: Record<string, Set<string>> = {};
          for (const r of rows) {
            const lvl = String(r.level);
            if (!grouped[lvl]) grouped[lvl] = new Set<string>();
            if (r.pcode) grouped[lvl].add(r.pcode);
          }
          const out: Record<string, number> = {};
          Object.keys(grouped).forEach((k) => (out[k] = grouped[k].size));
          setAdminByLevel(out);
        }
      }
    })();
  }, [countryIso]);

  // --- Population ---
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("view_population_country_active_summary")
        .select("population_title, population_year, total_population, admin_area_count")
        .eq("country_iso", countryIso)
        .maybeSingle();
      if (data) setPop(data);
    })();
  }, [countryIso]);

  // --- GIS layers ---
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("view_gis_country_active_summary")
        .select("admin_level, represented_distinct_pcodes, total_admins, coverage_pct, adm0_total_km2")
        .eq("country_iso", countryIso);
      if (data) setGisRows(data);
    })();
  }, [countryIso]);

  // --- Other datasets ---
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("view_dataset_with_indicator")
        .select("id, title, indicator_name, taxonomy_category, taxonomy_term, admin_level, record_count")
        .eq("country_iso", countryIso)
        .order("year", { ascending: false });
      if (data) {
        const enriched = data.map((d: any) => ({
          id: d.id,
          title: d.title,
          indicator_name: d.indicator_name,
          taxonomy_category: d.taxonomy_category,
          taxonomy_term: d.taxonomy_term,
          admin_level: d.admin_level ?? "—",
          record_count: d.record_count ?? 0,
          data_health: "good",
        }));
        setOtherDatasets(enriched);
      }
    })();
  }, [countryIso]);

  // --- Derived values ---
  const gisByLevel = useMemo(() => {
    const map: Record<string, { rep: number; tot: number; pct: number | null }> = {};
    for (const r of gisRows) {
      map[r.admin_level] = {
        rep: r.represented_distinct_pcodes || 0,
        tot: r.total_admins || 0,
        pct: r.coverage_pct,
      };
    }
    return map;
  }, [gisRows]);

  const adm0Km2 = useMemo(() => {
    const any = gisRows.find((r) => r.admin_level === "ADM0");
    return any?.adm0_total_km2 ?? null;
  }, [gisRows]);

  const adminHealth: Health = adminByLevel ? "good" : "missing";
  const popHealth: Health = pop && pop.total_population ? "good" : "missing";
  const gisHealth: Health = gisRows?.length > 0 ? "good" : "missing";

  // --- Render ---
  return (
    <section className="mt-4">
      <h2 className="text-xl font-semibold mb-4">Core Datasets</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {/* Admin Areas */}
        <div className="border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <Link
              href={`/country/${countryIso}/admins`}
              className="text-lg font-semibold text-[#123865] hover:underline"
            >
              Admin Areas
            </Link>
            <Badge status={adminHealth} />
          </div>
          {adminVersion ? (
            <>
              <StatLine className="mb-1 text-gray-600">
                {adminVersion.title} ({adminVersion.year})
              </StatLine>
              {["ADM1", "ADM2", "ADM3", "ADM4"].map((lvl) => (
                <StatLine key={lvl}>
                  <span className="font-medium">{lvl}</span> –{" "}
                  {adminByLevel[lvl] ?? 0} pcodes ({adminByLevel[lvl] ?? 0} records)
                </StatLine>
              ))}
            </>
          ) : (
            <div className="text-gray-500 text-sm">No active admin dataset found</div>
          )}
          <div className="mt-2">
            <Link
              href={`/country/${countryIso}/admins`}
              className="text-blue-600 text-sm font-medium inline-flex items-center gap-1"
            >
              View details <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Population Data */}
        <div className="border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <Link
              href={`/country/${countryIso}/population`}
              className="text-lg font-semibold text-[#123865] hover:underline"
            >
              Population Data
            </Link>
            <Badge status={popHealth} />
          </div>
          {pop ? (
            <>
              <StatLine className="mb-1 text-gray-600">
                {pop.population_title} ({pop.population_year ?? "—"})
              </StatLine>
              <StatLine>Lowest level: —</StatLine>
              <StatLine>
                Total population: {Intl.NumberFormat().format(pop.total_population ?? 0)}
              </StatLine>
              <StatLine>
                Coverage: {Intl.NumberFormat().format(pop.admin_area_count ?? 0)} admin areas
              </StatLine>
            </>
          ) : (
            <div className="text-gray-500 text-sm">No population dataset found</div>
          )}
          <div className="mt-2">
            <Link
              href={`/country/${countryIso}/population`}
              className="text-blue-600 text-sm font-medium inline-flex items-center gap-1"
            >
              View details <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* GIS Layers */}
        <div className="border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <Link
              href={`/country/${countryIso}/gis`}
              className="text-lg font-semibold text-[#123865] hover:underline"
            >
              GIS Layers
            </Link>
            <Badge status={gisHealth} />
          </div>
          {gisRows && gisRows.length > 0 ? (
            <>
              <StatLine className="mb-1 text-gray-600">{countryIso} (active)</StatLine>
              <StatLine>
                ADM0 total area:{" "}
                {adm0Km2 ? Intl.NumberFormat().format(Number(adm0Km2)) : "—"} km²
              </StatLine>
              {["ADM0", "ADM1", "ADM2", "ADM3"].map((lvl) => (
                <StatLine key={lvl}>
                  <span className="font-medium">{lvl}</span> –{" "}
                  {Intl.NumberFormat().format(gisByLevel[lvl]?.rep ?? 0)} features{" "}
                  {gisByLevel[lvl]?.tot
                    ? `(${(gisByLevel[lvl]?.pct ?? 0).toFixed(1)}%)`
                    : "(0.0%)"}
                </StatLine>
              ))}
            </>
          ) : (
            <div className="text-gray-500 text-sm">No active GIS dataset</div>
          )}
          <div className="mt-2">
            <Link
              href={`/country/${countryIso}/gis`}
              className="text-blue-600 text-sm font-medium inline-flex items-center gap-1"
            >
              View details <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>

      {/* === Other Datasets === */}
      <div className="flex items-center justify-between mt-8 mb-3">
        <Link
          href={`/country/${countryIso}/datasets/page`}
          className="text-xl font-semibold hover:underline"
        >
          Other Datasets
        </Link>
      </div>

      {otherDatasets.length === 0 ? (
        <div className="text-gray-500 italic text-sm">No other datasets uploaded yet.</div>
      ) : (
        <div className="overflow-x-auto border rounded-lg">
          <table className="min-w-full text-sm text-gray-700">
            <thead className="bg-gray-50 text-gray-600 font-medium">
              <tr>
                <th className="px-3 py-2 text-left">Title</th>
                <th className="px-3 py-2 text-left">Indicator</th>
                <th className="px-3 py-2 text-left">Admin Level</th>
                <th className="px-3 py-2 text-right">Records</th>
                <th className="px-3 py-2 text-center">Health</th>
              </tr>
            </thead>
            <tbody>
              {otherDatasets.map((d) => (
                <tr key={d.id} className="border-t hover:bg-gray-50">
                  <td className="px-3 py-2">{d.title}</td>
                  <td className="px-3 py-2">
                    <div>{d.indicator_name ?? "—"}</div>
                    {d.taxonomy_term && (
                      <div className="text-xs text-gray-500">
                        {d.taxonomy_category ?? ""} → {d.taxonomy_term}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2">{d.admin_level}</td>
                  <td className="px-3 py-2 text-right">
                    {Intl.NumberFormat().format(d.record_count)}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <Badge status={d.data_health as Health} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* === Derived Datasets placeholder === */}
      <h2 className="text-xl font-semibold mt-8 mb-3">Derived Datasets</h2>
      <div className="text-gray-500 italic text-sm">
        Derived and analytical datasets will appear once joins are created.
      </div>
    </section>
  );
}

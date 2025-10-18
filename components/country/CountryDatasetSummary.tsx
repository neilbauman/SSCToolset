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
    <span className={`px-3 py-1 text-sm rounded ${styles[status]}`}>{status}</span>
  );
}

// ✅ FIX: Added className prop
function StatLine({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={`text-gray-700 leading-relaxed ${className}`}>{children}</div>;
}

export default function CountryDatasetSummary({ countryIso }: { countryIso: string }) {
  // Admin
  const [adminVersion, setAdminVersion] = useState<any | null>(null);
  const [adminByLevel, setAdminByLevel] = useState<Record<string, number>>({});

  // Population (from view)
  const [pop, setPop] = useState<{
    population_title?: string;
    population_year?: number | null;
    total_population?: number;
    admin_area_count?: number;
  } | null>(null);

  // GIS (from view)
  const [gisRows, setGisRows] = useState<
    {
      admin_level: string;
      represented_distinct_pcodes: number;
      total_admins: number;
      coverage_pct: number | null;
      adm0_total_km2: number | null;
    }[]
  >([]);

  // ============= Fetch Admin =============
  useEffect(() => {
    (async () => {
      // active admin version
      const { data: v } = await supabase
        .from("admin_dataset_versions")
        .select("id, title, year")
        .eq("country_iso", countryIso)
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();

      if (v?.id) {
        setAdminVersion(v);
        // counts by level (DISTINCT pcode)
        const { data: rows, error } = await supabase
          .from("admin_units")
          .select("level, pcode")
          .eq("dataset_version_id", v.id);

        if (!error && rows) {
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

  // ============= Fetch Population summary (view) =============
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("view_population_country_active_summary")
        .select("population_title, population_year, total_population, admin_area_count")
        .eq("country_iso", countryIso)
        .maybeSingle();

      if (!error && data) {
        setPop(data);
      }
    })();
  }, [countryIso]);

  // ============= Fetch GIS coverage (view) =============
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("view_gis_country_active_summary")
        .select(
          "admin_level, represented_distinct_pcodes, total_admins, coverage_pct, adm0_total_km2"
        )
        .eq("country_iso", countryIso);

      if (!error && data) setGisRows(data);
    })();
  }, [countryIso]);

  // Health heuristics
  const adminHealth: Health =
    adminByLevel && (adminByLevel["ADM1"] || adminByLevel["ADM0"]) ? "good" : "missing";
  const popHealth: Health = pop && (pop.total_population ?? 0) > 0 ? "good" : "missing";
  const gisHealth: Health = gisRows && gisRows.length > 0 ? "good" : "missing";

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

  return (
    <section className="mt-4">
      <h2 className="text-2xl font-semibold mb-4">Core Datasets</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {/* Admin Areas */}
        <div className="border rounded-lg p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-2xl font-semibold text-[#123865]">Admin Areas</h3>
            <Badge status={adminHealth} />
          </div>

          {adminVersion ? (
            <>
              <StatLine className="mb-1">
                <span className="text-gray-700">
                  {adminVersion.title} ({adminVersion.year})
                </span>
              </StatLine>
              {["ADM1", "ADM2", "ADM3", "ADM4"].map((lvl) => (
                <StatLine key={lvl}>
                  <span className="font-medium">{lvl}</span> –{" "}
                  {adminByLevel[lvl] ?? 0} pcodes ({adminByLevel[lvl] ?? 0} records)
                </StatLine>
              ))}
            </>
          ) : (
            <div className="text-gray-500">No active admin dataset found</div>
          )}

          <div className="mt-3">
            <Link
              href={`/country/${countryIso}/admins`}
              className="text-blue-600 font-medium inline-flex items-center gap-1"
            >
              View details <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Population */}
        <div className="border rounded-lg p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-2xl font-semibold text-[#123865]">Population Data</h3>
            <Badge status={popHealth} />
          </div>

          {pop ? (
            <>
              <StatLine className="mb-1">
                {pop.population_title} ({pop.population_year ?? "—"})
              </StatLine>
              <StatLine>Lowest level: —</StatLine>
              <StatLine>
                Total population:{" "}
                {Intl.NumberFormat().format(pop.total_population ?? 0)}
              </StatLine>
              <StatLine>
                Coverage: {Intl.NumberFormat().format(pop.admin_area_count ?? 0)} admin areas
              </StatLine>
            </>
          ) : (
            <div className="text-gray-500">No population dataset found</div>
          )}

          <div className="mt-3">
            <Link
              href={`/country/${countryIso}/population`}
              className="text-blue-600 font-medium inline-flex items-center gap-1"
            >
              View details <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* GIS Layers */}
        <div className="border rounded-lg p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-2xl font-semibold text-[#123865]">GIS Layers</h3>
            <Badge status={gisHealth} />
          </div>

          {gisRows && gisRows.length > 0 ? (
            <>
              <StatLine className="mb-1">{countryIso} (active)</StatLine>

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
            <div className="text-gray-500">No active GIS dataset</div>
          )}

          <div className="mt-3">
            <Link
              href={`/country/${countryIso}/gis`}
              className="text-blue-600 font-medium inline-flex items-center gap-1"
            >
              View details <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* Other + Derived headings (unchanged placeholders) */}
      <h2 className="text-2xl font-semibold mt-10 mb-3">Other Datasets</h2>
      <div className="text-gray-500 italic">
        Linked indicator datasets will appear here.
      </div>

      <h2 className="text-2xl font-semibold mt-10 mb-3">Derived Datasets</h2>
      <div className="text-gray-500 italic">
        Derived and analytical datasets will appear once joins are created.
      </div>
    </section>
  );
}

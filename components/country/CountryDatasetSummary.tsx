"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { Loader2, Database } from "lucide-react";

/**
 * CountryDatasetSummary.tsx
 * --------------------------
 * Displays a summary of all dataset categories for a country:
 *  - Administrative Areas (ADM1–ADM4)
 *  - Population (using RPC get_population_summary + fallback)
 *  - GIS Features
 *  - Other Datasets
 *  - Derived Datasets
 *
 * Uses schema-safe queries (no count(*)) and handles Supabase RPC fallback.
 */

type Props = {
  countryIso: string;
};

type AdminSummary = { level: string; count: number };
type PopSummary = { records: number; total_population: number };
type GisSummary = { admin_level: string; features: number };
type OtherSummary = { total: number; records: number; latest_year: number };
type DerivedSummary = { total: number; records: number; latest_year: number };

export default function CountryDatasetSummary({ countryIso }: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [admin, setAdmin] = useState<AdminSummary[]>([]);
  const [pop, setPop] = useState<PopSummary | null>(null);
  const [gis, setGis] = useState<GisSummary[]>([]);
  const [other, setOther] = useState<OtherSummary | null>(null);
  const [derived, setDerived] = useState<DerivedSummary | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);

        /** ─────────────────────────────────────────────
         * 1️⃣ Administrative Areas
         * ───────────────────────────────────────────── */
        const { data: adminRows, error: e1 } = await supabase
          .from("admin_units")
          .select("level, pcode")
          .eq("country_iso", countryIso);

        if (e1) throw e1;

        const levelCounts: Record<string, Set<string>> = {};
        (adminRows || []).forEach((r: any) => {
          if (!r.level || !r.pcode) return;
          if (!levelCounts[r.level]) levelCounts[r.level] = new Set();
          levelCounts[r.level].add(r.pcode);
        });

        const adminSummary = Object.entries(levelCounts)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([level, set]) => ({ level, count: set.size }));
        setAdmin(adminSummary);

        /** ─────────────────────────────────────────────
         * 2️⃣ Population Summary (RPC + fallback)
         * ───────────────────────────────────────────── */
        let totalPop = 0;
        let recordCount = 0;

        const { data: popRpc, error: e2 } = await supabase.rpc(
          "get_population_summary",
          {
            country_iso: countryIso,
            dataset_version_id: null,
            total_population: null,
            record_count: null,
          }
        );

        if (e2 || !popRpc) {
          console.warn(
            "RPC get_population_summary failed, falling back to population_data table:",
            e2?.message
          );
          const { data: popRows, error: e3 } = await supabase
            .from("population_data")
            .select("population")
            .eq("country_iso", countryIso);

          if (e3) throw e3;
          totalPop = popRows?.reduce(
            (sum, r) => sum + Number(r.population || 0),
            0
          );
          recordCount = popRows?.length || 0;
        } else {
          const popData = Array.isArray(popRpc) ? popRpc[0] : popRpc;
          totalPop = Number(popData?.total_population || 0);
          recordCount = Number(popData?.record_count || 0);
        }

        setPop({
          records: recordCount,
          total_population: totalPop,
        });

        /** ─────────────────────────────────────────────
         * 3️⃣ GIS Features
         * ───────────────────────────────────────────── */
        const { data: gisRows, error: e4 } = await supabase
          .from("gis_features")
          .select("admin_level")
          .eq("country_iso", countryIso);

        if (e4) throw e4;

        const gisCount: Record<string, number> = {};
        (gisRows || []).forEach((r: any) => {
          const lvl = r.admin_level || "N/A";
          gisCount[lvl] = (gisCount[lvl] || 0) + 1;
        });

        const gisSummary = Object.entries(gisCount)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([admin_level, features]) => ({
            admin_level,
            features,
          }));
        setGis(gisSummary);

        /** ─────────────────────────────────────────────
         * 4️⃣ Other Datasets
         * ───────────────────────────────────────────── */
        const { data: otherRows, error: e5 } = await supabase
          .from("dataset_metadata")
          .select("year, record_count")
          .eq("country_iso", countryIso);

        if (e5) throw e5;

        const totalDatasets = otherRows?.length || 0;
        const totalRecords = otherRows?.reduce(
          (sum, r) => sum + (r.record_count || 0),
          0
        );
        const latestYear = Math.max(
          ...((otherRows || []).map((r) => r.year || 0)),
          0
        );

        setOther({
          total: totalDatasets,
          records: totalRecords,
          latest_year: latestYear,
        });

        /** ─────────────────────────────────────────────
         * 5️⃣ Derived Datasets
         * ───────────────────────────────────────────── */
        const { data: derivedRows, error: e6 } = await supabase
          .from("view_derived_dataset_summary")
          .select("year, record_count")
          .eq("country_iso", countryIso);

        if (e6) throw e6;

        const derivedTotal = derivedRows?.length || 0;
        const derivedRecords = derivedRows?.reduce(
          (s, r) => s + (r.record_count || 0),
          0
        );
        const derivedLatest = Math.max(
          ...((derivedRows || []).map((r) => r.year || 0)),
          0
        );

        setDerived({
          total: derivedTotal,
          records: derivedRecords,
          latest_year: derivedLatest,
        });

        setError(null);
      } catch (err: any) {
        console.error("Error loading dataset summary:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [countryIso]);

  if (loading) {
    return (
      <div className="p-4 text-gray-600 text-sm flex items-center">
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
        Loading dataset summary…
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-red-600 text-sm">
        Error loading dataset summary: {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 1️⃣ Administrative Areas */}
      <Panel
        title="Administrative Areas"
        link={`/country/${countryIso}/admins`}
        description="Administrative hierarchy completeness by level."
        stats={
          admin.length
            ? admin.map((a) => ({
                label: a.level,
                value: a.count.toLocaleString(),
              }))
            : [{ label: "Levels", value: "—" }]
        }
      />

      {/* 2️⃣ Population */}
      <Panel
        title="Population"
        link={`/country/${countryIso}/population`}
        description="Population records and total population coverage."
        stats={[
          { label: "Records", value: pop?.records?.toLocaleString() ?? "—" },
          {
            label: "Total Population",
            value: pop?.total_population?.toLocaleString() ?? "—",
          },
        ]}
      />

      {/* 3️⃣ GIS */}
      <Panel
        title="GIS Data"
        link={`/country/${countryIso}/gis`}
        description="GIS layers and spatial feature counts by administrative level."
        stats={
          gis.length
            ? gis.map((g) => ({
                label: g.admin_level,
                value: g.features.toLocaleString(),
              }))
            : [{ label: "Features", value: "—" }]
        }
      />

      {/* 4️⃣ Other Datasets */}
      <Panel
        title="Other Datasets"
        link={`/country/${countryIso}/datasets`}
        description="Uploaded datasets available for analytical use."
        stats={[
          { label: "Datasets", value: other?.total?.toLocaleString() ?? "—" },
          { label: "Records", value: other?.records?.toLocaleString() ?? "—" },
          { label: "Latest Year", value: other?.latest_year?.toString() ?? "—" },
        ]}
      />

      {/* 5️⃣ Derived Datasets */}
      <Panel
        title="Derived Datasets"
        link={`/country/${countryIso}/derived`}
        description="Analytical datasets derived from population, administrative, GIS, and other data sources."
        stats={[
          { label: "Derived Sets", value: derived?.total?.toLocaleString() ?? "—" },
          { label: "Records", value: derived?.records?.toLocaleString() ?? "—" },
          { label: "Latest Year", value: derived?.latest_year?.toString() ?? "—" },
        ]}
      />
    </div>
  );
}

/**
 * Panel Component
 * ----------------
 * Consistent layout for dataset summary sections.
 */
function Panel({
  title,
  link,
  description,
  stats,
}: {
  title: string;
  link: string;
  description: string;
  stats: { label: string; value: string }[];
}) {
  return (
    <div
      className="rounded-xl border p-4 shadow-sm"
      style={{
        borderColor: "var(--gsc-light-gray)",
        background: "var(--gsc-beige)",
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <Link
          href={link}
          className="text-lg font-semibold text-[color:var(--gsc-red)] hover:underline"
        >
          {title}
        </Link>
        <Database className="h-5 w-5 text-gray-500" />
      </div>
      <p className="text-sm text-gray-600 mb-3">{description}</p>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {stats.map((s, i) => (
          <div
            key={i}
            className="rounded-lg bg-white p-3 text-center border shadow-sm"
            style={{ borderColor: "var(--gsc-light-gray)" }}
          >
            <div className="text-xs text-gray-500 uppercase tracking-wide">
              {s.label}
            </div>
            <div className="text-base font-semibold text-gray-900">
              {s.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

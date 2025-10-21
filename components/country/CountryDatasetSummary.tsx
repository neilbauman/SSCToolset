"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { Loader2, Database } from "lucide-react";

/**
 * CountryDatasetSummary.tsx
 * --------------------------
 * Accurate, aggregated summaries of each core dataset family:
 *  - Administrative Areas (ADM1–ADM4)
 *  - Population
 *  - GIS
 *  - Other datasets
 *  - Derived datasets
 *
 * Uses server-side aggregate SQL to avoid Supabase row limits.
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

        // --- 1️⃣ Administrative Areas (Aggregated) ---
        const { data: adminAgg, error: e1 } = await supabase
          .from("admin_units")
          .select("level, COUNT(DISTINCT pcode) AS count")
          .eq("country_iso", countryIso)
          .group("level")
          .order("level");

        if (e1) throw e1;
        setAdmin((adminAgg || []).map((r: any) => ({
          level: r.level,
          count: Number(r.count),
        })));

        // --- 2️⃣ Population (Aggregated) ---
        const { data: popAgg, error: e2 } = await supabase
          .from("population_data")
          .select("COUNT(*) AS records, SUM(population)::bigint AS total_population")
          .eq("country_iso", countryIso)
          .single();
        if (e2) throw e2;
        setPop({
          records: Number(popAgg.records || 0),
          total_population: Number(popAgg.total_population || 0),
        });

        // --- 3️⃣ GIS (Features per Admin Level) ---
        const { data: gisAgg, error: e3 } = await supabase
          .from("gis_features")
          .select("admin_level, COUNT(*) AS features")
          .eq("country_iso", countryIso)
          .group("admin_level")
          .order("admin_level");
        if (e3) throw e3;
        setGis((gisAgg || []).map((r: any) => ({
          admin_level: r.admin_level,
          features: Number(r.features),
        })));

        // --- 4️⃣ Other Datasets ---
        const { data: otherAgg, error: e4 } = await supabase
          .from("dataset_metadata")
          .select("COUNT(*) AS total, SUM(record_count) AS records, MAX(year) AS latest_year")
          .eq("country_iso", countryIso)
          .single();
        if (e4) throw e4;
        setOther({
          total: Number(otherAgg.total || 0),
          records: Number(otherAgg.records || 0),
          latest_year: Number(otherAgg.latest_year || 0),
        });

        // --- 5️⃣ Derived Datasets ---
        const { data: derivedAgg, error: e5 } = await supabase
          .from("view_derived_dataset_summary")
          .select("COUNT(*) AS total, SUM(record_count) AS records, MAX(year) AS latest_year")
          .eq("country_iso", countryIso)
          .single();
        if (e5) throw e5;
        setDerived({
          total: Number(derivedAgg.total || 0),
          records: Number(derivedAgg.records || 0),
          latest_year: Number(derivedAgg.latest_year || 0),
        });

        setError(null);
      } catch (err: any) {
        console.error(err);
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
          { label: "Total Population", value: pop?.total_population?.toLocaleString() ?? "—" },
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
                label: g.admin_level || "N/A",
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
 * Reusable card panel showing linked header and stats grid.
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
      style={{ borderColor: "var(--gsc-light-gray)", background: "var(--gsc-beige)" }}
    >
      <div className="flex items-center justify-between mb-2">
        <Link href={link} className="text-lg font-semibold text-[color:var(--gsc-red)] hover:underline">
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
            <div className="text-xs text-gray-500 uppercase tracking-wide">{s.label}</div>
            <div className="text-base font-semibold text-gray-900">{s.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

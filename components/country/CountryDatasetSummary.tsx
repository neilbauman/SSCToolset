"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { Loader2, Database } from "lucide-react";

/**
 * CountryDatasetSummary
 * ---------------------
 * Summarized dashboard of all dataset families for a given country:
 *  - Administrative Boundaries
 *  - Population Data
 *  - GIS Data
 *  - Other Datasets
 *  - Derived Datasets
 *
 *  Uses Supabase aggregate queries matched to verified DB schema.
 */

type Props = {
  countryIso: string;
};

type AdminSummary = { level: string; count: number };
type PopSummary = { records: number; total_population: number };
type GisSummary = { features: number; levels: number };
type OtherSummary = { total: number; records: number; latest_year: number };
type DerivedSummary = { total: number; records: number; latest_year: number };

export default function CountryDatasetSummary({ countryIso }: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [admin, setAdmin] = useState<AdminSummary[]>([]);
  const [pop, setPop] = useState<PopSummary | null>(null);
  const [gis, setGis] = useState<GisSummary | null>(null);
  const [other, setOther] = useState<OtherSummary | null>(null);
  const [derived, setDerived] = useState<DerivedSummary | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);

        // --- 1️⃣ Administrative Boundaries ---
        const { data: adminRows, error: e1 } = await supabase
          .from("admin_units")
          .select("level, pcode")
          .eq("country_iso", countryIso);

        if (e1) throw e1;
        const adminCounts: Record<string, number> = {};
        adminRows?.forEach((r: any) => {
          adminCounts[r.level] = (adminCounts[r.level] || 0) + 1;
        });
        const adminSummary = Object.entries(adminCounts).map(([level, count]) => ({
          level,
          count,
        }));
        setAdmin(adminSummary);

        // --- 2️⃣ Population ---
        const { data: popRows, error: e2 } = await supabase
          .from("population_data")
          .select("population")
          .eq("country_iso", countryIso);
        if (e2) throw e2;
        const popTotal = popRows?.reduce((sum: number, r: any) => sum + Number(r.population || 0), 0);
        setPop({ records: popRows?.length || 0, total_population: popTotal || 0 });

        // --- 3️⃣ GIS ---
        const { data: gisRows, error: e3 } = await supabase
          .from("gis_features")
          .select("admin_level")
          .eq("country_iso", countryIso);
        if (e3) throw e3;
        const gisLevels = new Set(gisRows?.map((r: any) => r.admin_level).filter(Boolean));
        setGis({ features: gisRows?.length || 0, levels: gisLevels.size });

        // --- 4️⃣ Other Datasets ---
        const { data: meta, error: e4 } = await supabase
          .from("dataset_metadata")
          .select("year, record_count")
          .eq("country_iso", countryIso);
        if (e4) throw e4;
        const totalDatasets = meta?.length || 0;
        const records = meta?.reduce((s: number, r: any) => s + (r.record_count || 0), 0);
        const latestYear = Math.max(...(meta?.map((r: any) => r.year || 0) || [0]));
        setOther({ total: totalDatasets, records: records || 0, latest_year: latestYear || 0 });

        // --- 5️⃣ Derived Datasets ---
        const { data: deriv, error: e5 } = await supabase
          .from("view_derived_dataset_summary")
          .select("year, record_count")
          .eq("country_iso", countryIso);
        if (e5) throw e5;
        const derivedTotal = deriv?.length || 0;
        const derivedRecords = deriv?.reduce((s: number, r: any) => s + (r.record_count || 0), 0);
        const derivedLatest = Math.max(...(deriv?.map((r: any) => r.year || 0) || [0]));
        setDerived({ total: derivedTotal, records: derivedRecords || 0, latest_year: derivedLatest || 0 });

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
      {/* 1️⃣ Administrative Boundaries */}
      <Panel
        title="Administrative Boundaries"
        link={`/country/${countryIso}/admins`}
        description="Administrative hierarchy and completeness of boundary data."
        stats={
          admin.length
            ? admin.map((a) => ({
                label: a.level,
                value: a.count.toLocaleString(),
              }))
            : [{ label: "Levels", value: "—" }]
        }
      />

      {/* 2️⃣ Population Datasets */}
      <Panel
        title="Population Datasets"
        link={`/country/${countryIso}/population`}
        description="Population records and total population coverage."
        stats={[
          { label: "Records", value: pop?.records?.toLocaleString() ?? "—" },
          { label: "Total Population", value: pop?.total_population?.toLocaleString() ?? "—" },
        ]}
      />

      {/* 3️⃣ GIS Datasets */}
      <Panel
        title="GIS Datasets"
        link={`/country/${countryIso}/gis`}
        description="GIS layers and spatial feature coverage."
        stats={[
          { label: "Features", value: gis?.features?.toLocaleString() ?? "—" },
          { label: "Admin Levels", value: gis?.levels?.toString() ?? "—" },
        ]}
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
        description="Analytical datasets derived from population, administrative, GIS, and other datasets."
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
 * Small stat-card section used for each dataset category.
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

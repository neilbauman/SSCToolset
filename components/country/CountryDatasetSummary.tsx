"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabaseBrowser as supabase } from "@/lib/supabase/supabaseBrowser";
import { Loader2 } from "lucide-react";

interface CountryDatasetSummaryProps {
  countryIso: string;
}

export default function CountryDatasetSummary({
  countryIso,
}: CountryDatasetSummaryProps) {
  const [adminStats, setAdminStats] = useState<any[]>([]);
  const [popStats, setPopStats] = useState<any>(null);
  const [gisStats, setGisStats] = useState<any[]>([]);
  const [datasets, setDatasets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      try {
        const [{ data: admin }, { data: pop }, { data: gis }, { data: others }] =
          await Promise.all([
            supabase.rpc("get_admin_summary", { p_country_iso: countryIso }),
            supabase.rpc("get_population_summary", { p_country_iso: countryIso }),
            supabase.rpc("get_gis_summary", { p_country_iso: countryIso }),
            supabase
              .from("view_dataset_summary")
              .select("*")
              .eq("country_iso", countryIso)
              .not("dataset_type", "in", "(admin,population,gis)"),
          ]);

        setAdminStats(admin || []);
        setPopStats(pop || null);
        setGisStats(gis || []);
        setDatasets(others || []);
      } catch (error) {
        console.error("Error fetching dataset summaries:", error);
      }

      setLoading(false);
    };

    fetchData();
  }, [countryIso]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-gray-500">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading dataset summaries...
      </div>
    );
  }

  return (
    <div className="mt-4">
      <h2 className="text-2xl font-semibold mb-4">Core Datasets</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {/* Admin Areas */}
        <div className="border rounded-lg shadow-sm bg-white p-4">
          <Link
            href={`/country/${countryIso}/admins`}
            className="text-lg font-semibold text-blue-800 hover:underline"
          >
            Admin Areas
          </Link>
          {adminStats && adminStats.length > 0 ? (
            <div className="mt-2 text-sm text-gray-700">
              <p>{adminStats[0].title}</p>
              {adminStats.map((a) => (
                <p key={a.admin_level}>
                  <strong>{a.admin_level}</strong> – {a.unique_pcodes} pcodes (
                  {a.total_records} records)
                </p>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm mt-1">
              No admin dataset found
            </p>
          )}
          <div className="mt-3">
            <Link
              href={`/country/${countryIso}/admins`}
              className="text-sm text-blue-600 hover:underline"
            >
              View details →
            </Link>
          </div>
        </div>

        {/* Population Data */}
        <div className="border rounded-lg shadow-sm bg-white p-4">
          <Link
            href={`/country/${countryIso}/population`}
            className="text-lg font-semibold text-blue-800 hover:underline"
          >
            Population Data
          </Link>
          {popStats ? (
            <div className="mt-2 text-sm text-gray-700">
              <p>{popStats.title}</p>
              <p>
                Total population:{" "}
                {popStats.total_population?.toLocaleString() ?? "—"}
              </p>
              <p>
                Coverage:{" "}
                {popStats.coverage_admins?.toLocaleString() ?? "—"} admin areas
              </p>
            </div>
          ) : (
            <p className="text-gray-500 text-sm mt-1">
              No population dataset found
            </p>
          )}
          <div className="mt-3">
            <Link
              href={`/country/${countryIso}/population`}
              className="text-sm text-blue-600 hover:underline"
            >
              View details →
            </Link>
          </div>
        </div>

        {/* GIS Layers */}
        <div className="border rounded-lg shadow-sm bg-white p-4">
          <Link
            href={`/country/${countryIso}/gis`}
            className="text-lg font-semibold text-blue-800 hover:underline"
          >
            GIS Layers
          </Link>
          {gisStats && gisStats.length > 0 ? (
            <div className="mt-2 text-sm text-gray-700">
              <p>
                {gisStats[0].title} ({gisStats[0].year})
              </p>
              {gisStats.map((l) => (
                <p key={l.admin_level}>
                  <strong>{l.admin_level}</strong> – {l.feature_count} features (
                  {l.coverage_pct?.toFixed(1) ?? "0.0"}%)
                </p>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm mt-1">No GIS layers found</p>
          )}
          <div className="mt-3">
            <Link
              href={`/country/${countryIso}/gis`}
              className="text-sm text-blue-600 hover:underline"
            >
              View details →
            </Link>
          </div>
        </div>
      </div>

      {/* Other Datasets */}
      <h2 className="text-2xl font-semibold mb-3">Other Datasets</h2>
      {datasets.length === 0 ? (
        <p className="text-gray-500 italic text-sm">
          No other datasets uploaded yet.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border border-gray-200 text-sm">
            <thead className="bg-gray-50 text-gray-700">
              <tr>
                <th className="text-left px-3 py-2">Title</th>
                <th className="text-left px-3 py-2">Indicator</th>
                <th className="text-left px-3 py-2">Admin Level</th>
                <th className="text-left px-3 py-2">Records</th>
                <th className="text-left px-3 py-2">Health</th>
              </tr>
            </thead>
            <tbody>
              {datasets.map((d) => (
                <tr
                  key={d.id}
                  className="border-t hover:bg-gray-50 transition-colors"
                >
                  <td className="px-3 py-2">
                    <Link
                      href={`/country/${countryIso}/datasets/${d.id}`}
                      className="text-blue-700 hover:underline"
                    >
                      {d.title}
                    </Link>
                  </td>
                  <td className="px-3 py-2">{d.indicator || "—"}</td>
                  <td className="px-3 py-2">{d.admin_level || "—"}</td>
                  <td className="px-3 py-2">
                    {d.record_count?.toLocaleString() ?? "—"}
                  </td>
                  <td className="px-3 py-2">
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                      good
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
